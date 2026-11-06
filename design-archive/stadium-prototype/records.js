// Port of 05-data/home-hero-animation-records.ts (locked hero sequences) + replay sequences for the other families.
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function mulberry32(seed){ let s=seed; return ()=>{ s|=0; s=(s+0x6D2B79F5)|0; let v=Math.imul(s^(s>>>15),1|s); v=(v+Math.imul(v^(v>>>7),61|v))^v; return ((v^(v>>>14))>>>0)/4294967296; }; }
const sq = s => (8-Number(s[1]))*8 + (s.charCodeAt(0)-97);

export function chessRecord(){
  const UCI=['e2e4','e7e5','f1c4','d7d6','g1f3','c8g4','b1c3','g7g6','f3e5','g4d1','c4f7','e8e7','c3d5'];
  const SAN=['e4','e5','Bc4','d6','Nf3','Bg4','Nc3','g6','Nxe5!','Bxd1','Bxf7+','Ke7','Nd5#'];
  const b=Array.from('rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR');
  const frames=[b.join('')], labels=['·'], last=[null];
  UCI.forEach((m,i)=>{ const f=sq(m.slice(0,2)), t=sq(m.slice(2,4)); b[t]=b[f]; b[f]='.'; frames.push(b.join('')); labels.push(`${Math.floor(i/2)+1}${i%2?'…':'.'} ${SAN[i]}`); last.push([f,t]); });
  return {fam:'square_board', rows:8, cols:8, frames, labels, last, delay:760, winner:'a'};
}

function c4Windows(){ const w=[]; for(let r=0;r<6;r++)for(let c=0;c<7;c++){const i=r*7+c; if(c<=3)w.push([i,i+1,i+2,i+3]); if(r<=2)w.push([i,i+7,i+14,i+21]); if(r<=2&&c<=3)w.push([i,i+8,i+16,i+24]); if(r<=2&&c>=3)w.push([i,i+6,i+12,i+18]);} return w; }
const C4W=c4Windows();
function c4Winner(b){ for(const w of C4W){ const f=b[w[0]]; if(f!=='.'&&w.every(i=>b[i]===f)) return {disc:f, line:w}; } return null; }
function playC4(seed){
  const rnd=mulberry32(seed), b=Array(42).fill('.'), frames=[b.join('')], labels=['·'], last=[null], order=[3,4,2,5,1,6,0];
  const rowFor=c=>{ for(let r=5;r>=0;r--) if(b[r*7+c]==='.') return r; return -1; };
  let cur='R';
  for(let ply=0;ply<42;ply++){
    const opp=cur==='R'?'Y':'R';
    const winCol=d=>{ for(const c of order){const r=rowFor(c); if(r<0)continue; b[r*7+c]=d; const w=!!c4Winner(b); b[r*7+c]='.'; if(w) return c;} return -1; };
    let mv=winCol(cur); if(mv<0) mv=winCol(opp);
    if(mv<0){ const safe=[]; for(const c of order){const r=rowFor(c); if(r<0)continue; b[r*7+c]=cur; let bad=false; for(const q of order){const rr=rowFor(q); if(rr<0)continue; b[rr*7+q]=opp; if(c4Winner(b)) bad=true; b[rr*7+q]='.'; if(bad)break;} b[r*7+c]='.'; if(!bad) safe.push(c);}
      const cands=safe.length?safe:order.filter(c=>rowFor(c)>=0); let best=-Infinity;
      for(const c of cands){ const r=rowFor(c); let s=3-Math.abs(3-c); for(const [dr,dc] of DIRS){const nr=r+dr,nc=c+dc; if(nr>=0&&nr<6&&nc>=0&&nc<7&&b[nr*7+nc]===cur) s+=1.2;} s+=rnd()*0.9; if(s>best){best=s;mv=c;} } }
    const r=rowFor(mv); b[r*7+mv]=cur; frames.push(b.join('')); labels.push(`${cur} → ${'abcdefg'[mv]}`); last.push(r*7+mv);
    const w=c4Winner(b); if(w) return {frames,labels,last,winner:w.disc,line:w.line};
    cur=opp;
  }
  return {frames,labels,last,winner:null,line:null};
}
export function connectFourRecord(full){
  let g=playC4(7); for(let s=7;s<200;s++){ const c=playC4(s); if(c.winner&&c.frames.length>=22&&c.frames.length<=36){g=c;break;} }
  const cut = full ? g.frames.length : Math.max(10,g.frames.length-5);
  return {fam:'connect_four', rows:6, cols:7, frames:g.frames.slice(0,cut), labels:g.labels.slice(0,cut), last:g.last.slice(0,cut), delay:500, winner:g.winner==='R'?'a':'b', line: full?g.line:null};
}

export function ticTacToeRecord(){
  const moves=[4,0,6,2,1,7,5,3,8], b=Array(9).fill('.'), frames=[b.join('')], labels=['·'], last=[null];
  const co=c=>`${'abc'[c%3]}${3-Math.floor(c/3)}`;
  moves.forEach((c,i)=>{ const m=i%2?'O':'X'; b[c]=m; frames.push(b.join('')); labels.push(`${m} ${co(c)}`); last.push(c); });
  return {fam:'grid_3x3', rows:3, cols:3, frames, labels, last, delay:820, winner:null};
}

