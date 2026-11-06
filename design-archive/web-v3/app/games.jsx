/* ============================================================
   eSlams — Game engines & board renderers
   Fully playable: Tic-Tac-Toe, Connect Four, Othello, Rock-Paper-Scissors
   Renderers: Chess (UCI replay), Go, generic preview boards
   ============================================================ */

/* =================== CHESS (render + UCI apply) =================== */
const CHESS_START = (() => {
  const b = {};
  const back = ['r','n','b','q','k','b','n','r'];
  const files = ['a','b','c','d','e','f','g','h'];
  files.forEach((f,i)=>{ b[f+'8']=back[i]; b[f+'7']='p'; b[f+'2']='P'; b[f+'1']=back[i].toUpperCase(); });
  return b;
})();
const PIECE_GLYPH = { k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' };
function applyUci(pos, uci){
  const b = { ...pos };
  const from = uci.slice(0,2), to = uci.slice(2,4);
  const piece = b[from];
  delete b[from]; b[to] = piece;
  // castling: king moves two files
  if (piece && piece.toLowerCase()==='k'){
    if (from==='e1' && to==='g1'){ b['f1']=b['h1']; delete b['h1']; }
    if (from==='e1' && to==='c1'){ b['d1']=b['a1']; delete b['a1']; }
    if (from==='e8' && to==='g8'){ b['f8']=b['h8']; delete b['h8']; }
    if (from==='e8' && to==='c8'){ b['d8']=b['a8']; delete b['a8']; }
  }
  return b;
}
function chessPosAt(uciList, ply){
  let pos = CHESS_START;
  for (let i=0;i<ply;i++) pos = applyUci(pos, uciList[i]);
  return pos;
}
function ChessBoard({ position, lastMove, size = 'md', flip = false }) {
  const files = flip ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
  const ranks = flip ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'];
  const lm = lastMove ? [lastMove.slice(0,2), lastMove.slice(2,4)] : [];
  return (
    <div className={`chessboard cb-${size}`}>
      {ranks.map((r) => files.map((f) => {
        const sq = f+r;
        const dark = (files.indexOf(f) + ranks.indexOf(r)) % 2 === 1;
        const pc = position[sq];
        const isLast = lm.includes(sq);
        const white = pc && pc === pc.toUpperCase();
        return (
          <div key={sq} className={`cb-sq ${dark?'cb-dark':'cb-light'} ${isLast?'cb-last':''}`}>
            {pc && <span className={`cb-pc ${white?'cb-white':'cb-black'}`}>{PIECE_GLYPH[pc.toLowerCase()]}</span>}
          </div>
        );
      }))}
    </div>
  );
}

/* =================== TIC-TAC-TOE (perfect minimax AI) =================== */
const TTT = {
  empty: () => Array(9).fill(null),
  lines: [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]],
  winner(b){ for (const [a,c,d] of TTT.lines){ if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; } return b.every(x=>x)?'draw':null; },
  minimax(b, me, turn){
    const w = TTT.winner(b);
    if (w==='draw') return { score:0 };
    if (w) return { score: w===me ? 10 : -10 };
    let best = { score: turn===me ? -Infinity : Infinity, move: -1 };
    for (let i=0;i<9;i++){ if (!b[i]){ b[i]=turn; const r=TTT.minimax(b, me, turn==='X'?'O':'X'); b[i]=null;
      const s = r.score - Math.sign(r.score)*0.1;
      if (turn===me ? s>best.score : s<best.score){ best={score:s, move:i}; } } }
    return best;
  },
  aiMove(b, me){ return TTT.minimax(b.slice(), me, me).move; },
};

