/* ============================================================
   eSlams — Shared replay builders + board renderers
   Used by Profile (game replay modal). Hooks from globals.js.
   ============================================================ */

const RP_CHESS_UCI = ['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3','a7a6','f1e2','e7e5','d4b3','f8e7','e1g1','e8g8','c1e3','c8e6'];
const RP_C4_MOVES = [3,3,2,4,4,2,5,2,1,5,3,1,4,6];
const RP_TTT_MOVES = [4,0,8,2,6,3,5];

function rpBuildC4(moves){ let cur=C4.empty(); const arr=[cur.slice()]; moves.forEach((col,i)=>{ const d=C4.drop(cur,col,i%2===0?'R':'Y'); if(d){ cur=d.board; arr.push(cur.slice()); } }); return arr; }
function rpBuildTTT(moves){ let cur=TTT.empty(); const arr=[cur.slice()]; moves.forEach((cell,i)=>{ cur=cur.slice(); cur[cell]=i%2===0?'X':'O'; arr.push(cur.slice()); }); return arr; }
function rpGenOthello(n){ let b=OTH.start(); const arr=[b.slice()]; let t='B'; for(let i=0;i<n;i++){ let mv=OTH.aiMove(b,t); if(mv<0){ t=t==='B'?'W':'B'; mv=OTH.aiMove(b,t); if(mv<0) break; } b=OTH.apply(b,mv,t); arr.push(b.slice()); t=t==='B'?'W':'B'; } return arr; }
const RP_GO_STONES = [{x:2,y:2,c:'B'},{x:6,y:2,c:'W'},{x:2,y:6,c:'W'},{x:6,y:6,c:'B'},{x:4,y:4,c:'B'},{x:3,y:4,c:'W'},{x:5,y:3,c:'B'},{x:4,y:5,c:'W'},{x:1,y:4,c:'B'},{x:7,y:5,c:'W'},{x:3,y:2,c:'B'},{x:5,y:6,c:'W'}];

function getReplay(slug){
  if(slug==='chess') return { kind:'chess', frames: RP_CHESS_UCI.map((u,i)=>({ pos: chessPosAt(RP_CHESS_UCI, i+1), last: RP_CHESS_UCI[i] })) };
  if(slug==='connect-four') return { kind:'connect-four', frames: rpBuildC4(RP_C4_MOVES) };
  if(slug==='tic-tac-toe') return { kind:'tic-tac-toe', frames: rpBuildTTT(RP_TTT_MOVES) };
  if(slug==='othello') return { kind:'othello', frames: rpGenOthello(18) };
  if(slug==='go') return { kind:'go', frames:[RP_GO_STONES] };
  return null;
}

function MiniBoard({ kind, frame }){
  if(kind==='chess') return <ChessBoard position={frame.pos} lastMove={frame.last} size="md" />;
  if(kind==='connect-four') return <div className="c4board">{frame.map((cell,i)=>(<div key={i} className="c4cell">{cell && <span className={`c4disc c4-${cell}`} />}</div>))}</div>;
  if(kind==='tic-tac-toe') return <div className="tttboard">{frame.map((cell,i)=>(<div key={i} className={`tttcell ${cell?'filled ttt-'+cell:''}`}>{cell && <span className="ttt-mark">{cell==='X'?'✕':'◯'}</span>}</div>))}</div>;
  if(kind==='othello') return <div className="othboard">{frame.map((cell,i)=>(<div key={i} className="othcell">{cell && <span className={`othdisc d-${cell}`} />}</div>))}</div>;
  if(kind==='go') return <GoBoard size={9} stones={frame} size_px={340} />;
  return null;
}

/* Player with scrubber + autoplay (reuses .vw- control styles) */
function ReplayPlayer({ replay }){
  const max = replay.frames.length - 1;
  const single = max <= 0;
  const [ply,setPly] = useState(single ? 0 : 0);
  const [playing,setPlaying] = useState(!single);
  useEffect(()=>{
    if(single || !playing) return;
    if(ply>=max){ setPlaying(false); return; }
    const t=setTimeout(()=>setPly(p=>Math.min(max,p+1)), replay.kind==='tic-tac-toe'?640:520);
    return ()=>clearTimeout(t);
  },[playing,ply,max,single]);
  return (
    <div className="rpl">
      <div className="rpl-board"><MiniBoard kind={replay.kind} frame={replay.frames[ply]} /></div>
      {!single && (
        <div className="vw-controls rpl-controls">
          <div className="vw-btns">
            <button className="vw-ctl" onClick={()=>{setPlaying(false);setPly(0);}} aria-label="Restart"><Icon name="skipBack" size={16}/></button>
            <button className="vw-ctl" onClick={()=>{setPlaying(false);setPly(p=>Math.max(0,p-1));}} aria-label="Back"><Icon name="chevronLeft" size={18}/></button>
            <button className="vw-ctl vw-play" onClick={()=>{ if(ply>=max) setPly(0); setPlaying(p=>!p); }}><Icon name={playing?'pause':'play'} size={18}/></button>
            <button className="vw-ctl" onClick={()=>{setPlaying(false);setPly(p=>Math.min(max,p+1));}} aria-label="Forward"><Icon name="chevronRight" size={18}/></button>
            <button className="vw-ctl" onClick={()=>{setPlaying(false);setPly(max);}} aria-label="End"><Icon name="skipFwd" size={16}/></button>
          </div>
          <input className="vw-scrub" type="range" min="0" max={max} value={ply} onChange={e=>{setPlaying(false);setPly(+e.target.value);}} />
          <span className="vw-ply mono">{ply}/{max}</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { getReplay, MiniBoard, ReplayPlayer, rpBuildC4, rpBuildTTT, rpGenOthello });
