/* ============================================================
   eSlams — Arena animated game previews
   getArenaPreview(game) → a looping, animated mini-visual.
   Adapts to our light/dark tokens (no neon). Re-keys per game.
   ============================================================ */

/* shared: step loop 0..len-1, hold at end, then restart */
function useStepLoop(len, ms, holdMs=1100){
  const [i,setI]=useState(0);
  useEffect(()=>{
    let stopped=false, t, cur=0;
    setI(0);
    const run=()=>{
      if(stopped) return;
      cur++;
      if(cur>=len){ setI(len-1); t=setTimeout(()=>{ cur=0; setI(0); t=setTimeout(run,ms); }, holdMs); return; }
      setI(cur); t=setTimeout(run,ms);
    };
    t=setTimeout(run,ms);
    return ()=>{ stopped=true; clearTimeout(t); };
  },[len,ms,holdMs]);
  return i;
}

/* ---------- Tic-Tac-Toe ---------- */
function PvTTT(){
  const seq=[{i:4,p:'X'},{i:0,p:'O'},{i:8,p:'X'},{i:2,p:'O'},{i:6,p:'X'}]; // X wins anti-diag 2-4-6? use 4,8,? -> winline 2,4,6
  const winLine=[2,4,6];
  const step=useStepLoop(seq.length+1, 560, 1300);
  const placed=seq.slice(0,step);
  const done=step>=seq.length;
  const cellMark=(idx)=>placed.find(s=>s.i===idx);
  return (
    <div className="pv pv-ttt">
      <div className="pv-ttt-grid">
        {Array.from({length:9}).map((_,idx)=>{ const m=cellMark(idx); const wl=done&&winLine.includes(idx);
          return <div key={idx} className={`pv-ttt-cell ${wl?'pv-ttt-win':''}`}>{m && <span className={`pv-ttt-mark pv-${m.p}`} key={m.p+idx}>{m.p==='X'?'✕':'◯'}</span>}</div>;
        })}
      </div>
    </div>
  );
}

/* ---------- Connect Four ---------- */
function PvC4(){
  const drops=[3,2,3,4,4,2,5,1,5,3]; // R,Y alternating
  const step=useStepLoop(drops.length+1, 420, 1300);
  const board=useMemo(()=>{ let b=C4.empty(); const cells=[]; for(let k=0;k<step;k++){ const p=k%2===0?'R':'Y'; const d=C4.drop(b,drops[k],p); if(d){ b=d.board; cells.push(d.row*7+drops[k]); } } return {b,last:cells[cells.length-1]}; },[step]);
  const win=C4.winner(board.b); const wc=win&&win.cells?win.cells.map(([r,c])=>r*7+c):[];
  return (
    <div className="pv pv-c4">
      <div className="pv-c4-board">
        {board.b.map((c,i)=>(<div key={i} className="pv-c4-cell">{c && <span className={`pv-c4-disc pv-c4-${c} ${i===board.last?'pv-c4-drop':''} ${wc.includes(i)?'pv-c4-win':''}`} />}</div>))}
      </div>
    </div>
  );
}

/* ---------- generic board piece slider (chess / checkers / shogi / xiangqi) ---------- */
function PvBoardSlide({ glyphA='♞', glyphB='♟', n=8, path }){
  // path: array of {from:[r,c], to:[r,c]} hops for the moving piece
  const hops = path || [{from:[7,1],to:[5,2]},{from:[5,2],to:[3,3]},{from:[3,3],to:[1,4]}];
  const step=useStepLoop(hops.length+1, 900, 900);
  const hop = hops[Math.min(step,hops.length-1)];
  const pos = step===0?hops[0].from : hops[Math.min(step,hops.length)-1].to;
  const pct=(v)=>`${(v/n)*100}%`;
  const statics=useMemo(()=>{
    // a few decorative static pieces
    return [[0,0,glyphB],[0,n-1,glyphB],[n-1,n-2,glyphB],[2,5,glyphB]];
  },[n,glyphB]);
  return (
    <div className="pv pv-board" style={{'--n':n}}>
      <div className="pv-board-grid">
        {Array.from({length:n*n}).map((_,i)=>{ const r=Math.floor(i/n),c=i%n; return <div key={i} className={`pv-bsq ${(r+c)%2?'pv-bd':'pv-bl'} ${hop&&hop.to[0]===r&&hop.to[1]===c?'pv-btarget':''}`} />; })}
      </div>
      {statics.map(([r,c,g],k)=><span key={k} className="pv-piece pv-piece-static" style={{left:pct(c),top:pct(r)}}>{g}</span>)}
      <span className="pv-piece pv-piece-move" style={{left:pct(pos[1]),top:pct(pos[0])}}>{glyphA}</span>
    </div>
  );
}