/* =================== CONNECT FOUR (depth-limited negamax) =================== */
const C4 = {
  ROWS: 6, COLS: 7,
  empty: () => Array(42).fill(null),
  idx: (r,c) => r*7+c,
  drop(b, col, p){ const nb=b.slice(); for (let r=5;r>=0;r--){ if (!nb[r*7+col]){ nb[r*7+col]=p; return { board:nb, row:r }; } } return null; },
  valid(b){ const v=[]; for (let c=0;c<7;c++) if (!b[c]) v.push(c); return v; },
  winner(b){
    const dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for (let r=0;r<6;r++) for (let c=0;c<7;c++){ const p=b[r*7+c]; if (!p) continue;
      for (const [dr,dc] of dirs){ let k=1; while(k<4){ const nr=r+dr*k, nc=c+dc*k; if (nr<0||nr>=6||nc<0||nc>=7||b[nr*7+nc]!==p) break; k++; } if (k===4) return { p, cells:[0,1,2,3].map(i=>[r+dr*i,c+dc*i]) }; }
    }
    return b.every(x=>x) ? { p:'draw' } : null;
  },
  score(b, me){
    const opp = me==='R'?'Y':'R'; let s=0;
    const windows=[];
    for (let r=0;r<6;r++) for (let c=0;c<7;c++){ for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
      const w=[]; for (let k=0;k<4;k++){ const nr=r+dr*k, nc=c+dc*k; if (nr<0||nr>=6||nc<0||nc>=7){ w.length=0; break; } w.push(b[nr*7+nc]); }
      if (w.length===4) windows.push(w);
    }}
    for (const w of windows){ const m=w.filter(x=>x===me).length, o=w.filter(x=>x===opp).length, e=w.filter(x=>!x).length;
      if (m===4) s+=1000; else if (m===3&&e===1) s+=12; else if (m===2&&e===2) s+=4;
      if (o===4) s-=1000; else if (o===3&&e===1) s-=16; else if (o===2&&e===2) s-=4;
    }
    for (let r=0;r<6;r++){ if (b[r*7+3]===me) s+=3; else if (b[r*7+3]===opp) s-=3; }
    return s;
  },
  negamax(b, depth, alpha, beta, p, me){
    const w = C4.winner(b);
    if (w){ if (w.p==='draw') return 0; return (w.p===me?1:-1)*(100000 - (42-b.filter(x=>x).length)); }
    if (depth===0) return C4.score(b, me) * (p===me?1:-1);
    let best=-Infinity; const cols=C4.valid(b).sort((a,c)=>Math.abs(3-a)-Math.abs(3-c));
    for (const col of cols){ const d=C4.drop(b,col,p); const v=-C4.negamax(d.board, depth-1, -beta, -alpha, p==='R'?'Y':'R', me);
      if (v>best) best=v; if (best>alpha) alpha=best; if (alpha>=beta) break; }
    return best;
  },
  aiMove(b, me, depth=5){
    let best=-Infinity, move=C4.valid(b)[0];
    const cols=C4.valid(b).sort((a,c)=>Math.abs(3-a)-Math.abs(3-c));
    for (const col of cols){ const d=C4.drop(b,col,me); const v=-C4.negamax(d.board, depth-1, -Infinity, Infinity, me==='R'?'Y':'R', me);
      if (v>best){ best=v; move=col; } }
    return move;
  },
};

/* =================== OTHELLO (legal moves + positional AI) =================== */
const OTH = {
  start(){ const b=Array(64).fill(null); b[27]='W';b[28]='B';b[35]='B';b[36]='W'; return b; },
  dirs: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
  flips(b, idx, p){ const opp=p==='B'?'W':'B'; const r=Math.floor(idx/8), c=idx%8; if (b[idx]) return [];
    const out=[]; for (const [dr,dc] of OTH.dirs){ let nr=r+dr,nc=c+dc; const line=[];
      while(nr>=0&&nr<8&&nc>=0&&nc<8&&b[nr*8+nc]===opp){ line.push(nr*8+nc); nr+=dr; nc+=dc; }
      if (line.length && nr>=0&&nr<8&&nc>=0&&nc<8&&b[nr*8+nc]===p) out.push(...line); }
    return out;
  },
  legal(b, p){ const m=[]; for (let i=0;i<64;i++){ if (!b[i] && OTH.flips(b,i,p).length) m.push(i); } return m; },
  apply(b, idx, p){ const nb=b.slice(); const fl=OTH.flips(b,idx,p); nb[idx]=p; fl.forEach(i=>nb[i]=p); return nb; },
  count(b){ return { B: b.filter(x=>x==='B').length, W: b.filter(x=>x==='W').length }; },
  WEIGHTS: [120,-20,20,5,5,20,-20,120, -20,-40,-5,-5,-5,-5,-40,-20, 20,-5,15,3,3,15,-5,20, 5,-5,3,3,3,3,-5,5, 5,-5,3,3,3,3,-5,5, 20,-5,15,3,3,15,-5,20, -20,-40,-5,-5,-5,-5,-40,-20, 120,-20,20,5,5,20,-20,120],
  aiMove(b, p){ const moves=OTH.legal(b,p); if (!moves.length) return -1;
    let best=-Infinity, mv=moves[0];
    for (const m of moves){ const nb=OTH.apply(b,m,p); let s=0; for (let i=0;i<64;i++){ if (nb[i]===p) s+=OTH.WEIGHTS[i]; else if (nb[i]) s-=OTH.WEIGHTS[i]; }
      s -= OTH.legal(nb, p==='B'?'W':'B').length*2;
      if (s>best){ best=s; mv=m; } }
    return mv;
  },
};

