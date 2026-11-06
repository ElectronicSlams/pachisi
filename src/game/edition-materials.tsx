import {useId, type CSSProperties, type ReactNode} from 'react';
import {designFamily, type GameDesignId} from './designs';

type MaterialProps={game:string; design:GameDesignId; children:ReactNode};
export function EditionField({game, design, children}:MaterialProps) {
  const id='look'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const family=designFamily(game);
  const paper=design==='design-3', wood=family==='wood', felt=family==='felt';
  const ground=paper?'#f7eedb':wood?'#d6aa6c':felt?'#165943':'#072930';
  const stroke=paper?'#504632':wood?'#845227':felt?'#34735b':'#26616a';
  const pattern=paper?'paper':wood?'grain':felt?'cloth':'screen';
  const paint={ '--ed-tile':`url(#${id}-tile)`, '--ed-piece':`url(#${id}-piece)` } as CSSProperties;
  return <g className={`st-ed-field st-ed-${family} ${paper?'st-ed-print':'st-ed-crafted'}`} style={paint}>
    <defs>
      <pattern id={id+'-base'} width={pattern==='grain'?64:16} height={pattern==='cloth'?6:16} patternUnits="userSpaceOnUse">
        <rect width="100%" height="100%" fill={ground} stroke="none"/>
        <path style={{fill:'none',stroke,strokeWidth:pattern==='grain'?0.8:0.45,opacity:paper?0.42:0.6}} d={pattern==='grain'?'M-1 5Q18 0 36 5T67 5M-1 12Q25 6 49 11T70 10':pattern==='cloth'?'M0 0L8 8M-3 3L0 6M0 4L4 0':pattern==='paper'?'M0 15.7H16M.3 0V16':'M0 0H16V16M0 4H16M0 8H16M0 12H16'}/>
      </pattern>
      <pattern id={id+'-tile'} width="9" height="9" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" stroke="none" fill={paper?'#f0dfb9':wood?'#e0bc84':felt?'#186a50':'#104049'}/>
        <path d={paper?'M0 9L9 0M-2 2L2 -2':wood?'M0 5Q4 3 9 5':'M0 8H9'} style={{fill:'none',stroke,strokeWidth:.5,opacity:.7}}/>
      </pattern>
      <radialGradient id={id+'-piece'} cx="32%" cy="25%" r="80%">
        <stop stopColor={paper?'#4c463b':wood?'#f8e5b8':'#a9ffe3'}/><stop offset="1" stopColor={paper?'#2b2927':wood?'#9c692f':'#29aaa5'}/>
      </radialGradient>
    </defs>
    <g aria-hidden="true" data-edition-art={pattern}>
      <rect x="0" y="0" width="320" height="240" rx={paper?1:9} style={{fill:`url(#${id}-base)`,stroke:'none'}}/>
      <path d="M4 14V4H14M306 4H316V14M316 226V236H306M14 236H4V226" style={{stroke:paper?'#854d34':'#99b988',fill:'none',strokeWidth:1.2}}/>
    </g>
    {children}
  </g>;
}
