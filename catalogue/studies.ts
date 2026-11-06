import { GAME_DEMONSTRATIONS, type Demonstration, type DemonstrationFrame } from '../src/game/demos';

export type Study = { readonly id: string; readonly game: string; readonly name: string; readonly note: string; readonly demo: Demonstration };
const studies: Study[] = [];
const matrix = (rows: number, cols = rows): (string | null)[][] => Array.from({length: rows}, () => Array(cols).fill(null));
const state = (game: string) => structuredClone(GAME_DEMONSTRATIONS[game]!.frames[0]!.state) as Record<string, any>;
function add(game: string, id: string, name: string, note: string, states: readonly Record<string, unknown>[], captions: readonly string[] = [], terminal = false) {
 const frames: DemonstrationFrame[] = states.map((s,i) => ({state:s,caption:captions[i] ?? name,turn:i,terminal:terminal && i === states.length-1,...(terminal && i === states.length-1 ? {outcomeReason:'study_complete'} : {})}));
 studies.push({game,id,name,note,demo:{version:`authored:${id}`,delay:900,frames,actions:frames.slice(1).map(f=>({player:'study',action:f.caption}))}});
}
for (const size of [9,13,19]) {
 const b=matrix(size); b[2]![2]='B'; b[2]![size-3]='W'; b[size-3]![2]='W'; b[size-3]![size-3]='B'; b[Math.floor(size/2)]![Math.floor(size/2)]='B';
 add('go',`go-${size}`,`${size}×${size} intersections`,'Authored geometry study. Board size is supported; scoring and ko are host owned.',[{board:b}]);
}
{
 const b=matrix(9);b[1]![1]='W';b[0]![1]='B';b[1]![0]='B';b[2]![1]='B';const a=structuredClone(b);a[1]![2]='B';a[1]![1]=null;
 add('go','go-capture','Single-stone capture','Only the placed stone receives the last-move cue; the captured stone disappears.',[{board:b},{board:a}],['White has one liberty','Black fills the final liberty']);
}
for (const size of [7,13]) { const b=matrix(size);b[0]![2]='B';b[1]![2]='B';b[2]![2]='B';b[3]![1]='W';add('hex',`hex-${size}`,`${size}×${size} Hex`,'Core B is the first seat, drawn in accent; W is the second seat.',[{board:b}]); }
{
 const b=matrix(8,9);b[7]![4]='R';b[6]![4]='Y';const a=structuredClone(b);a[5]![4]='R';
 add('connect-four','gravity-large','8×9 gravity board','Alternate geometry, same four-in-a-row cue. This does not add an engine variant.',[{board:b},{board:a}],['Column four has two discs','Third disc settles above them']);
}
add('tic-tac-toe','ttt-win','Win versus draw','Terminal line study, complementing the bundled draw.',[{board:['X','X',null,'O','O',null,null,null,null]},{board:['X','X','X','O','O',null,null,null,null]}],['X to complete the row','X completes three'],true);
{
 const b=matrix(15);for(let i=0;i<4;i++){b[7]![i+4]='B';b[8]![i+4]='W';} const a=structuredClone(b);a[7]![8]='B';
 add('gomoku','gomoku-five','Terminal five','Terminal win markers must include all five intersections.',[{board:b},{board:a}],['Black has four','Black completes five'],true);
}
{
 const b=matrix(6);b[2]![2]='W';b[2]![3]='B';b[3]![2]='B';b[3]![3]='W';const a=structuredClone(b);a[1]![2]='B';a[2]![2]='B';
 add('othello','othello-six','6×6 placement and flip','Size study; placement cue excludes the flipped disc.',[{board:b},{board:a}],['Six-square opening','Black places and flips']);
}
for (const [id,name,before,after] of [
 ['castle','Kingside castling','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1'],
 ['en-passant','En passant','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2','4k3/8/3P4/8/8/8/8/4K3 b - - 0 2'],
 ['promotion','Promotion','4k3/P7/8/8/8/8/8/4K3 w - - 0 1','Q3k3/8/8/8/8/8/8/4K3 b - - 0 1'],
]) add('chess',`chess-${id}`,name,'Authored before/after position. Inspect the changed pieces; legality is not inferred by the renderer.',[{fen:before},{fen:after}],[`Before ${name.toLowerCase()}`,name]);
{
 const b=matrix(10);b[2]![3]='B';b[7]![4]='R';b[6]![5]='r';add('checkers','checkers-ten','10×10 kings','International-size layout only; no international draughts engine is added.',[{board:b}]);
 const s=state('shogi');s.board[2][4]='+P';s.hands.player_1={P:2,S:1};add('shogi','shogi-hands','Promotion and captured pieces','Promoted glyph and reserve-count legibility study.',[s]);
}
{
 const s=state('ultimate-tic-tac-toe');s.boards[0]=['X','X','X','O','O',null,null,null,null];s.local_status=['X',null,null,null,null,null,null,null,null];s.next_board=8;
 add('ultimate-tic-tac-toe','uttt-won','Decided board and forced destination','Board zero is won; the next target is board eight.',[s]);
}
{
 const s=state('battleship');s.grid_size=10;s.shots={player_1:[{cell:'0,0',hit:false},{cell:'9,9',hit:true}],player_2:[{cell:'4,5',hit:true}]};
 add('battleship','battleship-ten','10×10 public shot grids','No ship coordinates are supplied or inferred.',[s]);
 const b=Array(24).fill(null);for(const [i,n] of [[0,2],[11,5],[16,3],[18,5]])b[i]={player:'player_1',count:n};for(const [i,n] of [[23,2],[12,5],[7,3],[5,5]])b[i]={player:'player_2',count:n};
 add('backgammon','backgammon-fifteen','15-checker opening','Standard-size position, separate from the compact five-checker trace.',[{board:b,dice:[6,2],bar:{player_1:0,player_2:0},borne_off:{player_1:0,player_2:0},active_player:'player_1'}]);
}
{
 const s=state('mahjong');s.discard_pile=Array.from({length:12},(_,i)=>({player:`player_${i%4+1}`,tile:`${i%9+1}m`}));
 add('mahjong','mahjong-long','Long discard history','Shows the latest seven with an explicit earlier/total count.',[s]);
 const d=state('dou-dizhu');d.last_play={player:d.landlord,cards:['3C','3D','3H','4C','4D','4H','5C','5D','5H','6C']};
 add('dou-dizhu','doudizhu-long','Long public combination','Overflow must be disclosed, never silently dropped. Combination legality is not certified.',[d]);
 for(const game of ['leduc-holdem','limit-texas-holdem','no-limit-texas-holdem']){const p=state(game);p.folded=['player_2'];p.dealer='player_4';add(game,`${game}-fold`,'Fold and dealer markers','Authored public table snapshot; no hole cards or private strategy are supplied.',[p]);}
}
for(const size of [8,20]) {
 const grid=Array.from({length:size},()=>Array(size===20?3:size).fill('F'));grid[0]![0]='S';grid.at(-1)![grid[0]!.length-1]='G';grid[2]![1]='H';
 add('frozen-lake',`lake-${size}`,size===20?'Tall map stress test':'8×8 lake','Geometry study; stochastic/slippery transitions are not simulated.',[{grid,position:[0,0],goal:[size-1,grid[0]!.length-1]}]);
}
{
 const s=state('cartpole');s.cart.x=2.35;s.pole.angle=.20;add('cartpole','cartpole-edge','Near terminal bounds','Geometry at the cart and pole-angle limits; this is a static position.',[s]);
 add('mountain-car','mountain-slope','Slope contacts','Three independent slope positions; these are not consecutive physics steps.',[-1.1,-.5,.5].map(position=>({position,velocity:0,goal_position:.5})));
 const l=state('lunar-lander');l.lander={...l.lander,x:0,y:0,angle:0,vx:0,vy:0};l.fuel=50;add('lunar-lander','lander-contact','Landing contact','Level legs meet the ground and the terminal engine is off.',[l],['Level touchdown'],true);
 const c=state('car-racing');c.track_window=[.12,.1,0];c.car.lane=0;add('car-racing','car-bend','Curved-road alignment','Centerline dashes and car use the same road transform.',[c]);
 const w=state('bipedal-walker');w.terrain_window=[-.5,.5,-.5,.5,-.5];add('bipedal-walker','walker-slope','Feet on uneven terrain','Foot y is sampled at its actual x, for both step phases.',[w,{...w,walker:{...w.walker,next_foot:'right'}}]);
 const p=state('paddle-ball');add('paddle-ball','paddle-contacts','Wall and paddle contacts','Independent boundary positions, not a simulated trajectory.',[{...p,ball:{...p.ball,x:0,y:.5}},{...p,ball:{...p.ball,x:1,y:1}},{...p,paddle_x:.5,ball:{...p.ball,x:.5,y:.08}}]);
 const a=state('alien-shooter');a.player_x=7;a.aliens=[[0,6],[7,6],[7,0]];a.bullets=[[7,4]];add('alien-shooter','shooter-edges','All eight columns','The last column and highest row must stay inside the canvas.',[a]);
 const h=state('ice-hockey-style-arena');h.positions.player_2={...h.positions.player_1};add('ice-hockey-style-arena','hockey-shared','Shared cell and possession','Both seats share the exact world coordinate; each retains a visible half-disc.',[h,{...h,puck_owner:'player_2'}]);
}
export const GAME_STUDIES: readonly Study[] = studies;
export function studiesFor(game: string) { return GAME_STUDIES.filter(s=>s.game===game); }
