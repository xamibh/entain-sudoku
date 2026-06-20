import { debounced, effect, inject, Service, signal } from '@angular/core';
import { SUDOKU_API_URL, SUDOKU_EXTENDED_API, User } from './types';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketService } from './websocket.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Service({
  autoProvided: false,
})
export class UserService {
  socketService = inject(WebSocketService);
  http = inject(HttpClient);

  myUserId = signal('');
  userName = signal('');

  users = signal<User[]>([{ id: this.myUserId(), username: this.userName() }]);

  constructor() {
    let myUserId = localStorage.getItem('userId');
    if (!myUserId) {
      myUserId = uuidv4();
      localStorage.setItem('userId', myUserId);
    }
    this.myUserId.set(myUserId);

    let userName = localStorage.getItem('userName') ?? '';
    if (!userName) {
      userName = 'Player' + Math.floor(Math.random() * 10000);
      localStorage.setItem('userName', userName);
    }
    this.userName.set(userName);
    this.dispatch.userInfoUpdate({
      id: this.myUserId(),
      username: this.userName(),
    });

    this.handleSocketMessages();

    const debouncedUserName = debounced(this.userName, 400);
    effect(() => {
      const userName = debouncedUserName.value();
      localStorage.setItem('userName', userName);
      this.dispatch.userInfoUpdate({
        id: this.myUserId(),
        username: userName,
      });
    });

    this.getAllUsers().subscribe((users) => {
      this.users.set(users);
    });
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${SUDOKU_EXTENDED_API}/api/users`);
  }

  updateUser(user: User) {
    this.users.update((users) => {
      const index = users.findIndex((u) => u.id === user.id);
      if (index !== -1) {
        return users.map((u, i) => (i === index ? { ...user } : u));
      }
      return [...users, user];
    });
  }

  handleSocketMessages() {
    // Handle messages from server
    this.socketService.getMessages().subscribe((message) => {
      const handler = this.listeners[message.type];
      if (handler) {
        handler(message);
      }
    });
  }

  dispatch = {
    userInfoUpdate: (user: User) => {
      this.socketService.sendMessage({
        type: 'userInfoUpdate',
        userId: user.id,
        username: user.username,
      });
    },
  };

  listeners: Record<string, (message: any) => void> = {
    userInfoUpdated: ({ userId, username }: { userId: string; username: string }) => {
      this.updateUser({ id: userId, username });
    },
  };
}