function playOthello(seed){
  const rnd=mulberry32(seed), b=Array(64).fill('.'); b[27]='W'; b[28]='B'; b[35]='B'; b[36]='W';
  const flips=(i,cur)=>{ if(b[i]!=='.')return null; const r0=Math.floor(i/8), c0=i%8, opp=cur==='B'?'W':'B', all=[];
    for(const [dr,dc] of DIRS){ let r=r0+dr,c=c0+dc; const run=[]; while(r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]===opp){run.push(r*8+c); r+=dr; c+=dc;} if(run.length&&r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]===cur) all.push(...run);} return all.length?all:null; };
  const frames=[b.join('')], labels=['·'], last=[null]; let cur='B', passes=0;
  for(let ply=0;ply<120&&passes<2;ply++){
    const legal=[]; for(let i=0;i<64;i++){const f=flips(i,cur); if(f) legal.push([i,f]);}
    if(!legal.length){passes++; cur=cur==='B'?'W':'B'; continue;} passes=0;
    let best=legal[0], bs=-Infinity;
    for(const cand of legal){ const [i,f]=cand, r=Math.floor(i/8), c=i%8, corner=(r===0||r===7)&&(c===0||c===7), edge=r===0||r===7||c===0||c===7; let s=f.length; if(corner)s+=60; else if(edge)s+=6; if(!corner&&(r<=1||r>=6)&&(c<=1||c>=6)) s-=10; s+=rnd()*1.5; if(s>bs){bs=s;best=cand;} }
    const [i,f]=best; b[i]=cur; for(const x of f) b[x]=cur; frames.push(b.join('')); labels.push(`${cur} ${String.fromCharCode(97+i%8)}${8-Math.floor(i/8)}`); last.push(i); cur=cur==='B'?'W':'B';
  }
  const fin=b.join(''), black=[...fin].filter(d=>d==='B').length, white=[...fin].filter(d=>d==='W').length;
  return {frames,labels,last,black,white,winner:black===white?null:black>white?'B':'W'};
}
export function othelloRecord(){
  let ch=playOthello(3); for(let s=3;s<120;s++){const c=playOthello(s); const m=Math.abs(c.black-c.white); if(c.winner&&m>=6&&m<=20){ch=c;break;}}
  return {fam:'square_board', rows:8, cols:8, frames:ch.frames, labels:ch.labels, last:ch.last, delay:240, winner:ch.winner==='B'?'a':'b', score:`${ch.black}–${ch.white}`};
}

// Go 9×9 — a short scripted opening (plausible fill), no captures.
export function goRecord(){
  const pts=[[2,2],[6,6],[6,2],[2,6],[4,4],[4,2],[2,4],[6,4],[4,6],[3,3],[5,5],[3,5],[5,3],[4,3],[4,5],[3,4],[5,4],[2,3],[6,5],[7,2]];
  const b=Array(81).fill('.'), frames=[b.join('')], labels=['·'], last=[null];
  pts.forEach(([r,c],i)=>{ const s=i%2?'W':'B'; b[r*9+c]=s; frames.push(b.join('')); labels.push(`${s} ${'ABCDEFGHJ'[c]}${9-r}`); last.push(r*9+c); });
  return {fam:'go_board', rows:9, cols:9, frames, labels, last, delay:520, winner:'a'};
}
// Hex 11×11 — red (a) connects top↔bottom (plausible fill).
export function hexRecord(){
  const red=[[5,5],[4,5],[6,5],[3,6],[7,4],[2,6],[8,4],[1,7],[9,3],[0,7],[10,3]], blue=[[5,4],[5,6],[4,6],[6,4],[3,5],[7,5],[2,7],[8,3],[1,6],[9,4]];
  const b=Array(121).fill('.'), frames=[b.join('')], labels=['·'], last=[null];
  for(let i=0;i<red.length;i++){ const [r,c]=red[i]; b[r*11+c]='R'; frames.push(b.join('')); labels.push(`R ${'abcdefghijk'[c]}${r+1}`); last.push(r*11+c); if(blue[i]){const [r2,c2]=blue[i]; b[r2*11+c2]='B'; frames.push(b.join('')); labels.push(`B ${'abcdefghijk'[c2]}${r2+1}`); last.push(r2*11+c2);} }
  return {fam:'hex_board', rows:11, cols:11, frames, labels, last, delay:480, winner:'a', line: red.map(([r,c])=>r*11+c)};
}
// Goofspiel (card_table) — five rounds, both seats bid a card; frames encode "A:rank,B:rank|prize" (plausible fill).
export function cardsRecord(){
  const rounds=[['K','9','T'],['5','Q','7'],['A','K','K'],['7','2','3'],['J','T','9']];
  const frames=['.'], labels=['·'], last=[null]; let a=0,b=0;
  rounds.forEach(([x,y,p],i)=>{ const v=r=>'23456789TJQKA'.indexOf(r); frames.push(`${x},${y}|${p}|${i}`); if(v(x)>v(y)) a+=v(p)+2; else if(v(y)>v(x)) b+=v(p)+2; labels.push(`bids ${x} vs ${y} for ${p}`); last.push(i); });
  return {fam:'card_table', frames, labels, last, delay:900, winner:a>b?'a':'b', score:`${a}–${b}`};
}

export const RECORDS = { chess: chessRecord(), 'connect-four': connectFourRecord(false), 'connect-four-full': connectFourRecord(true), othello: othelloRecord(), 'tic-tac-toe': ticTacToeRecord(), go: goRecord(), hex: hexRecord(), cards: cardsRecord() };
export const HERO_ORDER = ['chess','connect-four','othello','tic-tac-toe'];
export function recordFor(slug){ const f = ({'gomoku':'go','goofspiel':'cards','ultimate-tic-tac-toe':'tic-tac-toe','checkers':'othello','battleship':'othello'})[slug] || slug; return RECORDS[f] || RECORDS['tic-tac-toe']; }
