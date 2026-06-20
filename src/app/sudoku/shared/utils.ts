import { Board, Difficulty } from './types';
import { BoardViewModel } from './viewmodels';

export function destructGameId(gameId: string): { author: string; board: Board } {
  const [author, board] = gameId.split('-');
  return {
    author,
    board: board
      .split('')
      .map(Number)
      .reduce((acc, curr, i) => {
        if (i % 9 === 0) acc.push([curr]);
        else acc[acc.length - 1].push(curr);
        return acc;
      }, [] as Board),
  };
}

export function isValidBoard(board: Board): boolean {
  return (
    board.length === 9 &&
    board.every((row) => row.length === 9 && row.every((cell) => cell >= 0 && cell <= 9))
  );
}

export function boardViewModelToBoard(boardViewModel: BoardViewModel): Board {
  return boardViewModel.cells.map((row) => row.map((cell) => cell.value));
}

export async function copyToClipboard(textToCopy: string) {
  // Navigator clipboard api needs a secure context (https)
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(textToCopy);
  } else {
    // Use the 'out of viewport hidden text area' trick
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;

    // Move textarea out of the viewport so it's not visible
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';

    document.body.prepend(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (error) {
      console.error(error);
    } finally {
      textArea.remove();
    }
  }
}
