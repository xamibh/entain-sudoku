import { Routes } from '@angular/router';
import { Sudoku } from './sudoku/sudoku';

export const routes: Routes = [
  { path: '', redirectTo: 'sudoku/', pathMatch: 'full' },
  {
    path: 'sudoku',
    redirectTo: 'sudoku/'
  },
  {
    path: 'sudoku/:gameId',
    component: Sudoku
  }
];
