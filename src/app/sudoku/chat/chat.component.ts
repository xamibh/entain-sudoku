import { Component, effect, inject, viewChild, ElementRef } from '@angular/core';
import { ChatService } from '../shared/chat.service';
import { SudokuService } from '../shared/sudoku.service';
import { DatePipe } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';

@Component({
  selector: 'app-chat',
  imports: [
    DatePipe,
    MatFormField,
    MatInput,
    MatButton,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  chatService = inject(ChatService);
  sudokuService = inject(SudokuService);

  chatMessagesContainer = viewChild<ElementRef<HTMLDivElement>>('chatMessagesContainer');
  chatMessages = this.chatService.messages;
  chatUsers = this.chatService.chatUsers;
  chatScrollTrigger = this.chatService.scrollTrigger;
  myUserId = this.sudokuService.myUserId;

  constructor() {
    // Auto-scroll chat when new messages arrive
    effect(() => {
      this.chatScrollTrigger();
      const container = this.chatMessagesContainer()?.nativeElement;
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    });
  }

  onSendMessage(message: string) {
    this.chatService.sendMessage(this.myUserId(), message);
  }
}
