import { Service, inject, signal, effect, computed } from '@angular/core';
import { ChatMessage, User } from './types';
import { LoggerService } from './logger.service';
import { WebSocketService } from './websocket.service';
import { UserService } from './user.service';

@Service({
  autoProvided: false,
})
export class ChatService {
  private logger = inject(LoggerService);
  private socketService = inject(WebSocketService);
  private userService = inject(UserService);

  messages = signal<ChatMessage[]>([]);
  chatUsersIds = computed(()=> [...new Set(this.messages().map(m=>m.author))])
  chatUsers = computed<Record<string, User>>(() => {
    const userIds = this.chatUsersIds();
    const users = this.userService.users();
    const map: Record<string, User> = {};
    users.forEach((user) => {
      if (userIds.some((userId) => userId === user.id)) {
        map[user.id] = user;
      }
    });

    return map;
  });

  scrollTrigger = signal(0);

  constructor() {
    // Auto-scroll trigger effect
    effect(() => {
      this.messages();
      // Increment trigger to signal component to scroll
      this.scrollTrigger.update((v) => v + 1);
    });

    // Listen for incoming chat messages from WebSocket
    this.socketService.getMessages().subscribe((message) => {
      if (message.type === 'chat') {
        this.receiveMessage(message);
      }
    });
  }

  sendMessage(author: string, message: string): void {
    if (!message.trim()) {
      return;
    }

    const newMessage: ChatMessage = {
      id: this.generateMessageId(),
      author,
      message: message.trim(),
      timestamp: new Date(),
    };

    this.messages.update((current) => [...current, newMessage]);
    this.logger.debug(`Chat message sent by ${author}`, 'ChatService', newMessage);

    // Send message via WebSocket
    this.socketService.sendMessage({
      type: 'chat',
      userId: author,
      ...newMessage,
    });
  }

  receiveMessage(message: ChatMessage): void {
    this.messages.update((current) => {
      if (current.find((m) => m.id === message.id)) {
        return [...current.map((m) => (m.id === message.id ? { ...message } : m))];
      }
      return [...current, message];
    });
    this.logger.debug(`Chat message received from ${message.author}`, 'ChatService', message);
  }

  clearMessages(): void {
    this.messages.set([]);
    this.logger.debug('Chat messages cleared', 'ChatService');
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
