import { Component, input, output, viewChildren } from '@angular/core';
import { CellView } from './cell-view/cell-view';
import { CellPosition } from '../shared/types';
import {
  BoardViewModel,
  CellInputEvent,
  SelectorMoveEvent,
  SelectorViewModel,
} from '../shared/viewmodels';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-board',
  imports: [CellView, MatProgressSpinner],
  templateUrl: './board-view.component.html',
  styleUrl: './board-view.component.scss',
})
export class BoardView {
  gameStatus = input.required<string | 'loading'>();

  boardSkeleton = Array.from({ length: 9 }).map((_, y) =>
    Array.from({ length: 9 }).map((__, x) => ({
      x,
      y,
    })),
  );

  board = input.required<BoardViewModel | undefined>();
  selectors = input.required<SelectorViewModel[]>();

  cells = viewChildren<CellView>(CellView);

  selectorMove = output<SelectorMoveEvent>();
  cellInput = output<CellInputEvent>();

  onKeyDown(event: KeyboardEvent) {
    let moveOffset: { x: number; y: number } = { x: 0, y: 0 };
    switch (event.key) {
      case 'ArrowUp':
        moveOffset.y = -1;
        break;
      case 'ArrowDown':
        moveOffset.y = 1;
        break;
      case 'ArrowLeft':
        moveOffset.x = -1;
        break;
      case 'ArrowRight':
        moveOffset.x = 1;
        break;
    }
    this.selectorMove.emit({ offset: moveOffset });
  }

  onCellFocus(position: CellPosition) {
    this.selectorMove.emit(position);
  }

  onCellInput(cellInput: CellInputEvent) {
    this.cellInput.emit(cellInput);
  }

  public focusCell(position: CellPosition) {
    this.cells()
      .find((cell) => cell.cell().x === position.x && cell.cell().y === position.y)
      ?.focusCell();
  }
}
