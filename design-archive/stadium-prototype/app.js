// eSlams Stadium — application logic (imported by the Stadium DC's thin logic class).
import * as D from './data.js';
import * as R from './records.js';

const NOW = Date.now();
const dayMs = 86400000;
export function fmtDate(iso){
  const t = new Date(iso).getTime(), diff = NOW - t, abs = new Date(iso);
  const absS = abs.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  if (diff < 60000) return { rel:'just now', abs:absS };
  if (diff < 3600000) return { rel:`${Math.floor(diff/60000)}m ago`, abs:absS };
  if (diff < dayMs) return { rel:`${Math.floor(diff/3600000)}h ago`, abs:absS };
  if (diff < 30*dayMs) return { rel:`${Math.floor(diff/dayMs)}d ago`, abs:absS };
  return { rel:absS, abs:absS };
}
export const LAST_MATCH = '26 Jun 2026';

export function badge(id){
  const m = D.MODEL[id]; if (!m) return { name:id, id, prov:'', mark:'', provPart:'', namePart:id, short:id };
  const [provPart, namePart] = m.id.split('/');
  return { ...m, provPart: provPart + '/', namePart };
}

export function narrate(fam, label, slug){
  if (!label || label === '·') return '';
  const [side, ...rest] = label.split(' '); const tok = rest.join(' ');
  if (fam === 'connect_four') return `drops a disc in column ${label.split('→ ')[1] || tok}`;
  if (fam === 'grid_3x3') return tok === 'b2' ? 'plays the centre square' : `plays ${tok}`;
  if (fam === 'square_board' && slug === 'chess') return `plays ${label.replace(/^\d+[.…]\s*/, '')}`;
  if (fam === 'square_board') return `plays ${tok}, flipping discs`;
  if (fam === 'go_board') return `places a stone at ${tok}`;
  if (fam === 'hex_board') return `claims ${tok}`;
  if (fam === 'card_table') return label;
  return `plays ${tok}`;
}

// Tiny engines for the two engine-free games.
const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function tttWin(b){ for (const l of TTT_LINES) if (b[l[0]] !== '.' && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who:b[l[0]], line:l }; return b.includes('.') ? null : { who:null, line:[] }; }
export function tttMove(b, me){
  const op = me === 'X' ? 'O' : 'X';
  const tryWin = w => { for (let i=0;i<9;i++) if (b[i]==='.'){ const c=[...b]; c[i]=w; if (tttWin(c)?.who===w) return i; } return -1; };
  let i = tryWin(me); if (i>=0) return { i, why:'That completes the line.' };
  i = tryWin(op); if (i>=0) return { i, why:'Blocking. You were one move from three in a row.' };
  if (b[4]==='.') return { i:4, why:'Taking the centre. It touches four lines at once.' };
  const corners=[0,2,6,8].filter(k=>b[k]==='.'); if (corners.length) return { i:corners[0], why:'A corner. It keeps two lines open and forces you to respond.' };
  const any=[...b].findIndex(c=>c==='.'); return { i:any, why:'Only a few squares left. Taking the one that avoids a loss.' };
}
export function c4Drop(b, col){ for (let r=5;r>=0;r--) if (b[r*7+col]==='.') return r*7+col; return -1; }
const C4W = (()=>{ const w=[]; for(let r=0;r<6;r++)for(let c=0;c<7;c++){const i=r*7+c; if(c<=3)w.push([i,i+1,i+2,i+3]); if(r<=2)w.push([i,i+7,i+14,i+21]); if(r<=2&&c<=3)w.push([i,i+8,i+16,i+24]); if(r<=2&&c>=3)w.push([i,i+6,i+12,i+18]);} return w; })();
export function c4Win(b){ for (const w of C4W){ const f=b[w[0]]; if (f!=='.' && w.every(i=>b[i]===f)) return { who:f, line:w }; } return b.includes('.') ? null : { who:null, line:[] }; }
export function c4Move(b, me){
  const op = me === 'R' ? 'Y' : 'R', order=[3,4,2,5,1,6,0];
  const tryWin = w => { for (const c of order){ const i=c4Drop(b,c); if (i<0) continue; const t=[...b]; t[i]=w; if (c4Win(t)?.who===w) return c; } return -1; };
  let c = tryWin(me); if (c>=0) return { c, why:'Four in a row. That column finishes it.' };
  c = tryWin(op); if (c>=0) return { c, why:'Blocking. You had three in a line pointing at that column.' };
  for (const k of order){ const i=c4Drop(b,k); if (i<0) continue; const t=[...b]; t[i]=me; let bad=false; for (const q of order){ const j=c4Drop(t,q); if (j<0) continue; t[j]=op; if (c4Win(t)?.who===op) bad=true; t[j]='.'; if (bad) break; } if (!bad) return { c:k, why: k===3 ? 'Centre column. Most of the winning windows pass through it.' : `Column ${'abcdefg'[k]}. It builds toward the centre without handing you a reply.` }; }
  c = order.find(k=>c4Drop(b,k)>=0); return { c, why:'Every column gives something away. Taking the least costly one.' };
}

export { D, R };
