// Pre-Interview Candidate Task
// Sudoku solving application in Angular.
//   You can use the api at (https://github.com/bertoort/sugoku):
//   - GET https://sugoku.onrender.com/board?difficulty=random to generate data
//   - POST https://sugoku.onrender.com/validate to validate a board
//   - POST https://sugoku.onrender.com/solve to solve a board

//   The player should be presented with a Sudoku board on page load.
//   They should be able to

//  Choose a difficulty for the board (easy/medium/hard/random) and then start the game.
//  Enter numbers in the empty squares (not allowed to change the prefilled squares)
//  Have a “Validate” button to verify if they have solved it.
//  Have a “Solve” button that auto-solves the puzzle.
//  No restrictions on what other frameworks can be used but it should use Angular.

//   Things to consider while implementing: state management, valida on, tes ng, UX, making
// the project as production ready as possible.
//   Extra points: desktop/mobile mode, mul player mode.
//   The solution should be submitted as a gitlab/github repository or a zip archive.

// Note: - Please complete the task and submit this back to christopher.conlon@entaingroup.com
// within 7 days of receiving it.

export const SUDOKU_MULTIPLAYER_API = 'localhost:3000';
export const SUDOKU_WEBSOCKET_API = `ws://${SUDOKU_MULTIPLAYER_API}`;
export const SUDOKU_EXTENDED_API = `http://${SUDOKU_MULTIPLAYER_API}`;

export const SUDOKU_API_URL = 'https://sugoku.onrender.com';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';
export type Board = Array<Array<number>>;

//GET https://sugoku.onrender.com/board?difficulty=easy
export type BoardResponse = {
  board: Board;
};

export type SudokuRequest = {
  board: Board;
};
//POST https://sugoku.onrender.com/solve
export type SolveResponse = {
  difficulty: Difficulty;
  solution: Board;
  status: 'solved' | 'broken' | 'unsolvable';
};
//POST https://sugoku.onrender.com/validate
export type ValidateResponse = {
  status: 'solved' | 'broken';
};

// --------------------------------------------------

export interface CellPosition {
  x: number;
  y: number;
}

export const COLORS: [string, string][] = [
  ['blue', '#1E88E5'],
  ['green', '#2E7D32'],
  ['orange', '#EF6C00'],
  ['purple', '#6A1B9A'],
  ['teal', '#00897B'],
  ['red', '#C62828'],
  ['brown', '#6D4C41'],
  ['indigo', '#3949AB'],
  ['pink', '#D81B60'],
  ['olive', '#827717'],
];

export type CellInput = {
  x: number;
  y: number;
  value: number;
  author: string;
};

export type User = {
  id: string;
  username: string;
};

export type Selector = {
  author: string;
  x: number;
  y: number;
};

export type ChatMessage = {
  id: string;
  author: string;
  message: string;
  timestamp: Date;
};