/* ---------- Go ---------- */
function PvGo(){
  const N=9;
  const stones=[[2,2,'B'],[6,2,'W'],[2,6,'W'],[6,6,'B'],[4,4,'B'],[3,4,'W'],[5,3,'B'],[4,5,'W'],[6,4,'B'],[3,6,'W']];
  const step=useStepLoop(stones.length+1, 380, 1300);
  return (
    <div className="pv pv-go">
      <svg viewBox="0 0 9 9" className="pv-go-svg">
        {Array.from({length:N}).map((_,k)=>(<g key={k}><line x1={0.5} y1={k+0.5} x2={N-0.5} y2={k+0.5}/><line x1={k+0.5} y1={0.5} x2={k+0.5} y2={N-0.5}/></g>))}
        {[[2,2],[6,2],[2,6],[6,6],[4,4]].map(([x,y],k)=><circle key={k} cx={x+0.5} cy={y+0.5} r={0.07} className="pv-go-star"/>)}
        {stones.slice(0,step).map(([x,y,c],k)=>(<circle key={k} cx={x+0.5} cy={y+0.5} r={0.42} className={`pv-go-stone pv-go-${c}`} style={{'--d':k===step-1?'1':'0'}}/>))}
      </svg>
    </div>
  );
}

/* ---------- Othello (real flips via engine) ---------- */
function PvOthello(){
  const states=useMemo(()=>{ let b=OTH.start(); const arr=[b.slice()]; let t='B'; for(let i=0;i<10;i++){ let mv=OTH.aiMove(b,t); if(mv<0){ t=t==='B'?'W':'B'; mv=OTH.aiMove(b,t); if(mv<0)break; } b=OTH.apply(b,mv,t); arr.push(b.slice()); t=t==='B'?'W':'B'; } return arr; },[]);
  const step=useStepLoop(states.length, 520, 1100);
  const b=states[Math.min(step,states.length-1)];
  return (
    <div className="pv pv-oth">
      <div className="pv-oth-board">
        {b.map((c,i)=>(<div key={i} className="pv-oth-cell">{c && <span className={`pv-oth-disc pv-oth-${c}`} />}</div>))}
      </div>
    </div>
  );
}

