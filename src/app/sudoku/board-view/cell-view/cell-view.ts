import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CellPosition } from '../../shared/types';
import { CellInputEvent, CellViewModel } from '../../shared/viewmodels';

@Component({
  selector: 'app-cell',
  imports: [],
  templateUrl: './cell-view.html',
  styleUrl: './cell-view.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CellView {
  cell = input.required<CellViewModel>();
  cellFocused = output<CellPosition>();
  cellInput = output<CellInputEvent>();

  // contentEditable div
  cellInputEl = viewChild.required<ElementRef>('cellInputEl');

  onCellFocus() {
    const cell = this.cell();
    this.cellFocused.emit({ x: cell.x, y: cell.y });
  }

  onCellKeydown(event: KeyboardEvent) {
    const cell = this.cell();

    const target = event.target as HTMLInputElement;
    target.textContent = '';

    // Clear
    if (['Backspace', 'Space', 'Clear', 'Delete'].includes(event.key)) {
      this.cellInput.emit({
        x: cell.x,
        y: cell.y,
        value: 0,
      });
    }
  }

  onCellInput(event: InputEvent) {
    const cell = this.cell();

    const target = event.target as HTMLInputElement;
    target.textContent = '';

    this.cellInput.emit({
      x: cell.x,
      y: cell.y,
      value: event.data,
    });
  }

  public focusCell() {
    this.cellInputEl().nativeElement.focus();
  }
}
