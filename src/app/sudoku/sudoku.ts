import { Component, effect, inject, TemplateRef, viewChild } from '@angular/core';
import { SudokuService } from './shared/sudoku.service';
import { CellInput, Difficulty, User } from './shared/types';
import { BoardView } from './board-view/board-view.component';
import { CellInputEvent, SelectorMoveEvent, isSelectorMovementOffset } from './shared/viewmodels';
import { TitleCasePipe } from '@angular/common';
import { WebSocketService } from './shared/websocket.service';
import { LoggerService } from './shared/logger.service';
import { ChatComponent } from './chat/chat.component';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { copyToClipboard } from './shared/utils';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { form, FormField } from '@angular/forms/signals';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChatService } from './shared/chat.service';
import { UserService } from './shared/user.service';

@Component({
  selector: 'app-sudoku',
  imports: [
    BoardView,
    ChatComponent,
    TitleCasePipe,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatIconButton,
    MatIcon,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatInput,
    FormField,
  ],
  providers: [SudokuService, WebSocketService, LoggerService, ChatService, UserService],
  templateUrl: './sudoku.html',
  styleUrl: './sudoku.scss',
})
export class Sudoku {
  s = inject(SudokuService);
  dialog = inject(MatDialog);
  logger = inject(LoggerService);

  myUserId = this.s.myUserId;
  usernameField = form(this.s.userName);

  confirmDialog = viewChild.required<TemplateRef<unknown>>('confirmDialog');

  route = inject(ActivatedRoute);
  router = inject(Router);

  gameStatus = this.s.gameStatus;
  isGameMultiplayer = this.s.isGameMultiplayer;
  board = this.s.boardViewModel;
  selectors = this.s.selectorsViewModel;

  canValidate = this.s.canValidate;

  colors = this.s.colors;
  selectedColor = this.s.selectedColor;

  difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'random'];
  selectedDifficulty = this.s.selectedDifficulty;

  players = this.s.players;

  boardView = viewChild.required<BoardView>(BoardView);

  constructor() {
    effect(() => {
      const status = this.gameStatus();
      if (status === 'error') {
        this.confirm(
          {
            title: 'Invalid Game ID',
            message: 'The game id from your link is not valid! Continue with a random board?',
            confirmText: 'continue',
            cancelText: 'reload',
          },
          {
            onConfirm: () => this.router.navigate(['/sudoku']),
            onCancel: () => window.location.reload(),
          },
        );
      } else if (
        status === 'solved' &&
        this.isGameMultiplayer() &&
        this.board()?.owner !== this.myUserId()
      ) {
        this.alert({
          message: 'The owner has solved the board! You can start a new game.',
        });
      }
    });
    const paramGameIdS = toSignal(this.route.params.pipe(map((p) => p['gameId'])));

    effect(() => {
      const paramId = paramGameIdS();

      if (this.s.gameIdParam() !== paramId) {
        this.s.gameIdParam.set(paramId);
        this.s.loadBoardTriggerToken.update((v) => v + 1);
      }
    });

    effect(() => {
      const state = this.s.board.status();
      let error = this.s.board.error();

      if (state === 'error' && error) {
        this.logger.error('Board loading failed', 'Sudoku', error);
        // game not found → recover flow
        this.gameStatus.set('idle');

        // optional: clear invalid gameId
        this.router.navigate(['/sudoku']);
      }
    });
  }

  onPlay() {
    if (this.isGameMultiplayer() || this.s.inputs().length) {
      this.confirm(
        {
          message: 'Are you sure you want to start a new game?',
        },
        {
          onConfirm: () => {
            this.s.leaveGame();
            this.router.navigate(['/sudoku'], { replaceUrl: true });
            this.s.loadBoardTriggerToken.update((v) => v + 1);
          },
        },
      );
    }
  }

  async onInvite() {
    const board = this.board();
    if (!board) {
      return;
    }
    if (!this.s.isGameMultiplayer()) {
      this.confirm(
        {
          title: 'Multiplayer Mode?',
          message: `Are you sure you want to make this game multiplayer and invite a friend?`,
        },
        {
          onConfirm: () => {
            // Make the game multiplayer and expose it to the server
            this.s.makeGameMultiplayer().subscribe(async ({ gameId }) => {
              if (gameId) {
                await this.router.navigate(['/sudoku', gameId], { replaceUrl: true });
                await copyToClipboard(window.location.href);
                this.alert({
                  title: 'Multiplayer Mode On',
                  message: `Your game is now Multiplayer. Send the link from your clipboard to your friend so they can join you.`,
                });
              } else {
                this.alert({
                  title: 'Multiplayer Mode Failed',
                  message: `Something went wrong! Your game is still in Singleplayer mode.`,
                });
              }
            });
          },
        },
      );
    } else {
      await copyToClipboard(window.location.href);
      this.alert({
        title: 'Multiplayer Mode On',
        message: `Your game is Multiplayer mode. Send the link from your clipboard to your friend so they can join you.`,
      });
    }
  }

  onLeave() {
    this.confirm(
      {
        message: `Are you sure you want to leave this game?`,
      },
      {
        onConfirm: () => {
          this.s.leaveGame();
          this.router.navigate(['/sudoku'], { replaceUrl: true });
          this.s.loadBoardTriggerToken.update((v) => v + 1);
        },
      },
    );
  }

  onValidate() {
    this.s.validateGame().subscribe((res) => {
      if (res) {
        this.alert({
          title: 'Congratulations!',
          message: `You solved the board Successfully!`,
        });
      } else {
        this.alert({
          title: 'Try Again',
          message: `Your solution is not correct! Please check and correct your board.`,
        });
      }
    });
  }

  onSolve() {
    this.confirm(
      {
        title: 'Solve Board',
        message: `Are you sure you want to solve the game?`,
        confirmText: 'Solve',
      },
      {
        onConfirm: () => this.s.solveGame(),
      },
    );
  }

  onDifficultyChange(difficulty: Difficulty) {
    this.s.selectDifficulty(difficulty);
  }

  onSelectorMove(positionOrOffset: SelectorMoveEvent) {
    if (this.gameStatus() !== 'playing') return;
    const newPos = isSelectorMovementOffset(positionOrOffset)
      ? this.calculateSelectorNewPosition(this.myUserId(), positionOrOffset.offset)
      : positionOrOffset;
    // do nothing if the new position is the same
    const selector = this.selectors().find((selector) => selector.author === this.myUserId());
    if (selector && selector.x === newPos.x && selector.y === newPos.y) {
      return;
    }
    // Handle single player and Optimistic update for multiplayer (Local first)
    const updatedSelector = { author: this.myUserId(), ...newPos };
    this.s.moveSelector(updatedSelector);
    this.boardView().focusCell(newPos);
    // this will reach the server and emit back to the client and will be revalidated,
    // otherwise there will always be a delay and the UX would not feel responsive
    if (this.isGameMultiplayer()) {
      this.s.dispatch.moveSelector(updatedSelector);
    }
  }

  onCellInput(cellInputEvent: CellInputEvent) {
    if (this.gameStatus() !== 'playing') return;
    const board = this.board();
    if (!board) {
      return;
    }
    // find cell by position
    const cell = board.cells[cellInputEvent.y][cellInputEvent.x];
    // check if editable
    if (!cell.editable) {
      return;
    }
    const cellInput: CellInput = {
      ...cellInputEvent,
      value: this.s.sudoku.normalizeInput(cellInputEvent.value),
      author: this.myUserId(),
    };
    // update board
    this.s.updateUserInput(cellInput);
    // focus cell again since changing the whole signal result in losing focus
    requestAnimationFrame(() => {
      this.boardView().focusCell(cellInput);
    });
    // emit cell value change
    if (this.isGameMultiplayer()) this.s.dispatch.changeCellValue(cellInput);
  }

  onColorChange(color: string) {
    this.s.changeColor(color);
  }

  isMyUser(user: User) {
    return this.s.isMyUser(user);
  }

  canKick() {
    return this.board()?.owner === this.myUserId();
  }

  onKickUser(user: User) {
    this.confirm(
      {
        title: 'Kick User',
        message: `Are you sure you want to kick ${user.id} ?`,
        confirmText: 'Kick',
      },
      {
        onConfirm: () => this.s.dispatch.kickUser(user.id),
      },
    );
  }

  private calculateSelectorNewPosition(author: string, moveOffset: { x: number; y: number }) {
    const selector = this.selectors().find((selector) => selector.author === author);
    const selectorPos = { x: selector?.x ?? 0, y: selector?.y ?? 0 };

    return { x: (selectorPos.x + moveOffset.x + 9) % 9, y: (selectorPos.y + moveOffset.y + 9) % 9 };
  }

  private alert(data: { title?: string; message?: string }): void {
    this.dialog.open(this.confirmDialog(), { data: { ...data, alert: true } });
  }

  private confirm(
    data: {
      title?: string;
      message?: string;
      cancelText?: string;
      confirmText?: string;
      alert?: boolean;
    },
    callbacks: {
      onConfirm?: () => void;
      onCancel?: () => void;
    } = {},
  ): void {
    const dialog = this.dialog.open(this.confirmDialog(), { data });

    if (callbacks.onConfirm || callbacks.onCancel) {
      dialog.afterClosed().subscribe((result) => {
        if (result && callbacks.onConfirm) {
          callbacks.onConfirm();
        } else if (!result && callbacks.onCancel) {
          callbacks.onCancel();
        }
      });
    }
  }
}
