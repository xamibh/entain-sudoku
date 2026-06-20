import { Board, CellPosition, Difficulty } from './types';

export interface BoardViewModel {
  id: string;
  owner: string;
  difficulty: Difficulty;
  cells: CellViewModel[][];
}

export function getBoardFlatCells(board: BoardViewModel): CellViewModel[] {
  return board.cells.reduce((acc, next) => [...acc, ...next], []);
}

export interface CellViewModel {
  x: number;
  y: number;
  value: number;
  solution: number;

  author: string;

  color: string;
  editable: boolean;
}

export interface SelectorViewModel {
  author: string;
  x: number;
  y: number;
  color: string;
}

export type SelectorMoveEvent = CellPosition | SelectorMovementOffset;

export interface SelectorMovementOffset {
  offset: CellPosition;
}

export function isSelectorMovementOffset(event: SelectorMoveEvent): event is SelectorMovementOffset {
  return 'offset' in event;
}

export interface UserViewModel {
  id: string;
  color: string;
}

export interface CellInputEvent {
  x: number;
  y: number;
  value: unknown;
}
