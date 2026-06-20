import { computed, debounced, effect, inject, resource, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { debounce, debounceTime, firstValueFrom, map, Observable, of, throwError } from 'rxjs';
import {
  SUDOKU_API_URL,
  Board,
  BoardResponse,
  Difficulty,
  SolveResponse,
  ValidateResponse,
  COLORS,
  CellInput,
  User,
  Selector,
  SudokuRequest,
  SUDOKU_EXTENDED_API,
} from './types';
import { WebSocketService } from './websocket.service';
import { BoardViewModel, SelectorViewModel, UserViewModel } from './viewmodels';
import { boardViewModelToBoard, destructGameId, isValidBoard } from './utils';
import { SudokuGame, SudokuGameState, sudokuGameStateFrom } from './game';
import { LoggerService } from './logger.service';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from './user.service';

@Service({
  autoProvided: false,
})
export class SudokuService {
  http = inject(HttpClient);
  socketService = inject(WebSocketService);
  logger = inject(LoggerService);
  private userService = inject(UserService);

  sudoku: SudokuGame = new SudokuGame();

  // this is a trigger for the resource to fetch a new board
  loadBoardTriggerToken = signal(0);
  gameIdParam = signal<string | undefined>(undefined);
  solutionLoadToken = signal(false);
  gameStatus = signal<'idle' | 'error' | 'loading' | 'playing' | 'solved' | 'kicked'>('idle');

  myUserId = this.userService.myUserId;
  userName = this.userService.userName;
  selectedDifficulty = signal<Difficulty>('random');

  colors = COLORS;
  selectedColor = signal(this.colors[0][1]);

  playersIds = signal<User[]>([]);
  players = computed(() => {
    const playersIds = this.playersIds();
    const usersInfo = this.userService.users();

    console.log("players are now", playersIds);
    console.log("info is ", usersInfo);

    return playersIds.map(
      (player) =>
        usersInfo.find((u) => u.id === player.id) ?? {
          id: player.id,
          username: 'Unknown',
        },
    );
  });
  userColors = computed<UserViewModel[]>(() => {
    const myColor = this.selectedColor();
    const users = this.playersIds();
    const colors = [...this.colors].filter((c) => c[1] !== myColor).map((c) => c[1]);

    return users.map((user) => ({
      ...user,
      color: this.isMyUser(user) ? myColor : (colors.pop() ?? 'auto'),
    }));
  });

  board = resource({
    params: () => ({
      trigger: this.loadBoardTriggerToken(),
    }),
    loader: async ({ params }) => {
      if (!params.trigger) {
        return;
      }
      const gameId = this.gameIdParam();
      const difficulty = this.selectedDifficulty();

      this.gameStatus.set('loading');

      let board: SudokuGameState | undefined;
      try {
        if (!gameId) {
          board = await firstValueFrom(this.generateGame(difficulty));
        } else {
          board = await firstValueFrom(this.getGame(gameId));
          this.dispatch.joinGame(board.id);
        }
        this.gameStatus.set('playing');
        this.gameIdParam.set(gameId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        this.logger.error(`Failed to load board: ${errorMessage}`, 'SudokuService', err);
        this.gameStatus.set('error');
      }

      return board;
    },
  });
  gameId = computed(() => this.board.value()?.id);
  solution = resource({
    params: () => ({
      token: this.solutionLoadToken(),
    }),
    loader: async ({ params }) => {
      if (params.token) {
        this.gameStatus.set('loading');
        const board = this.board.value()?.board;
        if (board) {
          try {
            const response = await firstValueFrom(this.solveBoard(board));
            this.gameStatus.set('solved');
            this.dispatch.solveGame(response.solution);
            return response.solution;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            this.logger.error(`Failed to solve board: ${errorMessage}`, 'SudokuService', err);
            this.gameStatus.set('playing');
            return undefined;
          }
        }
      }
      return undefined;
    },
  });
  inputs = signal<CellInput[]>([]);

  isGameMultiplayer = computed(() => {
    const board = this.board.value();

    return board?.isMultiplayer;
  });

  boardViewModel = computed<BoardViewModel | undefined>(() => {
    const board = this.board.value();
    const inputs = this.inputs();
    const userColors = this.userColors();
    const gameStatus = this.gameStatus();
    const solution = this.solution.value();
    if (!board) {
      return undefined;
    }
    return {
      id: board.id,
      owner: board.owner,
      difficulty: board.difficulty,
      cells: board.board.map((row, y) =>
        row.map((cell, x) => {
          const author = inputs.find((input) => input.x === x && input.y === y)?.author;
          const cellInput = inputs.find((input) => input.x === x && input.y === y);
          const solutionCell = solution?.[y][x];

          const color = userColors.find((c) => c.id === author)?.color;

          return {
            x,
            y,
            value: cellInput?.value ?? cell,
            solution: gameStatus === 'solved' ? (solutionCell ?? 0) : 0,
            author: author ?? '',
            color: color ?? 'auto',
            editable: cell === 0,
          };
        }),
      ),
    } satisfies BoardViewModel;
  });
  canValidate = computed(() => {
    const boardViewModel = this.boardViewModel();
    if (!boardViewModel) {
      return false;
    }
    const board = boardViewModelToBoard(boardViewModel);

    return board.every((row) => row.every((cell) => cell > 0));
  });

  selectors = signal<Selector[]>([]);
  selectorsViewModel = computed<SelectorViewModel[]>(() => {
    const gameStatus = this.gameStatus();
    const usersColors = this.userColors();
    const selectors = this.selectors();

    if (gameStatus !== 'playing') return [];

    return selectors.map((selector) => ({
      ...selector,
      color: usersColors.find((c) => c.id === selector.author)?.color ?? 'auto',
    }));
  });

  constructor() {
    this.handleSocketMessages();

    effect(() => {
      const gameStatus = this.gameStatus();
      if (gameStatus === 'idle') {
        this.inputs.set([]);
        this.selectors.set([]);
      }
    });
    effect(() => {
      const board = this.board.value();
      if (board) {
        this.inputs.set(board.inputs);
        this.selectors.set(board.selectors);
        this.playersIds.set(board.users);
      }
    });
  }

  // Helper function to update a list of cells based on position
  isMyUser(user: User | undefined): boolean {
    return user !== undefined && user?.id === this.myUserId();
  }

  // Bussiness Logic Handlers
  selectDifficulty(difficulty: Difficulty) {
    this.selectedDifficulty.set(difficulty);
  }

  leaveGame() {
    if (this.gameStatus() === 'playing') {
      this.gameStatus.set('idle');
      this.solutionLoadToken.set(false);
      this.gameIdParam.set('');
      this.dispatch.leaveGame();
    }
  }

  validateGame(): Observable<boolean> {
    this.gameStatus.set('loading');

    const board = this.boardViewModel();
    if (!board) {
      return of(false);
    }

    return this.validateBoard(boardViewModelToBoard(board)).pipe(
      map((response) => {
        const success = response.status === 'solved';

        if (success) {
          this.gameStatus.set('solved');
        } else {
          this.gameStatus.set('playing');
        }
        return success;
      }),
    );
  }

  solveGame() {
    this.solutionLoadToken.set(true);
  }

  changeColor(color: string) {
    this.selectedColor.set(color);
    this.playersIds.update((users) =>
      users.map((user) => (this.isMyUser(user) ? { ...user, color } : user)),
    );
    this.selectors.update((selectors) =>
      selectors.map((selector) =>
        selector.author === this.myUserId()
          ? {
              ...selector,
              color,
            }
          : selector,
      ),
    );
  }

  updateUserInput(cellInput: CellInput) {
    this.inputs.update((inputs) => this.sudoku.upsertInput(inputs, cellInput));
  }

  moveSelector(selector: Selector) {
    this.selectors.update((selectors) => this.sudoku.upsertSelector(selectors, selector));
  }

  handleSocketMessages() {
    // Handle messages from server
    this.socketService.getMessages().subscribe((message) => {
      if (message.gameId !== this.gameId()) return;
      const handler = this.listeners[message.type];
      if (handler) {
        handler(message);
      }
    });
  }

  // HTTP Enriched
  generateGame(difficulty: Difficulty): Observable<SudokuGameState> {
    return this.generateBoard(difficulty).pipe(
      map((res) => {
        return sudokuGameStateFrom({
          id: '',
          difficulty,
          board: res.board,
          users: [{ id: this.myUserId(), username: this.userName() }],
        });
      }),
    );
  }

  // Load specific game
  getGame(id: string): Observable<SudokuGameState> {
    return this.http.get<SudokuGameState>(`${SUDOKU_EXTENDED_API}/api/game/${id}`);
  }

  // HTTP REQUESTS
  //   - GET https://sugoku.onrender.com/board?difficulty=random to generate data
  generateBoard(difficulty: Difficulty): Observable<SudokuRequest> {
    return this.http
      .get<BoardResponse>(`${SUDOKU_API_URL}/board?difficulty=${difficulty}`)
      .pipe(debounceTime(500));
  }

  //   - POST https://sugoku.onrender.com/validate to validate a board
  validateBoard(board: Board): Observable<ValidateResponse> {
    return this.http.post<ValidateResponse>(`${SUDOKU_API_URL}/validate`, { board });
  }

  //   - POST https://sugoku.onrender.com/solve to solve a board
  solveBoard(board: Board): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${SUDOKU_API_URL}/solve`, { board });
  }

  makeGameMultiplayer(): Observable<{ gameId: string }> {
    const board = this.board.value();
    if (!board) return of({ gameId: '' });

    return this.http
      .post<SudokuGameState>(`${SUDOKU_EXTENDED_API}/api/game`, {
        userId: this.myUserId(),
        username: this.userName(),
        difficulty: board.difficulty,
        board: board.board,
        inputs: this.inputs(),
        selectors: this.selectors(),
      })
      .pipe(map((resp) => ({ gameId: resp.id })));
  }

  // websocket handlers
  dispatch = {
    joinGame: (gameId: string) => {
      this.socketService.sendMessage({
        type: 'joinGame',
        gameId: gameId,
        userId: this.myUserId(),
      });
    },
    leaveGame: () => {
      this.socketService.sendMessage({
        type: 'leaveGame',
        gameId: this.gameId(),
        userId: this.myUserId(),
      });
    },
    kickUser: (kickedUser: string) => {
      this.socketService.sendMessage({
        type: 'kickUser',
        gameId: this.gameId(),
        userId: this.myUserId(),
        kickedUser: kickedUser,
      });
    },
    moveSelector: (selector: Selector) => {
      this.socketService.sendMessage({
        type: 'moveSelector',
        gameId: this.gameId(),
        ...selector,
      });
    },
    changeCellValue: (cellInput: CellInput) => {
      this.socketService.sendMessage({
        type: 'changeCellValue',
        gameId: this.gameId(),
        ...cellInput,
      });
    },
    solveGame: (solution: Board) => {
      this.socketService.sendMessage({
        type: 'solveGame',
        gameId: this.gameId(),
        solution,
      });
    }

  };

  listeners: Record<string, (message: any) => void> = {
    usersUpdated: ({ users, newOwner }: { users: User[]; newOwner?: string }) => {
      // kicked
      if (users && !users.find((u) => u.id === this.myUserId())) {
        this.gameStatus.set('kicked');
      } else {
        const board = this.board.value();
        if (newOwner && board) {
          this.board.update(() => ({
            ...board,
            users,
            owner: newOwner,
          }));
        }
        this.playersIds.update(() => users);
      }
    },
    selectorMoved: ({ selector }: { selector: Selector }) => {
      this.moveSelector(selector);
    },
    cellValueChanged: ({ cellInput }: { cellInput: CellInput }) => {
      this.updateUserInput(cellInput);
    },
    gameSolved: ({solution}: {solution:Board})=>{

      this.gameStatus.set('solved');
      this.solution.set(solution);
    }
  };
}
