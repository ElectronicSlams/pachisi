import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BLACK, WHITE, COLUMNS } from '../hooks/useGoGame';
import type { GameState, Position, MoveResult, ScoreResult } from '../hooks/useGoGame';
import { toast } from 'sonner';

interface BoardProps {
  state: GameState;
  lastMove: Position | null;
  score: ScoreResult | null;
  onPlayMove: (row: number, col: number) => MoveResult;
}

const ROWS = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const STAR_POINTS = [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];

export const Board: React.FC<BoardProps> = ({ state, lastMove, score, onPlayMove }) => {
  const { board, currentPlayer, koPoint, gameOver } = state;
  const [hoveredPoint, setHoveredPoint] = useState<Position | null>(null);
  const [invalidFlash, setInvalidFlash] = useState<Position | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(48);

  const measureCells = useCallback(() => {
    if (gridRef.current) {
      const firstCell = gridRef.current.querySelector('[data-cell]') as HTMLElement;
      if (firstCell) {
        setCellSize(firstCell.offsetWidth);
      }
    }
  }, []);

  useEffect(() => {
    measureCells();
    window.addEventListener('resize', measureCells);
    return () => window.removeEventListener('resize', measureCells);
  }, [measureCells]);

  const isStarPoint = (r: number, c: number) => {
    return STAR_POINTS.some(([sr, sc]) => sr === r && sc === c);
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver) return;
    const result = onPlayMove(r, c);
    if (!result.valid) {
      if (result.reason === 'suicide') {
        toast("Suicide — your group would have no liberties");
      } else if (result.reason === 'ko') {
        toast("Ko — you must play elsewhere first");
      } else if (result.reason === 'occupied') {
        toast("Intersection occupied");
      }
      setInvalidFlash({ row: r, col: c });
      setTimeout(() => setInvalidFlash(null), 200);
    }
  };

  // Territory map for game-over display
  const territoryMap = score?.territoryMap ?? null;

  return (
    <div className="flex flex-col items-center select-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex">
        {/* Row Coordinates */}
        <div className="hidden md:flex flex-col mr-2" style={{ paddingTop: `calc(var(--board-frame-width) + 12px + 24px + 8px)` }}>
          {ROWS.map((row) => (
            <div
              key={row}
              className="flex items-center justify-center text-[var(--text-muted)] font-medium"
              style={{ height: cellSize, width: 28, fontSize: 13 }}
            >
              {row}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {/* Column Coordinates */}
          <div className="hidden md:flex mb-2" style={{ paddingLeft: `calc(var(--board-frame-width) + 12px)` }}>
            {COLUMNS.map((col) => (
              <div
                key={col}
                className="flex items-center justify-center text-[var(--text-muted)] font-medium"
                style={{ width: cellSize, height: 24, fontSize: 13 }}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Grid Area */}
          <div
            className="bg-[var(--board-surface)] p-2 md:p-3 shadow-[0_0_20px_rgba(0,0,0,0.05)] rounded-[8px] transition-colors-theme overflow-hidden"
            style={{ borderWidth: 'var(--board-frame-width)', borderStyle: 'solid', borderColor: 'var(--board-frame)' }}
          >
            <div
              ref={gridRef}
              className="grid"
              style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isHovered = hoveredPoint?.row === r && hoveredPoint?.col === c;
                  const isInvalid = invalidFlash?.row === r && invalidFlash?.col === c;
                  const isLastMove = lastMove?.row === r && lastMove?.col === c;
                  const isKo = koPoint?.row === r && koPoint?.col === c;

                  let territoryMark: number | null = null;
                  if (territoryMap && cell === 0) {
                    const val = territoryMap[r]?.[c];
                    if (val === BLACK || val === WHITE) territoryMark = val;
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      data-cell
                      className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center group ${cell ? 'cursor-not-allowed' : gameOver ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={() => handleCellClick(r, c)}
                      onMouseEnter={() => setHoveredPoint({ row: r, col: c })}
                    >
                      {/* Horizontal Line */}
                      <div
                        className="absolute bg-[var(--board-line)] h-[2px] pointer-events-none transition-colors-theme"
                        style={{
                          left: c === 0 ? '50%' : '0',
                          right: c === 8 ? '50%' : '0',
                          top: 'calc(50% - 1px)',
                        }}
                      />
                      {/* Vertical Line */}
                      <div
                        className="absolute bg-[var(--board-line)] w-[2px] pointer-events-none transition-colors-theme"
                        style={{
                          top: r === 0 ? '50%' : '0',
                          bottom: r === 8 ? '50%' : '0',
                          left: 'calc(50% - 1px)',
                        }}
                      />

                      {/* Star Point */}
                      {isStarPoint(r, c) && (
                        <div className="absolute inset-0 m-auto w-[6px] h-[6px] md:w-[10px] md:h-[10px] bg-[var(--star-point)] rounded-full z-10 pointer-events-none transition-colors-theme" />
                      )}

                      {/* Ko Point Marker */}
                      {isKo && !cell && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                          <span className="text-[var(--ko-marker)] text-sm md:text-base font-bold select-none transition-colors-theme">✕</span>
                        </div>
                      )}

                      {/* Territory Marker (Game Over) */}
                      {territoryMark === BLACK && (
                        <div
                          className="absolute inset-0 m-auto pointer-events-none z-10 rounded-sm"
                          style={{ width: '50%', height: '50%', backgroundColor: 'var(--territory-black)' }}
                        />
                      )}
                      {territoryMark === WHITE && (
                        <div
                          className="absolute inset-0 m-auto pointer-events-none z-10 rounded-sm"
                          style={{ width: '50%', height: '50%', backgroundColor: 'var(--territory-white)' }}
                        />
                      )}

                      {/* Invalid Flash Highlight */}
                      {isInvalid && (
                        <div className="absolute inset-1 border-[2px] border-[var(--accent)] rounded-sm z-30 pointer-events-none animate-pulse" />
                      )}

                      {/* Stone */}
                      <AnimatePresence>
                        {cell !== 0 && (
                          <motion.div
                            key={`${r}-${c}-stone-${cell}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            className="absolute inset-0 m-auto w-[85%] h-[85%] rounded-full z-20 shadow-sm flex items-center justify-center"
                            style={{
                              backgroundColor: cell === BLACK ? 'var(--stone-black)' : 'var(--stone-white)',
                              border: cell === BLACK ? '1px solid var(--stone-black-edge)' : '1px solid var(--stone-white-border)',
                            }}
                          >
                            {isLastMove && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: cell === BLACK ? 'var(--stone-white)' : 'var(--stone-black)' }}
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Hover Ghost Stone */}
                      {!cell && isHovered && !isKo && !gameOver && (
                        <div
                          className="absolute inset-0 m-auto w-[85%] h-[85%] rounded-full z-10 pointer-events-none transition-opacity duration-150"
                          style={{
                            backgroundColor: currentPlayer === BLACK ? 'var(--stone-black)' : 'var(--stone-white)',
                            border: currentPlayer === BLACK ? '1px solid var(--stone-black-edge)' : '1px solid var(--stone-white-border)',
                            opacity: currentPlayer === BLACK ? 'var(--ghost-opacity-black)' : 'var(--ghost-opacity-white)',
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
