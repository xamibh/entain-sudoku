import { Service } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { WebSocketSubject } from 'rxjs/internal/observable/dom/WebSocketSubject';
import { webSocket } from 'rxjs/webSocket';
import { SUDOKU_WEBSOCKET_API } from './types';

@Service({
  autoProvided: false,
})
export class WebSocketService {
  private socket$: WebSocketSubject<any> = webSocket(SUDOKU_WEBSOCKET_API);

  constructor() {
    console.log('how many times');
  }

  // Send a message to the server
  sendMessage(message: any) {
    this.socket$.next(message);
  }

  // Receive messages from the server
  getMessages(): Observable<any> {
    return this.socket$.asObservable();
  }

  // Close the WebSocket connection
  closeConnection() {
    this.socket$.complete();
  }
}