/* ---------- Cards (deal + fan) ---------- */
function PvCards({ suits=['♠','♥','♦','♣','♠'] }){
  return (
    <div className="pv pv-cards" key={Math.random()}>
      {suits.map((s,i)=>(
        <div key={i} className={`pv-card ${i%2?'pv-card-red':''}`} style={{'--i':i, '--n':suits.length}}>
          <span className="pv-card-r">{['A','K','Q','J','10'][i]}</span>
          <span className="pv-card-s">{s}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Rock-Paper-Scissors ---------- */
function PvRPS(){
  const ICON={rock:'✊',paper:'✋',scissors:'✌'};
  const rounds=[['rock','scissors'],['paper','rock'],['scissors','scissors'],['paper','paper']];
  const step=useStepLoop(rounds.length*2, 620, 700);
  const ri=Math.floor(step/2); const reveal=step%2===1; const [a,b]=rounds[Math.min(ri,rounds.length-1)];
  return (
    <div className="pv pv-rps">
      <div className={`pv-rps-hand pv-rps-you ${reveal?'':'pv-rps-shake'}`}>{reveal?ICON[a]:'✊'}</div>
      <div className="pv-rps-vs mono">vs</div>
      <div className={`pv-rps-hand pv-rps-ai ${reveal?'':'pv-rps-shake'}`}>{reveal?ICON[b]:'✊'}</div>
    </div>
  );
}

/* ---------- Dice (Liar's Dice) ---------- */
function PvDice(){
  const FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
  const [faces,setFaces]=useState([0,2,4,1,3]);
  const [rolling,setRolling]=useState(true);
  useEffect(()=>{
    let stopped=false; let t;
    const cycle=()=>{ if(stopped)return; setRolling(true);
      let n=0; const spin=setInterval(()=>{ setFaces(f=>f.map(()=>Math.floor(Math.random()*6))); if(++n>8){ clearInterval(spin); setRolling(false); t=setTimeout(cycle,1600); } },90);
    };
    cycle(); return ()=>{ stopped=true; clearTimeout(t); };
  },[]);
  return (
    <div className="pv pv-dice">
      {faces.map((f,i)=>(<span key={i} className={`pv-die ${rolling?'pv-die-roll':''}`} style={{'--i':i}}>{FACES[f]}</span>))}
    </div>
  );
}

/* ---------- Payoff matrix (game theory) ---------- */
function PvMatrix(){
  const cells=[['3,3','0,5'],['5,0','1,1']];
  const order=[0,1,3,2];
  const step=useStepLoop(order.length, 760, 600);
  const active=order[step%order.length];
  return (
    <div className="pv pv-matrix">
      <div className="pv-mx-grid">
        {cells.flat().map((c,i)=>(<div key={i} className={`pv-mx-cell ${i===active?'pv-mx-on':''}`}>{c}</div>))}
      </div>
      <div className="pv-mx-axes"><span>cooperate</span><span>defect</span></div>
    </div>
  );
}

/* ---------- RL: lander ---------- */
function PvLander(){
  return (
    <div className="pv pv-rl">
      <svg viewBox="0 0 200 140" className="pv-rl-svg">
        <path d="M0 120 H70 L85 110 H115 L130 120 H200" className="pv-rl-ground"/>
        <rect x="85" y="110" width="30" height="3" className="pv-rl-pad"/>
        <g className="pv-rl-lander">
          <polygon points="100,0 110,14 90,14" className="pv-rl-ship"/>
          <rect x="92" y="14" width="16" height="10" rx="2" className="pv-rl-ship"/>
          <line x1="94" y1="24" x2="90" y2="32" className="pv-rl-leg"/><line x1="106" y1="24" x2="110" y2="32" className="pv-rl-leg"/>
          <polygon points="96,24 104,24 100,38" className="pv-rl-flame"/>
        </g>
      </svg>
    </div>
  );
}

/* ---------- RL: agent on track ---------- */
function PvTrack(){
  return (
    <div className="pv pv-rl">
      <svg viewBox="0 0 200 140" className="pv-rl-svg">
        <path id="pvpath" d="M12 110 C 50 110 55 40 95 40 S 150 95 188 30" className="pv-rl-track"/>
        <rect x="178" y="20" width="14" height="14" rx="2" className="pv-rl-goal"/>
        <circle r="6" className="pv-rl-agent">
          <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto"><mpath href="#pvpath"/></animateMotion>
        </circle>
      </svg>
    </div>
  );
}

/* ---------- dispatch ---------- */
function getArenaPreview(game){
  const s=game.slug;
  if(s==='tic-tac-toe'||s==='ultimate-tic-tac-toe') return <PvTTT/>;
  if(s==='connect-four') return <PvC4/>;
  if(s==='chess') return <PvBoardSlide glyphA="♞" glyphB="♟" n={8}/>;
  if(s==='checkers') return <PvBoardSlide glyphA="⛂" glyphB="⛀" n={8} path={[{from:[5,0],to:[4,1]},{from:[4,1],to:[2,3]},{from:[2,3],to:[0,5]}]}/>;
  if(s==='shogi') return <PvBoardSlide glyphA="☗" glyphB="☖" n={9}/>;
  if(s==='xiangqi') return <PvBoardSlide glyphA="將" glyphB="兵" n={9}/>;
  if(s==='go') return <PvGo/>;
  if(s==='gomoku'||s==='hex'||s==='pentago'||s==='nine-mens-morris') return <PvGo/>;
  if(s==='othello') return <PvOthello/>;
  if(s==='rock-paper-scissors') return <PvRPS/>;
  if(s==='liars-dice') return <PvDice/>;
  if(game.category==='Card') return <PvCards suits={s.includes('heart')?['♥','♥','♥','♥','♥']:s.includes('spade')?['♠','♠','♠','♠','♠']:['♠','♥','♦','♣','♠']}/>;
  if(game.category==='Strategy') return <PvMatrix/>;
  if(game.category==='RL'){ if(s==='lunar-lander'||s==='cartpole'||s==='bipedal-walker') return <PvLander/>; return <PvTrack/>; }
  // board fallback
  return <PvBoardSlide glyphA="●" glyphB="○" n={8}/>;
}

Object.assign(window, { getArenaPreview, useStepLoop, PvTTT, PvC4, PvBoardSlide, PvGo, PvOthello, PvCards, PvRPS, PvDice, PvMatrix, PvLander, PvTrack });
