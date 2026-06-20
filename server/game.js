// import {Board, CellInput, CellPosition, Difficulty, Selector, User} from './types';
//
// export const EMPTY_GAME_STATE: SudokuGameState = {
//   id: '',
//   owner: '',
//   status: 'playing',
//   isMultiplayer: false,
//   difficulty: 'random',
//   board: [],
//   users: [],
//   inputs: [],
//   selectors: [],
// };
//
// export interface SudokuGameState {
//   id: string;
//   owner: string;
//   status: 'playing' | 'finished';
//   isMultiplayer: boolean;
//   difficulty: Difficulty;
//   board: Board;
//   users: User[];
//   inputs: CellInput[];
//   selectors: Selector[];
// }
//
// export function sudokuGameStateFrom(partialState: Partial<SudokuGameState>): SudokuGameState {
//   return {
//     ...EMPTY_GAME_STATE,
//     ...partialState,
//   };
// }
//
// export interface SudokuGameEvent<
//   T extends SudokuGameEventType = SudokuGameEventType,
//   K extends SudokuGameEventMap[T] = SudokuGameEventMap[T],
// > {
//   type: T;
//   gameId: string;
//   body: K;
// }
//
// export type SudokuGameEventType = keyof SudokuGameEventMap;
// export type SudokuGameEventMap = {
//   createGame: SudokuGameState;
//
//   // ----------
//   boardLoaded: { board: Board };
//
//   userJoined: { user: User };
//   userLeft: { user: User };
//   userSelectorMoved: { selector: Selector };
//   userInput: { input: CellInput };
//   newMultiplayerGame: SudokuGameState;
// };
//
//
// export class SudokuGameService {
//   sudoku: SudokuGame = new SudokuGame();
//   games: Record<string, SudokuGameState> = {};
//   dispatch: (event: SudokuGameEvent) => void = () => undefined;
//
//   //TODO: 1.0 Implement proper permission checks for game operations
//   //TODO: deal with permissions on who can invoke the game methods
//
//   getGame(gameId: string): SudokuGameState {
//     return this.games[gameId];
//   }
//
//   joinUser(gameId: string, user: User) {
//     const game = this.getGame(gameId);
//
//     game.users = this.sudoku.upsertUser(game.users, user);
//
//     this.dispatch({
//       type: 'userJoined',
//       gameId: gameId,
//       body: { user },
//     });
//   }
//
//   leaveUser(gameId: string, user: User) {
//     const game = this.getGame(gameId);
//
//     game.users = this.sudoku.leaveUser(game.users, user);
//
//     this.dispatch({
//       type: 'userLeft',
//       gameId: gameId,
//       body: { user },
//     });
//   }
//
//   userSelectorMove(gameId: string, selector: Selector) {
//     const game = this.getGame(gameId);
//
//     game.selectors = this.sudoku.upsertSelector(game.selectors, selector);
//
//     this.dispatch({
//       type: 'userSelectorMoved',
//       gameId: gameId,
//       body: { selector },
//     });
//   }
//
//   userInput(gameId: string, input: CellInput) {
//     const game = this.getGame(gameId);
//
//     game.inputs = this.sudoku.upsertInput(game.inputs, input);
//
//     this.dispatch({
//       type: 'userInput',
//       gameId: gameId,
//       body: { input },
//     });
//   }
//
//   makeMultiplayer(gameId: string) {
//     const game = this.getGame(gameId);
//
//     game.isMultiplayer = true;
//     this.dispatch({
//       type: 'newMultiplayerGame',
//       gameId: gameId,
//       body: game,
//     });
//   }
//
//   //TODO: 1.0 Implement game solving logic and broadcast result to all players
//   solveGame(gameId: string) {
//     const game = this.getGame(gameId);
//
//     // TODO: solve the game and broadcast the result
//   }
//
//   //TODO: 1.0 Implement board validation logic and broadcast result to all players
//   validateBoard(gameId: string) {
//     const game = this.getGame(gameId);
//
//     // TODO: validate the game and broadcast the result
//   }
// }


export class SudokuGame {
    normalizeInput(value) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return 0;
        }

        // Handle string inputs
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') {
                return 0;
            }
            const num = parseInt(trimmed, 10);
            if (isNaN(num)) {
                return 0;
            }
            return (num >= 0 && num <= 9) ? num : 0;
        }

        // Handle number inputs
        if (typeof value === 'number') {
            if (Number.isInteger(value) && value >= 0 && value <= 9) {
                return value;
            }
            return 0;
        }

        // Handle other types (objects, booleans, etc.)
        return 0;
    }

    isSellEditable(board, cell) {
        return board[cell.y][cell.x] === 0;
    }

    upsertSelector(selectors, selector) {
        const index = selectors.findIndex((s) => s.author === selector.author);

        if (index >= 0) {
            return selectors.map((s, i) => (i === index ? {...selector} : s));
        }

        return [...selectors, selector];
    }

    upsertInput(inputs, input) {
        const index = inputs.findIndex(
            (i) => i.author === input.author && i.x === input.x && i.y === input.y,
        );

        if (index >= 0) {
            return inputs.map((i, idx) =>
                idx === index
                    ? input
                    : i,
            );
        }

        return [...inputs, input];
    }

    upsertUser(users, user) {
        user = {
            id: user.id
        };

        const index = users.findIndex((u) => u.id === user.id);

        if (index >= 0) {
            return users.map((s, i) => (i === index ? user : s));
        }

        return [...users, user];
    }

    leaveUser(users, user) {
        return [...users.filter((u) => u.id !== user.id)];
    }
}