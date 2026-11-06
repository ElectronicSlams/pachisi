import type { CellBoardFrame } from '../src/game/board-types';

export type Round = { frame: CellBoardFrame; next: 'R' | 'Y'; finished: boolean };
export function newRound(): Round {
  return { frame: {kind:'cells', family:'connect_four', rows:6, cols:7, cells:Array(42).fill('.')}, next:'R', finished:false };
}

// Catalogue interaction fixture. Hosts can supply any authoritative frame to Board.
export function drop(round: Round, column: number): Round {
  if (round.finished || !Number.isInteger(column) || column < 0 || column >= 7) return round;
  const cells = [...round.frame.cells];
  let row = 5;
  while (row >= 0 && cells[row * 7 + column] !== '.') row--;
  if (row < 0) return round;
  const last = row * 7 + column;
  cells[last] = round.next;
  const line = new Set<number>();
  for (const [dr, dc] of [[1,0],[0,1],[1,1],[1,-1]]) {
    const run = [last];
    for (const sign of [-1,1]) {
      let r = row + sign * dr, c = column + sign * dc;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && cells[r * 7 + c] === round.next) {
        run.push(r * 7 + c);
        r += sign * dr;
        c += sign * dc;
      }
    }
    if (run.length >= 4) for (const cell of run) line.add(cell);
  }
  return {
    frame: {...round.frame, cells, last:[last], line:[...line]},
    next:round.next === 'R' ? 'Y' : 'R',
    finished:line.size > 0 || !cells.includes('.'),
  };
}
