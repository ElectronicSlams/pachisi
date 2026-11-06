import { ImageResponse } from "next/og";
import { SharePublicReadout } from "./share-public-readout";
import { ShareChessPiece } from "./share-chess-piece";
import palette from "./share-image-tokens.generated.json";
import type { BoardFrame } from "@/lib/stadium/board";
import type { ReplayShareFrame } from "./terminal-frame";
/** No usernames, private hands or arbitrary remote assets are included in public link previews. */
export function renderMatchShareImage({game,matchup,frame,turn,surface}:{game:string;matchup:string;frame:ReplayShareFrame|null;turn:number|null;surface:string}) {
  const cells = frame?.kind === "cells" ? frame : null;
  const cellSize = cells ? Math.min(430/cells.cols,430/cells.rows) : 0;
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",background:palette["surface"],color:palette["text"],padding:64,alignItems:"center",justifyContent:"space-between"}}>
    <div style={{display:"flex",flexDirection:"column",width:530,height:"100%",justifyContent:"space-between"}}><div style={{display:"flex",color:palette["accent"],fontSize:32,fontWeight:700}}>eSlams</div><div style={{display:"flex",flexDirection:"column",gap:24}}><div style={{display:"flex",fontSize:48,fontWeight:700}}>{game}</div><div style={{display:"flex",fontSize:26,color:palette["text-2"]}}>{matchup}</div></div><div style={{display:"flex",fontSize:20,color:palette["text-3"]}}>{surface} · {turn === null ? "Match replay" : `Replay step ${turn}`} · eslams.com</div></div>
    <div style={{display:"flex",width:430,height:430,alignItems:"center",justifyContent:"center",background:cells ? palette["surface"] : palette["surface-2"]}}>{cells ? <ShareBoard cells={cells} cellSize={cellSize} /> : frame?.kind === "public-state" ? <SharePublicReadout frame={frame} /> : <div style={{display:"flex",fontSize:24,color:palette["text-2"]}}>Watch the recorded match</div>}</div>
  </div>,{width:1200,height:630,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}

/**
 * Satori (next/og) rejects SVG <text> nodes and throws, which turned every
 * letter-token board (tic-tac-toe, hex, ultimate tic-tac-toe) into a Worker
 * 1101 error. The board is drawn with flex boxes so tokens are plain text.
 */
function ShareBoard({cells,cellSize}:{cells:Extract<BoardFrame,{kind:"cells"}>;cellSize:number}) {
  const circle=cells.family === "connect_four" || cells.family === "go_board" || cells.family === "hex_board" || (cells.family === "square_board" && !cells.chess);
  const rows=Array.from({length:cells.rows},(_,row)=>cells.cells.slice(row*cells.cols,(row+1)*cells.cols));
  return <div style={{display:"flex",flexDirection:"column"}}>{rows.map((row,rowIndex)=><div key={`row-${rowIndex}`} style={{display:"flex"}}>{row.map((token,colIndex)=>{
    const dark=cells.chess && (rowIndex+colIndex)%2 === 1;
    return <div key={`cell-${rowIndex}-${colIndex}`} style={{display:"flex",alignItems:"center",justifyContent:"center",width:cellSize-2,height:cellSize-2,margin:1,borderRadius:circle?cellSize/2:2,background:dark?palette["board-dark"]:palette["board-bg"],border:`1px solid ${palette["board-line"]}`}}>{token === "." || token === "" ? null : circle
      ? <div style={{display:"flex",width:cellSize*.7,height:cellSize*.7,borderRadius:cellSize,background:token === "R" ? palette["accent"] : token === "B" ? palette["stone-black"] : palette["stone-white"],border:`2px solid ${palette["text-2"]}`}} />
      : <div style={{display:"flex",fontSize:Math.max(8,Math.round(cellSize*.55)),fontWeight:700,color:palette["text"],lineHeight:1}}>{cells.chess ? <ShareChessPiece token={token} size={cellSize*.8} /> : token}</div>}</div>;
  })}</div>)}</div>;
}
