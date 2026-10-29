/* ============================================================
   eSlams — Arena game implementations (playable vs model)
   Each game calls onEnd(result) where result: 'win'|'loss'|'draw' (from human POV)
   and reports moves via setMoveNo.
   ============================================================ */

function ThinkingTag({ model }){
  const [p] = model.split('/');
  return <span className="thinking"><ProviderDot provider={p} size={15} /> <span className="mono">thinking</span><span className="think-dots"><i/><i/><i/></span></span>;
}

/* ---------- Tic-Tac-Toe ---------- */
function TicTacToeGame({ model, onEnd, onMove }){
  const [board, setBoard] = useState(TTT.empty());
  const [turn, setTurn] = useState('X'); // human X
  const [thinking, setThinking] = useState(false);
  const win = TTT.winner(board);
  const winLine = useMemo(()=>{ if(!win||win==='draw')return[]; return TTT.lines.find(([a,b,c])=>board[a]&&board[a]===board[b]&&board[a]===board[c])||[]; },[win,board]);

  useEffect(()=>{ if(win){ onEnd(win==='draw'?'draw':win==='X'?'win':'loss'); } },[win]);
  useEffect(()=>{
    if(turn==='O' && !win){ setThinking(true);
      const t=setTimeout(()=>{ const mv=TTT.aiMove(board,'O'); if(mv>=0){ const nb=board.slice(); nb[mv]='O'; setBoard(nb); onMove&&onMove(); } setTurn('X'); setThinking(false); }, 620);
      return ()=>clearTimeout(t);
    }
  },[turn]);

  const play=(i)=>{ if(board[i]||win||turn!=='X'||thinking)return; const nb=board.slice(); nb[i]='X'; setBoard(nb); onMove&&onMove(); setTurn('O'); };
  return (
    <div className="agame">
      <div className="agame-status">{thinking ? <ThinkingTag model={model} /> : win ? <span className="mono">game over</span> : <span className="mono">your move <span className="ttt-X">✕</span></span>}</div>
      <div className="tttboard">
        {board.map((c,i)=>(
          <button key={i} className={`tttcell ${c?'filled':''} ${c?'ttt-'+c:''} ${winLine.includes(i)?'tttwin':''}`} onClick={()=>play(i)} disabled={!!c||!!win}>
            {c && <span className="ttt-mark">{c==='X'?'✕':'◯'}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Connect Four ---------- */
function ConnectFourGame({ model, onEnd, onMove }){
  const [board, setBoard] = useState(C4.empty());
  const [turn, setTurn] = useState('R'); // human R
  const [thinking, setThinking] = useState(false);
  const win = C4.winner(board);
  const winCells = win&&win.cells ? win.cells.map(([r,c])=>r*7+c) : [];

  useEffect(()=>{ if(win){ onEnd(win.p==='draw'?'draw':win.p==='R'?'win':'loss'); } },[win]);
  useEffect(()=>{
    if(turn==='Y'&&!win){ setThinking(true);
      const t=setTimeout(()=>{ const col=C4.aiMove(board,'Y',5); const d=C4.drop(board,col,'Y'); if(d){ setBoard(d.board); onMove&&onMove(); } setTurn('R'); setThinking(false); }, 560);
      return ()=>clearTimeout(t);
    }
  },[turn]);

  const play=(col)=>{ if(win||turn!=='R'||thinking)return; const d=C4.drop(board,col,'R'); if(!d)return; setBoard(d.board); onMove&&onMove(); setTurn('Y'); };
  return (
    <div className="agame">
      <div className="agame-status">{thinking ? <ThinkingTag model={model} /> : win ? <span className="mono">game over</span> : <span className="mono">your move <span className="c4tag c4tag-r"/></span>}</div>
      <div className="c4wrap">
        <div className="c4board">
          {board.map((c,i)=>(<div key={i} className="c4cell">{c && <span className={`c4disc c4-${c} ${winCells.includes(i)?'c4win':''}`} />}</div>))}
        </div>
        <div className="c4colwrap">
          {Array.from({length:7}).map((_,c)=>(<div key={c} className="c4colhit" onClick={()=>play(c)} />))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Othello ---------- */
function OthelloGame({ model, onEnd, onMove }){
  const [board, setBoard] = useState(OTH.start());
  const [turn, setTurn] = useState('B'); // human B
  const [thinking, setThinking] = useState(false);
  const legal = useMemo(()=>turn==='B'?OTH.legal(board,'B'):[], [board,turn]);
  const cnt = OTH.count(board);
  const full = board.every(x=>x);
  const noMovesBoth = OTH.legal(board,'B').length===0 && OTH.legal(board,'W').length===0;
  const over = full || noMovesBoth;

  useEffect(()=>{ if(over){ const r=cnt.B>cnt.W?'win':cnt.B<cnt.W?'loss':'draw'; onEnd(r); } },[over]);
  useEffect(()=>{
    if(over)return;
    if(turn==='W'){ setThinking(true);
      const t=setTimeout(()=>{ const mv=OTH.aiMove(board,'W'); if(mv>=0){ setBoard(OTH.apply(board,mv,'W')); onMove&&onMove(); } setTurn('B'); setThinking(false); }, 640);
      return ()=>clearTimeout(t);
    } else { if(OTH.legal(board,'B').length===0 && OTH.legal(board,'W').length>0){ setTurn('W'); } }
  },[turn,board]);

  const play=(i)=>{ if(turn!=='B'||thinking||!legal.includes(i))return; setBoard(OTH.apply(board,i,'B')); onMove&&onMove(); setTurn('W'); };
  return (
    <div className="agame">
      <div className="agame-status">
        {thinking ? <ThinkingTag model={model} /> : over ? <span className="mono">game over</span> : <span className="mono">your move <span className="othdot othdot-b"/></span>}
        <span className="oth-score mono"><span className="othdot othdot-b"/>{cnt.B} <span className="othdot othdot-w"/>{cnt.W}</span>
      </div>
      <div className="othboard">
        {board.map((c,i)=>(
          <button key={i} className={`othcell ${legal.includes(i)?'legal':''}`} onClick={()=>play(i)}>
            {c && <span className={`othdisc d-${c}`} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Rock-Paper-Scissors (best of 5) ---------- */
function RPSGame({ model, onEnd, onMove }){
  const CH=['rock','paper','scissors']; const ICON={rock:'✊',paper:'✋',scissors:'✌'};
  const [you,setYou]=useState(0),[ai,setAi]=useState(0),[round,setRound]=useState(0);
  const [last,setLast]=useState(null),[thinking,setThinking]=useState(false);
  const [hist,setHist]=useState([]);
  const beats=(a,b)=>(a==='rock'&&b==='scissors')||(a==='paper'&&b==='rock')||(a==='scissors'&&b==='paper');

  useEffect(()=>{ if(you===3||ai===3){ onEnd(you>ai?'win':'loss'); } },[you,ai]);

  const play=(c)=>{ if(thinking||you>=3||ai>=3)return; setThinking(true);
    setTimeout(()=>{
      // model: predict human's most frequent and counter, with noise
      let pred=hist.length? hist.reduce((a,b)=>{a[b]=(a[b]||0)+1;return a;},{}) : null;
      let guess = pred ? Object.keys(pred).sort((x,y)=>pred[y]-pred[x])[0] : CH[Math.floor(Math.random()*3)];
      let mv = Math.random()<0.6 ? CH[(CH.indexOf(guess)+1)%3] : CH[Math.floor(Math.random()*3)];
      const res = beats(c,mv)?'win':beats(mv,c)?'loss':'draw';
      if(res==='win')setYou(s=>s+1); else if(res==='loss')setAi(s=>s+1);
      setLast({you:c,ai:mv,res}); setHist(h=>[...h,c]); setRound(r=>r+1); onMove&&onMove(); setThinking(false);
    }, 500);
  };
  return (
    <div className="agame rps">
      <div className="rps-score">
        <div className="rps-s"><span className="rps-sl">You</span><span className="mono rps-sn">{you}</span></div>
        <span className="rps-vs mono">best of 5</span>
        <div className="rps-s"><span className="rps-sl">Model</span><span className="mono rps-sn">{ai}</span></div>
      </div>
      <div className="rps-arena">
        <div className={`rps-hand ${last?'':'rps-idle'}`}>{last?ICON[last.you]:'✊'}</div>
        <div className="rps-mid">{thinking?<ThinkingTag model={model}/>:last?<span className={`reschip reschip-${last.res==='win'?'win':last.res==='loss'?'loss':'draw'}`}>{last.res==='win'?'You win':last.res==='loss'?'Model wins':'Draw'}</span>:<span className="mono rps-go">Throw!</span>}</div>
        <div className={`rps-hand rps-ai ${last?'':'rps-idle'}`}>{last?ICON[last.ai]:'✊'}</div>
      </div>
      <div className="rps-picks">
        {CH.map(c=>(<button key={c} className="rps-pick" onClick={()=>play(c)} disabled={thinking}><span className="rps-pi">{ICON[c]}</span><span className="rps-pl">{c}</span></button>))}
      </div>
    </div>
  );
}

const PLAYABLE = { 'tic-tac-toe':TicTacToeGame, 'connect-four':ConnectFourGame, 'othello':OthelloGame, 'rock-paper-scissors':RPSGame };

Object.assign(window, { TicTacToeGame, ConnectFourGame, OthelloGame, RPSGame, PLAYABLE, ThinkingTag });