/* =================== GO board (static render) =================== */
function GoBoard({ size = 9, stones = [], size_px }) {
  // stones: [{x,y,c}]
  const N = size;
  const cell = (size_px || 300) / N;
  const map = {}; stones.forEach(s => map[s.y*N+s.x] = s.c);
  const stars = N===9 ? [[2,2],[6,2],[2,6],[6,6],[4,4]] : [];
  return (
    <div className="goboard" style={{ '--n': N, width: size_px||300, height: size_px||300 }}>
      <svg viewBox={`0 0 ${N} ${N}`} className="go-grid">
        {Array.from({length:N}).map((_,i)=>(
          <g key={i}>
            <line x1={0.5} y1={i+0.5} x2={N-0.5} y2={i+0.5} />
            <line x1={i+0.5} y1={0.5} x2={i+0.5} y2={N-0.5} />
          </g>
        ))}
        {stars.map(([x,y],i)=><circle key={i} cx={x+0.5} cy={y+0.5} r={0.08} className="go-star" />)}
        {stones.map((s,i)=>(
          <circle key={i} cx={s.x+0.5} cy={s.y+0.5} r={0.42} className={s.c==='B'?'go-b':'go-w'} />
        ))}
      </svg>
    </div>
  );
}

/* =================== Generic preview board (for non-wired games) =================== */
function PreviewBoard({ game }) {
  const cat = game.category;
  if (cat === 'Card') {
    return (
      <div className="cardtable">
        {['♠','♥','♦','♣'].map((s,i)=>(
          <div key={i} className={`playcard ${i%2?'pc-red':''}`} style={{ '--i':i }}>
            <span className="pc-rank">{['A','K','Q','J'][i]}</span><span className="pc-suit">{s}</span>
          </div>
        ))}
      </div>
    );
  }
  if (cat === 'RL') {
    return (
      <div className="rlview">
        <svg viewBox="0 0 200 110" className="rl-svg">
          <path d="M0 92 H200" className="rl-ground" />
          <path d="M10 92 C40 92 50 40 80 40 S130 80 150 80 196 30 196 30" className="rl-track" />
          <circle cx="80" cy="40" r="6" className="rl-agent" />
          <rect x="150" y="70" width="14" height="14" rx="2" className="rl-goal" />
        </svg>
      </div>
    );
  }
  if (cat === 'Strategy') {
    return (
      <div className="matrixview">
        <div className="payoff">
          {[['3,3','0,5'],['5,0','1,1']].map((row,r)=>row.map((c,ci)=>(
            <div key={r+'-'+ci} className={`po-cell ${r===ci?'po-diag':''}`}>{c}</div>
          )))}
        </div>
      </div>
    );
  }
  // Board fallback — checkerboard
  return (
    <div className="genboard">
      {Array.from({length:64}).map((_,i)=>{ const r=Math.floor(i/8); return <div key={i} className={`gb-sq ${(r+i)%2?'gb-d':'gb-l'}`} />; })}
    </div>
  );
}

Object.assign(window, {
  CHESS_START, applyUci, chessPosAt, ChessBoard,
  TTT, C4, OTH, GoBoard, PreviewBoard, PIECE_GLYPH,
});
