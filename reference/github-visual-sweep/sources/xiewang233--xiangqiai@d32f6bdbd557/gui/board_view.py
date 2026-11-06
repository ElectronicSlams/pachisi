"""棋盘渲染:坐标换算、棋子、高亮、箭头。"""
from __future__ import annotations

from typing import List, Optional, Tuple

import pygame

from xiangqi import PIECE_CN, row_of, col_of

import theme


def sq_to_px(sq: int) -> Tuple[int, int]:
    """棋盘格 -> 屏幕像素(棋子圆心)"""
    return (theme.BOARD_X + theme.PAD + col_of(sq) * theme.CELL,
            theme.BOARD_Y + theme.PAD + row_of(sq) * theme.CELL)


def px_to_sq(x: int, y: int) -> Optional[int]:
    """屏幕像素 -> 棋盘格(点半径 CELL*0.45 内有效)"""
    col = round((x - theme.BOARD_X - theme.PAD) / theme.CELL)
    row = round((y - theme.BOARD_Y - theme.PAD) / theme.CELL)
    if not (0 <= row < 10 and 0 <= col < 9):
        return None
    cx, cy = sq_to_px(row * 9 + col)
    if abs(x - cx) <= theme.CELL * 0.45 and abs(y - cy) <= theme.CELL * 0.45:
        return row * 9 + col
    return None


def _piece_symbol(pc: int) -> str:
    return PIECE_CN[pc]


def draw_board(surface: pygame.Surface, board: List[int],
               selected: Optional[int], legal_targets, last_move,
               check_sq: Optional[int], hint=None, board_rect=None) -> None:
    """绘制整个棋盘。legal_targets: iterable of to_sq;hint: (from,to)"""
    bx, by = theme.BOARD_X, theme.BOARD_Y
    w = theme.PAD * 2 + theme.CELL * 8
    h = theme.PAD * 2 + theme.CELL * 9
    pygame.draw.rect(surface, theme.BOARD_BG, (bx, by, w, h), border_radius=8)
    # 外框
    pygame.draw.rect(surface, theme.BOARD_LINE, (bx + 14, by + 14, w - 28, h - 28), 3, border_radius=4)
    ox, oy = bx + theme.PAD, by + theme.PAD
    line = theme.BOARD_LINE
    # 横线 10 条
    for r in range(10):
        pygame.draw.line(surface, line, (ox, oy + r * theme.CELL),
                         (ox + 8 * theme.CELL, oy + r * theme.CELL), 2)
    # 竖线(中间被河界断开,边线贯通)
    for c in range(9):
        x = ox + c * theme.CELL
        if c == 0 or c == 8:
            pygame.draw.line(surface, line, (x, oy), (x, oy + 9 * theme.CELL), 2)
        else:
            pygame.draw.line(surface, line, (x, oy), (x, oy + 4 * theme.CELL), 2)
            pygame.draw.line(surface, line, (x, oy + 5 * theme.CELL),
                             (x, oy + 9 * theme.CELL), 2)
    # 九宫斜线
    for (r1, c1, r2, c2) in ((0, 3, 2, 5), (0, 5, 2, 3), (7, 3, 9, 5), (7, 5, 9, 3)):
        pygame.draw.line(surface, line, (ox + c1 * theme.CELL, oy + r1 * theme.CELL),
                         (ox + c2 * theme.CELL, oy + r2 * theme.CELL), 2)
    # 河界文字
    font = theme.FONT_XL
    t1 = font.render("楚 河", True, theme.RIVER_TEXT)
    t2 = font.render("汉 界", True, theme.RIVER_TEXT)
    ry = oy + 4.5 * theme.CELL
    surface.blit(t1, (ox + 1.1 * theme.CELL - t1.get_width() / 2, ry - t1.get_height() / 2))
    surface.blit(t2, (ox + 5.9 * theme.CELL - t2.get_width() / 2, ry - t2.get_height() / 2))
    # 炮/兵位标记(四角小折线)
    marks = [(2, 1), (2, 7), (7, 1), (7, 7)] + \
            [(3, c) for c in (0, 2, 4, 6, 8)] + [(6, c) for c in (0, 2, 4, 6, 8)]
    for r, c in marks:
        x, y = ox + c * theme.CELL, oy + r * theme.CELL
        for dc in (-1, 1):
            if 0 <= c + dc <= 8:
                dx = dc * 7
                pygame.draw.line(surface, line, (x + dx, y - 6), (x + dx, y - 1), 1)
                pygame.draw.line(surface, line, (x + dx, y - 6), (x + dx - dc * 4, y - 6), 1)
                pygame.draw.line(surface, line, (x + dx, y - 1), (x + dx - dc * 4, y - 1), 1)
                pygame.draw.line(surface, line, (x + dx, y + 1), (x + dx, y + 6), 1)
                pygame.draw.line(surface, line, (x + dx, y + 6), (x + dx - dc * 4, y + 6), 1)
                pygame.draw.line(surface, line, (x + dx, y + 1), (x + dx - dc * 4, y + 1), 1)

    # 最后一手方框
    if last_move:
        f, t = last_move
        for s in (f, t):
            x, y = sq_to_px(s)
            r = theme.CELL * 0.42
            pygame.draw.rect(surface, theme.LAST_MOVE, (x - r, y - r, 2 * r, 2 * r), 3)
    # 选中高亮圈
    if selected is not None:
        x, y = sq_to_px(selected)
        pygame.draw.circle(surface, theme.HIGHLIGHT, (x, y), theme.CELL * 0.44, 4)
    # 合法落点
    for t in legal_targets:
        x, y = sq_to_px(t)
        pygame.draw.circle(surface, theme.HIGHLIGHT if board[t] == 0 else theme.CHECK_WARN,
                           (x, y), 9 if board[t] == 0 else theme.CELL * 0.4, 3 if board[t] else 0)
    # 将军闪烁圈
    if check_sq is not None:
        x, y = sq_to_px(check_sq)
        pygame.draw.circle(surface, theme.CHECK_WARN, (x, y), theme.CELL * 0.46, 5)
    # 提示箭头
    if hint:
        draw_arrow(surface, sq_to_px(hint[0]), sq_to_px(hint[1]), theme.HINT)

    # 棋子
    for s, pc in enumerate(board):
        if pc == 0:
            continue
        draw_piece(surface, s, pc)


def draw_piece(surface: pygame.Surface, sq: int, pc: int) -> None:
    x, y = sq_to_px(sq)
    r = theme.CELL * 0.40
    pygame.draw.circle(surface, (0, 0, 0), (x + 2, y + 3), r)          # 阴影
    body = (238, 224, 196)
    pygame.draw.circle(surface, body, (x, y), r)
    pygame.draw.circle(surface, theme.PIECE_RIM, (x, y), r, 3)
    pygame.draw.circle(surface, theme.PIECE_RIM, (x, y), r - 6, 1)
    ch = _piece_symbol(pc)
    color = theme.RED_PIECE if pc > 0 else theme.BLACK_PIECE
    t = theme.PIECE_FONT.render(ch, True, color)
    surface.blit(t, (x - t.get_width() / 2, y - t.get_height() / 2))


def draw_arrow(surface: pygame.Surface, p_from, p_to, color) -> None:
    x1, y1 = p_from
    x2, y2 = p_to
    pygame.draw.line(surface, color, (x1, y1), (x2, y2), 5)
    # 简易箭头
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    for da in (2.6, -2.6):
        pygame.draw.line(surface, color, (x2, y2),
                         (x2 + 18 * math.cos(ang + da), y2 + 18 * math.sin(ang + da)), 5)
