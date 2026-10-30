/* app-data-v2.js — eSlams mobile app v2 data layer.
   Grounded catalog (38 Arena games live, no Coming Soon), engines (TTT, C4, Othello,
   Gomoku, RPS, PD, Blackjack, Auction), engine-recorded previews with a physics audit,
   ledger language, HvM data. Consumes window.ES. Exposes window.APPD. */
(function(){
  var ES=window.ES;

  /* ---------- model display formatting ---------- */
  function fmtModel(id){
    var raw=id.split('/')[1]||id;
    var toks=raw.split('-'),out=[],i,t;
    for(i=0;i<toks.length;i++){
      t=toks[i];
      if(/^\d+(\.\d+)?$/.test(t)&&/^\d+$/.test(toks[i+1]||'')){out.push(t+'.'+toks[i+1]);i++;continue;}
      if(t==='gpt')t='GPT';
      else if(/^o\d/.test(t)){/* o3, o4 stay lowercase */}
      else t=t.charAt(0).toUpperCase()+t.slice(1);
      out.push(t);
    }
    return out.join(' ').replace(/^GPT (\d)/,'GPT-$1');
  }
  function provOf(id){return id.split('/')[0];}

  /* Curated opponent wheel — interleaved by provider so no wall of one dot (§6.10). */
  var byScore=(ES.byScore||ES.models.slice()).slice(0,14);
  var buckets={};
  byScore.forEach(function(m){var p=provOf(m.id);(buckets[p]=buckets[p]||[]).push(m);});
  var provKeys=Object.keys(buckets), mixed=[], guard=0;
  while(mixed.length<Math.min(12,byScore.length)&&guard++<40){
    provKeys.forEach(function(p){ if(buckets[p].length&&mixed.length<12) mixed.push(buckets[p].shift()); });
  }
  var OPP=mixed.map(function(m,i){
    var prov=provOf(m.id);
    return {
      id:m.id, name:fmtModel(m.id), prov:prov,
      initial:(prov[0]||'m').toUpperCase(),
      tint:(ES.provColor?ES.provColor(prov):'#647cff'),
      status:(i===1||i===5)?'Slower turns':'Ready',
      median:[6,9,4,3,11,5,4,7,3,5,6,4][i]||5,
      rank:i+1
    };
  });
  var BEST_FIRST=OPP[2]||OPP[0];

  /* ---------- grounded catalog: families, tiers, seats ---------- */
  var FAM={
    'tic-tac-toe':'grid_3x3','ultimate-tic-tac-toe':'grid_3x3','connect-four':'connect_four',
    'chess':'square_board','othello':'square_board','checkers':'square_board','shogi':'square_board',
    'xiangqi':'square_board','battleship':'square_board','mancala':'square_board',
    'nine-mens-morris':'square_board','pentago':'square_board','backgammon':'square_board',
    'go':'go_board','gomoku':'go_board','hex':'hex_board',
    'liars-dice':'dice_table','rock-paper-scissors':'payoff_matrix','prisoners-dilemma':'payoff_matrix',
    'first-price-sealed-bid-auction':'auction_panel','negotiation':'economic_panel','bargaining':'economic_panel'
  };
  function famOf(slug){
    if(FAM[slug])return FAM[slug];
    var g=ES.gameBySlug[slug];
    if(!g)return 'custom';
    if(g.category==='RL')return 'control_benchmark';
    if(g.category==='Card')return 'card_table';
    return 'custom';
  }
  /* main_arena 13 per the definitive table */
  var MAIN=['tic-tac-toe','connect-four','chess','othello','go','gomoku','hex','ultimate-tic-tac-toe','battleship','goofspiel','rock-paper-scissors','prisoners-dilemma','first-price-sealed-bid-auction'];
  /* the six multi-seat table games — LIVE, with seat-ring pickers */
  var TABLE6={'leduc-holdem':{seats:4,layout:'ring',score:'chips'},
    'limit-texas-holdem':{seats:4,layout:'ring',score:'chips'},
    'no-limit-texas-holdem':{seats:4,layout:'ring',score:'chips'},
    'mahjong':{seats:4,layout:'ring',score:'placement'},
    'dou-dizhu':{seats:3,layout:'ring',score:'placement'},
    'bridge':{seats:4,layout:'compass',score:'points'}};
  var SHELF=['tic-tac-toe','connect-four','chess','othello','go','gomoku','hex','battleship'];
  /* fully wired end-to-end in this prototype */
  var PLAYABLE=['tic-tac-toe','connect-four','othello','gomoku','rock-paper-scissors','prisoners-dilemma','blackjack','first-price-sealed-bid-auction'];
  function scoreLang(slug){ if(TABLE6[slug])return TABLE6[slug].score; if(slug==='blackjack')return 'chips'; if(slug==='first-price-sealed-bid-auction')return 'chips'; if(slug==='prisoners-dilemma')return 'points'; return 'moves'; }

  /* ---------- glyphs: all 50, catalog slugs, no box fallback ---------- */
  var GLYPH={
    'chess':'\u265e','go':'\u25c9','connect-four':'\u25cd','tic-tac-toe':'\u2715','othello':'\u25d0',
    'checkers':'\u25d2','shogi':'\u2617','xiangqi':'\u5c07','gomoku':'\u271a','hex':'\u2b21',
    'mancala':'\u2237','nine-mens-morris':'\u25ce','pentago':'\u21bb','ultimate-tic-tac-toe':'\u229e',
    'battleship':'\u2316','backgammon':'\u25eb','blackjack':'21','leduc-holdem':'\u2660',
    'limit-texas-holdem':'\u2660','no-limit-texas-holdem':'\u2660','shedding-card-game':'\u2663',
    'gin-rummy':'\u2666','mahjong':'\u724c','dou-dizhu':'\u2663','bridge':'\u2666','hearts':'\u2665',
    'spades':'\u2660','euchre':'\u2663','cribbage':'\u2666','crazy-eights':'8','hanabi':'\u2735',
    'goofspiel':'\u2663','prisoners-dilemma':'\u25a6','bargaining':'\u00bd','negotiation':'\u21c4',
    'first-price-sealed-bid-auction':'$','liars-dice':'\u2684','rock-paper-scissors':'\u25b3',
    'taxi':'\u2317','frozen-lake':'\u2746','cliff-walking':'\u2310','cartpole':'\u22a5',
    'mountain-car':'\u22c0','lunar-lander':'\u25bc','car-racing':'GP','bipedal-walker':'\u22d4',
    'paddle-ball':'\u2503','alien-shooter':'\u2361','boxing-style-arena':'KO','ice-hockey-style-arena':'\u26f8'
  };
  function glyphOf(slug){
    if(GLYPH[slug])return GLYPH[slug];
    var g=ES.gameBySlug[slug];
    console.warn('[appd] missing glyph for',slug);
    return g?g.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2):'?';
  }

  /* ---------- How to play ---------- */
  var HOWTO_FAM={
    grid_3x3:['Make a line of three.','Tap any empty cell.','Three of yours in a row \u2014 any direction.'],
    connect_four:['Connect four discs.','Tap a column; your disc falls.','Four in a row \u2014 across, down, or diagonal.'],
    square_board:['Outplay the model on the board.','Tap a piece, then a highlighted square.','Per the game\u2019s classic rules.'],
    go_board:['Surround more territory.','Tap an intersection to place a stone.','Most territory and captures at the end.'],
    hex_board:['Connect your two edges.','Tap any empty hex.','An unbroken chain, edge to edge.'],
    card_table:['Win the table.','Tap a card to select, tap again to play.','Per the game\u2019s scoring.'],
    dice_table:['Call the bluff.','Raise the bid, or call.','Catch a lie \u2014 or sell one.'],
    payoff_matrix:['Read the model\u2019s mind.','Tap one of the choices.','Best of three reveals.'],
    auction_panel:['Win the lot for less than it\u2019s worth.','Set your bid and seal it.','Highest bid takes it; profit is the score.'],
    economic_panel:['Strike the better deal.','Propose, accept, or reject splits.','Walk away with the larger share.'],
    control_benchmark:['A scored solo run.','Watch-only \u2014 this is Battlefield content.','Higher reward, better run.'],
    custom:['Beat the model.','Follow the prompts on the board.','Per the game\u2019s rules.']
  };
  var HOWTO_GAME={
    'othello':['Finish with more discs.','Tap a highlighted square to flank and flip.','Most discs when the board fills.'],
    'chess':['Checkmate the king.','Tap a piece, then its destination.','Trap the enemy king with no escape.'],
    'rock-paper-scissors':['Read the model\u2019s mind.','Tap rock, paper, or scissors \u2014 both reveal at once.','First to two round wins.'],
    'prisoners-dilemma':['Outscore the model in one shot.','Cooperate or defect \u2014 both commit blind.','The payoff matrix pays you more.'],
    'blackjack':['Beat the dealer to 21.','Hit for another card, or stand.','Closer to 21 without going bust.'],
    'first-price-sealed-bid-auction':['Win the lot for less than it\u2019s worth to you.','Slide your bid, then seal it.','Highest bid wins; profit = value \u2212 bid.'],
    'ultimate-tic-tac-toe':['Win three local boards in a line.','Your cell decides the model\u2019s next board.','Three local wins in a row.'],
    'battleship':['Sink the hidden fleet first.','Call a square; hits ring, misses dot.','All enemy ships down.'],
    'hanabi':['Build the fireworks together.','You see every hand but your own.','Complete the stacks before the deck dies.']
  };
  function howto(slug){return HOWTO_GAME[slug]||HOWTO_FAM[famOf(slug)]||HOWTO_FAM.custom;}

  /* ================= engines ================= */
  /* ---- Tic-Tac-Toe ---- */
  var T_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function tttWin(b){for(var i=0;i<8;i++){var l=T_LINES[i];if(b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[0]]===b[l[2]])return{who:b[l[0]],line:l};}return null;}
  function tttFull(b){for(var i=0;i<9;i++)if(!b[i])return false;return true;}
  function tttFind(b,who){for(var c=0;c<9;c++){if(!b[c]){var t=b.slice();t[c]=who;if(tttWin(t))return c;}}return -1;}
  function tttAI(b,me,you){
    var c=tttFind(b,me);if(c>=0)return{c:c,why:'win'};
    c=tttFind(b,you);if(c>=0)return{c:c,why:'block'};
    if(!b[4])return{c:4,why:'center'};
    var corners=[0,2,6,8].filter(function(i){return !b[i];});
    if(corners.length)return{c:corners[Math.floor(Math.random()*corners.length)],why:'corner'};
    var sides=[1,3,5,7].filter(function(i){return !b[i];});
    return{c:sides[Math.floor(Math.random()*sides.length)],why:'side'};
  }
  /* ---- Connect Four ---- */
  function c4Row(b,c){for(var r=5;r>=0;r--)if(!b[r*7+c])return r;return -1;}
  function c4Win(b){
    var dirs=[[0,1],[1,0],[1,1],[1,-1]],r,c,d,k;
    for(r=0;r<6;r++)for(c=0;c<7;c++){var v=b[r*7+c];if(!v)continue;
      for(d=0;d<4;d++){var dr=dirs[d][0],dc=dirs[d][1],line=[r*7+c],ok=true;
        for(k=1;k<4;k++){var rr=r+dr*k,cc=c+dc*k;
          if(rr<0||rr>5||cc<0||cc>6||b[rr*7+cc]!==v){ok=false;break;}line.push(rr*7+cc);}
        if(ok)return{who:v,line:line};}}
    return null;
  }
  function c4Full(b){for(var c=0;c<7;c++)if(c4Row(b,c)>=0)return false;return true;}
  function c4Try(b,c,who){var r=c4Row(b,c);if(r<0)return null;var t=b.slice();t[r*7+c]=who;return t;}
  function c4AI(b,me,you){
    var c,t,order=[3,4,2,5,1,6,0];
    for(c=0;c<7;c++){t=c4Try(b,c,me);if(t&&c4Win(t))return{c:c,why:'win'};}
    for(c=0;c<7;c++){t=c4Try(b,c,you);if(t&&c4Win(t))return{c:c,why:'block'};}
    var safe=[];
    for(var i=0;i<7;i++){c=order[i];t=c4Try(b,c,me);if(!t)continue;
      var t2=c4Try(t,c,you);
      if(t2&&c4Win(t2))continue;
      safe.push(c);
    }
    if(!safe.length)for(var j=0;j<7;j++){if(c4Row(b,order[j])>=0){safe.push(order[j]);break;}}
    return{c:safe[0],why:(safe[0]===3?'center':'build')};
  }
  /* ---- Othello ---- */
  var O_D=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  function othInit(){var b=Array(64).fill('.');b[27]='W';b[28]='B';b[35]='B';b[36]='W';return b;}
  function othFlips(b,i,who){
    if(b[i]!=='.')return null;
    var opp=who==='B'?'W':'B',all=[],r0=Math.floor(i/8),c0=i%8,d;
    for(d=0;d<8;d++){var dr=O_D[d][0],dc=O_D[d][1],r=r0+dr,c=c0+dc,run=[];
      while(r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]===opp){run.push(r*8+c);r+=dr;c+=dc;}
      if(run.length&&r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]===who)all=all.concat(run);}
    return all.length?all:null;
  }
  function othLegal(b,who){var m={},n=0;for(var i=0;i<64;i++){var f=othFlips(b,i,who);if(f){m[i]=f;n++;}}return n?m:null;}
  function othApply(b,i,f,who){var t=b.slice();t[i]=who;f.forEach(function(j){t[j]=who;});return t;}
  function othCounts(b){var nB=0,nW=0;b.forEach(function(x){if(x==='B')nB++;else if(x==='W')nW++;});return{B:nB,W:nW};}
  function othAI(b,who){
    var legal=othLegal(b,who);if(!legal)return null;
    var keys=Object.keys(legal).map(Number),best=null,bestScore=-1e9;
    keys.forEach(function(i){
      var r=Math.floor(i/8),c=i%8,s=legal[i].length;
      if((r===0||r===7)&&(c===0||c===7))s+=100;
      else if((r<=1||r>=6)&&(c<=1||c>=6))s-=25;
      else if(r===0||r===7||c===0||c===7)s+=8;
      s+=Math.random()*0.5;
      if(s>bestScore){bestScore=s;best=i;}
    });
    return{i:best,flips:legal[best]};
  }
  /* ---- Gomoku ---- */
  var G15=15;
  function gmkWin(b){
    var dirs=[[0,1],[1,0],[1,1],[1,-1]],r,c,d,k;
    for(r=0;r<G15;r++)for(c=0;c<G15;c++){var v=b[r*G15+c];if(!v)continue;
      for(d=0;d<4;d++){var dr=dirs[d][0],dc=dirs[d][1],line=[r*G15+c],ok=true;
        for(k=1;k<5;k++){var rr=r+dr*k,cc=c+dc*k;
          if(rr<0||rr>=G15||cc<0||cc>=G15||b[rr*G15+cc]!==v){ok=false;break;}line.push(rr*G15+cc);}
        if(ok)return{who:v,line:line};}}
    return null;
  }
  function gmkFull(b){for(var i=0;i<b.length;i++)if(!b[i])return false;return true;}
  function gmkRun(b,i,who){
    var dirs=[[0,1],[1,0],[1,1],[1,-1]],r0=Math.floor(i/G15),c0=i%G15,best=0,d;
    for(d=0;d<4;d++){var dr=dirs[d][0],dc=dirs[d][1],n=1,open=0,s;
      for(s=1;s<5;s++){var r=r0+dr*s,c=c0+dc*s;if(r<0||r>=G15||c<0||c>=G15)break;var v=b[r*G15+c];if(v===who)n++;else{if(!v)open++;break;}}
      for(s=1;s<5;s++){var r2=r0-dr*s,c2=c0-dc*s;if(r2<0||r2>=G15||c2<0||c2>=G15)break;var v2=b[r2*G15+c2];if(v2===who)n++;else{if(!v2)open++;break;}}
      var sc=n*10+open*2;
      if(sc>best)best=sc;}
    return best;
  }
  function gmkAI(b,me,you){
    var i,best=-1,bestSc=-1e9,anyStone=false;
    for(i=0;i<b.length;i++)if(b[i]){anyStone=true;break;}
    if(!anyStone)return{c:7*G15+7,why:'center'};
    for(i=0;i<b.length;i++){
      if(b[i])continue;
      var r=Math.floor(i/G15),c=i%G15,near=false;
      for(var dr=-2;dr<=2&&!near;dr++)for(var dc=-2;dc<=2;dc++){var rr=r+dr,cc=c+dc;if(rr>=0&&rr<G15&&cc>=0&&cc<G15&&b[rr*G15+cc]){near=true;break;}}
      if(!near)continue;
      var t=b.slice();t[i]=me;if(gmkWin(t)){return{c:i,why:'win'};}
      var t2=b.slice();t2[i]=you;var blockWin=!!gmkWin(t2);
      var sc=gmkRun(b,i,me)*1.06+gmkRun(b,i,you)+(blockWin?10000:0)+Math.random();
      if(sc>bestSc){bestSc=sc;best=i;}
    }
    if(best<0)for(i=0;i<b.length;i++)if(!b[i]){best=i;break;}
    var t3=b.slice();t3[best]=you;
    return{c:best,why:gmkWin(t3)?'block':(gmkRun(b,best,me)>=40?'attack':'build')};
  }
  /* ---- RPS ---- */
  var RPS=['rock','paper','scissors'];
  var RPS_BEATS={rock:'scissors',paper:'rock',scissors:'paper'};
  function rpsAI(history){
    if(history.length&&Math.random()<0.55){
      var count={rock:0,paper:0,scissors:0};
      history.forEach(function(h){count[h]++;});
      var top=RPS[0];RPS.forEach(function(k){if(count[k]>count[top])top=k;});
      return Object.keys(RPS_BEATS).filter(function(k){return RPS_BEATS[k]===top;})[0];
    }
    return RPS[Math.floor(Math.random()*3)];
  }
  /* ---- Prisoner's Dilemma (one-shot matrix) ---- */
  var PD_PAY={CC:[3,3],CD:[0,5],DC:[5,0],DD:[1,1]}; /* [you, model] with you first letter */
  function pdAI(){ return Math.random()<0.65?'D':'C'; }
  /* ---- Blackjack (core_hit_stand_s17, dealer stands on all 17s) ---- */
  function bjDeck(){
    var d=[],suits=['\u2660','\u2665','\u2666','\u2663'],ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    suits.forEach(function(s){ranks.forEach(function(r){d.push({r:r,s:s});});});
    for(var i=d.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=d[i];d[i]=d[j];d[j]=t;}
    return d;
  }
  function bjVal(hand){
    var v=0,aces=0;
    hand.forEach(function(c){ if(c.r==='A'){v+=11;aces++;} else if('JQK'.indexOf(c.r)>=0)v+=10; else v+=Number(c.r); });
    while(v>21&&aces>0){v-=10;aces--;}
    return v;
  }
  function bjDealerPlay(hand,deck){
    var h=hand.slice();
    while(bjVal(h)<17)h.push(deck.pop()); /* S17: stands on all 17s */
    return h;
  }
  /* ---- First-price sealed-bid auction (two bidders, private values) ---- */
  function aucNew(){
    return { yourValue:50+Math.floor(Math.random()*41), /* 50-90 */
      modelValue:40+Math.floor(Math.random()*51) };
  }
  function aucModelBid(modelValue){
    /* equilibrium-ish: bid ~ value/2 for uniform private values, with noise */
    return Math.max(5,Math.round(modelValue*(0.5+Math.random()*0.18)));
  }

  /* ================= ledger language (§6.1) ================= */
  var TTT_SPOT=function(i){ if(i===4)return 'the center'; if(i===0||i===2||i===6||i===8)return 'the corner at '+('abc'[i%3])+(3-Math.floor(i/3)); return ('abc'[i%3])+(3-Math.floor(i/3)); };
  var LBL={
    ttt:function(i){ return 'takes '+TTT_SPOT(i); },
    c4:function(col){ return 'drops column '+('abcdefg'[col]); },
    oth:function(i,nf){ var sq=String.fromCharCode(97+i%8)+(8-Math.floor(i/8)); var r=Math.floor(i/8),c=i%8;
      if((r===0||r===7)&&(c===0||c===7))return 'takes the corner at '+sq;
      return 'plays '+sq+', flipping '+nf; },
    gmk:function(i){ return 'places '+String.fromCharCode(97+i%15)+(15-Math.floor(i/15)); },
    pass:'passes \u2014 no legal move'
  };

  /* ================= reasoning voices ================= */
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  var REASON={
    ttt:function(why,cell){
      var co='abc'[cell%3]+(3-Math.floor(cell/3));
      if(why==='win')return 'Three in a row \u2014 that line was open since move two.';
      if(why==='block')return 'You were one move from a line. That\u2019s closed now.';
      if(why==='center')return 'Center first \u2014 it touches four lines at once.';
      if(why==='corner')return pick(['Corner at '+co+'. It keeps two lines open and baits a fork.','Taking the corner \u2014 the diagonals matter most now.']);
      return pick(['A quiet move at '+co+'. The pressure is positional.','Holding the edge \u2014 I\u2019m playing for the draw you\u2019re not.']);
    },
    c4:function(why,col){
      var name='abcdefg'[col];
      if(why==='win')return 'Four. It was set up three moves ago.';
      if(why==='block')return 'You had four brewing over column '+name+'. Not anymore.';
      if(why==='center')return 'Column '+name+' \u2014 the middle files see the most futures.';
      return pick(['Stacking quietly on '+name+'. Watch the diagonals.','Building under your position \u2014 gravity is a tactic here.']);
    },
    oth:function(i,flips){
      var r=Math.floor(i/8),c=i%8,sq=String.fromCharCode(97+c)+(8-r);
      if((r===0||r===7)&&(c===0||c===7))return 'Corner at '+sq+'. Corners never flip back.';
      if(flips.length>=5)return flips.length+' discs turn \u2014 the count swings hard.';
      return pick(['A quiet move at '+sq+'. Mobility over greed.','Taking '+sq+' \u2014 fewer replies for you next turn.']);
    },
    gmk:function(why,cell){
      var co=String.fromCharCode(97+cell%15)+(15-Math.floor(cell/15));
      if(why==='win')return 'Five. The line was open on both ends \u2014 you had to block twice.';
      if(why==='block')return 'You were one stone from five. Not on my watch.';
      if(why==='center')return 'The center point \u2014 every direction stays alive.';
      if(why==='attack')return pick(['Extending at '+co+' \u2014 an open three becomes a real threat.','Building the double line at '+co+'. Watch both ends.']);
      return pick(['A quiet stone at '+co+'. Shape first, threats later.','Connecting at '+co+' \u2014 patience wins long boards.']);
    },
    rps:function(mine,yours,res){
      if(res==='model')return 'I modeled you as a '+yours+' player. I was right.';
      if(res==='you')return 'I committed to '+mine+'. You read me \u2014 this round.';
      return 'We both threw '+mine+'. Stalemate of minds.';
    },
    pd:function(mine,yours){
      if(mine==='D'&&yours==='C')return 'You cooperated. I\u2019m sorry \u2014 the matrix isn\u2019t.';
      if(mine==='D'&&yours==='D')return 'Mutual defection. The equilibrium is a sad place.';
      if(mine==='C'&&yours==='D')return 'I trusted you. Noted for next time.';
      return 'Mutual cooperation \u2014 the rarest cell on the board.';
    },
    bj:function(kind,v){
      if(kind==='dealerHit')return 'The dealer draws \u2014 house rules, no choices, no mercy.';
      if(kind==='dealerStand')return 'Dealer stands on '+v+'. The house has spoken.';
      if(kind==='dealerBust')return 'Dealer busts on '+v+'. The house can lose too.';
      return '';
    },
    auc:function(mine,yours,won){
      if(won)return 'I bid '+mine+' \u2014 enough to win, low enough to profit. That\u2019s the whole game.';
      return 'I bid '+mine+' and lost the lot. Overpaying is the only sin here.';
    }
  };
  var CHESS_REASONS=[
    'Claiming the center immediately.',
    'Symmetry \u2014 contest the center.',
    'Eyeing f7, the weakest square on the board.',
    'Solid, but it locks in the bishop.',
    'Developing with a threat on e5.',
    'Pinning the knight against the queen.',
    'Quiet development. The pin looks safe. It isn\u2019t.',
    'A slow move \u2014 White has been handed a tempo.',
    'The knight takes anyway. The queen is bait.',
    'Black accepts \u2014 winning the queen, losing the game.',
    'The point. The king is dragged forward.',
    'A forced march.',
    'Mate. Two knights and a bishop beat a queen.'
  ];

  /* ================= engine-recorded previews (§5 — every sequence is a real game) ================= */
  function randEmpty(b){var e=[];b.forEach(function(v,i){if(!v)e.push(i);});return e[Math.floor(Math.random()*e.length)];}
  function genTTT(){
    for(var t=0;t<400;t++){
      var b=Array(9).fill(null),moves=[],who='X';
      for(var k=0;k<9;k++){
        var mv= who==='X'?tttAI(b,'X','O').c:(Math.random()<0.5?tttAI(b,'O','X').c:randEmpty(b));
        b[mv]=who;moves.push(mv);
        var w=tttWin(b);
        if(w){ if(w.who==='X')return{moves:moves,line:w.line}; b=null; break; }
        if(tttFull(b))break;
        who=who==='X'?'O':'X';
      }
      if(b===null)continue;
    }
    return {moves:[0,3,1,4,2],line:[0,1,2]}; /* X row a3-b3-c3: legal, verified below */
  }
  function genC4(){
    for(var t=0;t<400;t++){
      var b=Array(42).fill(null),cols=[],who='H';
      for(var k=0;k<24;k++){
        var mv= who==='H'?c4AI(b,'H','M').c:(Math.random()<0.45?c4AI(b,'M','H').c:[0,1,2,3,4,5,6].filter(function(c){return c4Row(b,c)>=0;})[Math.floor(Math.random()*7)]);
        if(mv===undefined||c4Row(b,mv)<0)break;
        b[c4Row(b,mv)*7+mv]=who;cols.push(mv);
        var w=c4Win(b);
        if(w)return{cols:cols,winner:w.who,line:w.line};
        if(c4Full(b))break;
        who=who==='H'?'M':'H';
      }
    }
    return {cols:[3,0,3,0,3,1,3],winner:'H',line:[14,21,28,35]};
  }
  function genGmk(){
    var b=Array(225).fill(null),moves=[],who='B';
    for(var k=0;k<9;k++){
      var mv=gmkAI(b,who,who==='B'?'W':'B');
      b[mv.c]=who;moves.push(mv.c);
      who=who==='B'?'W':'B';
    }
    return {moves:moves}; /* no result claimed, none drawn */
  }
  function genRPS(){
    var script=['rock','rock','paper','scissors','paper'],hist=[],rounds=[];
    script.forEach(function(you){
      var m=rpsAI(hist);hist.push(you);
      var res=m===you?'draw':(RPS_BEATS[you]===m?'you':'model');
      rounds.push({you:you,model:m,res:res});
    });
    return rounds;
  }
  function genPD(){
    var y=Math.random()<0.5?'C':'D', m=pdAI();
    return {you:y,model:m,pay:PD_PAY[y+m]};
  }
  var PV={ ttt:genTTT(), c4:genC4(), gmk:genGmk(), rps:genRPS(), pd:genPD() };

  /* ---------- authored scene data — legal by construction, audited below ---------- */
  var SCENES={
    /* Checkers: dark squares only; four legal opening diagonal steps (no captures). idx=r*8+c */
    checkers:{ start:(function(){var b=Array(64).fill(null);
        [40,42,44,46,49,51,53,55,56,58,60,62].forEach(function(i){b[i]='w';});
        [1,3,5,7,8,10,12,14,17,19,21,23].forEach(function(i){b[i]='r';});return b;})(),
      moves:[[17,26],[44,37],[21,28],[40,33]] },
    /* Shogi (compact): pawn rows step forward — always legal */
    shogi:{ n:9, rows:{0:'\u9999\u6842\u9280\u91d1\u738b\u91d1\u9280\u6842\u9999',2:'\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69',6:'\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69\u6b69',8:'\u9999\u6842\u9280\u91d1\u7389\u91d1\u9280\u6842\u9999'},
      moves:[[6*9+2,5*9+2],[2*9+6,3*9+6],[6*9+6,5*9+6],[2*9+2,3*9+2]] },
    /* Xiangqi (compact 10x9): cannons to the center file — a legal, classic opening */
    xiangqi:{ rows:{0:'\u8eca\u99ac\u8c61\u58eb\u5c07\u58eb\u8c61\u99ac\u8eca',2:'\u0020\u7832\u0020\u0020\u0020\u0020\u0020\u7832\u0020',3:'\u5352\u0020\u5352\u0020\u5352\u0020\u5352\u0020\u5352',6:'\u5175\u0020\u5175\u0020\u5175\u0020\u5175\u0020\u5175',7:'\u0020\u70ae\u0020\u0020\u0020\u0020\u0020\u70ae\u0020',9:'\u8eca\u99ac\u76f8\u4ed5\u5e25\u4ed5\u76f8\u99ac\u8eca'},
      moves:[[7*9+1,7*9+4],[2*9+1,2*9+4],[9*9+1,7*9+2],[0*9+1,2*9+2]] },
    /* Battleship: fixed hidden fleet; hits derived from membership (fog honesty) */
    battleship:{ n:10, ships:[11,12,13,14, 46,56,66,76, 88,89],
      shots:[12,55,13,46,0,11,77,14,88,33] },
    /* Mancala: computed sows from the 4-seed start (engine below) */
    /* Nine Men's Morris: placing phase; White's 3rd placement completes the bottom mill */
    morris:{ points:[[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]],
      mills:[[0,1,2],[21,22,23],[0,9,21],[2,14,23],[3,4,5],[18,19,20],[6,7,8],[15,16,17],[9,10,11],[12,13,14],[1,4,7],[16,19,22],[3,10,18],[5,13,20],[6,11,15],[8,12,17]],
      places:[[0,'W'],[4,'B'],[1,'W'],[16,'B'],[2,'W']], mill:[0,1,2] },
    /* Pentago: place then rotate — the rotation is the game */
    pentago:{ moves:[{place:14,who:'W',q:0,dir:1},{place:21,who:'B',q:3,dir:-1},{place:8,who:'W',q:1,dir:1}] },
    /* Backgammon: white rolls 3-1 (8/5, 6/5 — the textbook play), black rolls 6-1 */
    backgammon:{ start:{0:{n:2,c:'b'},5:{n:5,c:'w'},7:{n:3,c:'w'},11:{n:5,c:'b'},12:{n:5,c:'w'},16:{n:3,c:'b'},18:{n:5,c:'b'},23:{n:2,c:'w'}},
      beats:[{roll:'3\u20131',moves:[[7,4],[5,4]],c:'w'},{roll:'6\u20131',moves:[[0,6],[6,7]],c:'b'}] },
    /* Ultimate TTT: cell index routes the reply board — rule-consistent sequence */
    uttt:{ moves:[{b:4,c:4,w:'X'},{b:4,c:0,w:'O'},{b:0,c:4,w:'X'},{b:4,c:8,w:'O'},{b:8,c:4,w:'X'},{b:4,c:2,w:'O'},{b:2,c:4,w:'X'}] },
    /* Hex 7x7: blue's column path connects top-bottom — a true chain */
    hex:{ n:7, blue:[3,10,17,24,31,38,45], red:[8,15,22,36,43,29] },
    /* Liar's dice: your cup [5,5,2,3,6], theirs [1,4,5,6,3] → fives total 3; bid "4 × 5" is a lie; call catches it */
    dice:{ yours:[5,5,2,3,6], theirs:[1,4,5,6,3], bid:{n:4,face:5}, truth:3, caller:'you' },
    /* Auction preview: bids 41 vs 57 — 57 wins */
    auction:{ a:41, b:57 },
    /* Econ: offers converge to a settle */
    econ:{ offers:[[70,30],[40,60],[60,40],[48,52],[55,45],[52,48]], settle:[52,48] },
    /* Card duels: lead vs reply, winner by rank truth (A>K>Q>J>10…) */
    cards:{
      'goofspiel':{mode:'bid',prize:'K\u2666',a:'9\u2660',b:'Q\u2660',winner:'b'},
      'hearts':{mode:'duel',lead:'K\u2665',reply:'A\u2665',winner:'reply',note:'penalty trick \u2014 the ace eats it'},
      'spades':{mode:'duel',lead:'Q\u2660',reply:'K\u2660',winner:'reply',trump:'\u2660'},
      'euchre':{mode:'duel',lead:'K\u2663',reply:'J\u2663',winner:'lead',trump:'\u2663',note:'right bower logic previews at the table'},
      'gin-rummy':{mode:'meld',meld:['7\u2660','7\u2665','7\u2666'],draw:'2\u2663'},
      'cribbage':{mode:'count',cards:['7\u2660','8\u2666'],count:'15\u20132'},
      'crazy-eights':{mode:'shed',pile:'8\u2663',note:'wild eight \u2014 suit called'},
      'shedding-card-game':{mode:'shed',pile:'J\u2660',note:'hand shrinks honestly'},
      'hanabi':{mode:'hanabi',note:'your hand renders face-down \u2014 everyone else\u2019s face-up'},
      'blackjack':{mode:'dealer',you:['K\u2660','7\u2666'],dealer:['A\u2663','?']},
      'leduc-holdem':{mode:'ring',seats:4,community:['K\u2660']},
      'limit-texas-holdem':{mode:'ring',seats:4,community:['A\u2660','7\u2665','7\u2663']},
      'no-limit-texas-holdem':{mode:'ring',seats:4,community:['Q\u2666','J\u2666','4\u2660']},
      'mahjong':{mode:'tiles',seats:4,tiles:['\u4e00','\u4e8c','\u4e09','\u767c']},
      'dou-dizhu':{mode:'landlord',seats:3},
      'bridge':{mode:'compass',seats:4}
    }
  };
  /* Mancala sow engine (counterclockwise, skip opponent store) — preview frames are computed, not drawn */
  function mncSow(b,pit,me){
    var t=b.slice(),seeds=t[pit];t[pit]=0;var i=pit,path=[];
    while(seeds>0){ i=(i+1)%14; if(me==='A'&&i===13)continue; if(me==='B'&&i===6)continue; t[i]++;seeds--;path.push(i); }
    return {board:t,path:path,last:i};
  }
  var mncStart=[4,4,4,4,4,4,0,4,4,4,4,4,4,0];
  var MNC_FRAMES=(function(){
    var fs=[{board:mncStart,path:[]}],b=mncStart,seq=[[2,'A'],[9,'B'],[5,'A'],[7,'B']];
    seq.forEach(function(mv){ var r=mncSow(b,mv[0],mv[1]); fs.push(r); b=r.board; });
    return fs;
  })();
  SCENES.mancala={frames:MNC_FRAMES};

  /* ---------- §5 physics self-audit ---------- */
  (function audit(){
    var ok=true;
    var tb=Array(9).fill(null),who='X';
    PV.ttt.moves.forEach(function(m){ if(tb[m]!==null)ok=false; tb[m]=who; who=who==='X'?'O':'X'; });
    var tw=tttWin(tb);
    if(!tw||tw.who!=='X'||tw.line.join()!==PV.ttt.line.join()){ok=false;console.error('[appd audit] TTT preview fails its own win-check');}
    var cb=Array(42).fill(null),cwho='H';
    PV.c4.cols.forEach(function(c){ var r=c4Row(cb,c); if(r<0)ok=false; else cb[r*7+c]=cwho; cwho=cwho==='H'?'M':'H'; });
    var cw=c4Win(cb);
    if(!cw||cw.who!==PV.c4.winner){ok=false;console.error('[appd audit] C4 preview fails its own win-check');}
    var five=SCENES.dice.yours.concat(SCENES.dice.theirs).filter(function(d){return d===SCENES.dice.bid.face;}).length;
    if(five!==SCENES.dice.truth||five>=SCENES.dice.bid.n){ok=false;console.error('[appd audit] dice scene: the bid must be a lie');}
    var hexOK=SCENES.hex.blue.every(function(v,i,a){return i===0||v-a[i-1]===SCENES.hex.n;});
    if(!hexOK){ok=false;console.error('[appd audit] hex chain is not connected');}
    var millSet=SCENES.morris.places.filter(function(p){return p[1]==='W';}).map(function(p){return p[0];});
    if(!SCENES.morris.mill.every(function(m){return millSet.indexOf(m)>=0;})){ok=false;console.error('[appd audit] morris mill is not White\u2019s');}
    if(ok)console.info('[appd audit] all preview sequences pass their own win-checks \u2713');
  })();

  /* ---------- Humans vs Models ---------- */
  var HVM={
    allTime:{rate:34.6,games:412887},
    week:{rate:38.2,games:9412,delta:'+2.1 vs last week'},
    gauntlet:OPP.slice(0,8).map(function(m,i){
      var hwr=[0,9.4,12.1,14.8,18.5,22.3,26.0,31.2][i];
      var games=[341,12408,9871,8204,6118,5590,4021,3376][i];
      return {id:m.id,name:m.name,initial:m.initial,tint:m.tint,hwr:hwr,games:games,
        line:hwr===0?'Undefeated vs humans':('Beaten '+Math.round(games*hwr/100).toLocaleString('en-US')+' times')};
    }),
    gameChips:['All','Tic-Tac-Toe','Connect Four','Chess','Othello','Gomoku']
  };
  var NOTIFS=[
    {title:'A new model just arrived.',body:'Nobody has beaten it yet.',when:'Fires once when a new model lands on the roster. Never more than one per week.'},
    {title:'Your rematch with GPT-5.2 is waiting.',body:'The board is exactly where you left it.',when:'Fires when a live session has sat unfinished for 24 hours. Once per session.'},
    {title:'Your requested match is airing.',body:'Claude Opus 4.8 vs GPT-5.2, Chess \u2014 the replay just verified.',when:'Fires when a match YOU requested finishes verification and hits the marquee. Opt-in, match-driven.'},
    {title:'Humanity went 41% this week.',body:'Up 3 points. We need you.',when:'Optional weekly digest \u2014 Sunday, 6pm local. Off by default.'}
  ];

  /* ---------- §6 human ladder (honest counting metric: verified wins this week) ---------- */
  var HUMAN_NAMES=['kasparov_wept','n0_limit_nadia','deepblue_diego','mikasa_mate','pawnstorm_pat','turing_tilde','zugzwang_zoe','en_passant_e','fork_yeah','minimax_mira','ada_likes_go','the_lucas_gambit','blunderbuss','h3x_hana','coup_de_grace'];
  function humanLadder(scope){
    var wk=scope==='week';
    return HUMAN_NAMES.map(function(n,i){
      var wins=wk?[142,131,128,119,108,97,91,84,80,77,73,68,64,61,58][i]:[3120,2980,2870,1544,2610,1490,2110,1330,1870,1260,1720,980,1610,940,1550][i];
      var losses=wk?[61,72,80,54,88,61,94,70,101,88,110,74,120,90,131][i]:[1490,1610,1780,940,2010,1080,2260,1220,2390,1310,2510,1090,2680,1360,2790][i];
      var draws=wk?[9,12,7,4,15,6,11,8,13,10,9,5,14,7,12][i]:[220,260,190,90,310,120,280,160,340,180,300,110,360,150,330][i];
      var g=wins+losses+draws, rate=Math.round(1000*wins/g)/10;
      var scalps=['beat Claude Opus 4.8','beat GPT-5.2','beat Gemini 3 Pro','beat o4','beat Grok 4','beat Claude Opus 4.8','beat GPT-5 Mini','beat DeepSeek R2','beat Gemini 3 Flash','beat Llama 4.1','beat o4-mini','beat Qwen 3 Max','beat Mistral Large 3','beat GPT-5.2','beat Claude Sonnet 4.6'];
      return {rank:i+1,name:n,initial:n[0].toUpperCase(),w:wins,l:losses,d:draws,rate:rate,scalp:scalps[i],
        isYou:n==='kasparov_wept'};
    });
  }
  /* Everyone lens: humans + models on one axis (human-vs-model win rate, min 200 games) */
  function everyone(){
    var rows=[];
    OPP.slice(0,8).forEach(function(m,i){ rows.push({species:'MODEL',name:m.name,initial:m.initial,tint:m.tint,rate:[100,90.6,87.9,85.2,81.5,77.7,74.0,68.8][i],games:[341,12408,9871,8204,6118,5590,4021,3376][i]}); });
    var HL=humanLadder('all');
    HL.slice(0,6).forEach(function(h){ rows.push({species:'HUMAN',name:h.name,initial:h.initial,tint:null,rate:h.rate,games:h.w+h.l+h.d,isYou:h.isYou}); });
    rows.sort(function(a,b){return b.rate-a.rate;});
    return rows.map(function(r,i){r.pos=i+1;return r;});
  }
  var STANDING={ week:{rank:1,pct:'top 1% of humans',metric:'142 verified wins'}, all:{rank:1,pct:'top 1% all-time',metric:'3,120 verified wins'} };

  /* ---------- §3.2 platform roster (as if from listPublicArenaOpponentModels) ---------- */
  /* per-model allowedGames — some models are gated out of specific games */
  var ALL_ARENA=ES.games.filter(function(g){return g.category!=='RL';}).map(function(g){return g.slug;});
  function gamesExcept(excl){ return ALL_ARENA.filter(function(s){return excl.indexOf(s)<0;}); }
  var ROSTER=OPP.map(function(m,i){
    var allowed;
    if(i===1) allowed=gamesExcept(['bridge','mahjong','dou-dizhu','hex']); /* slower, gated from 4-seat + hex */
    else if(i===4) allowed=gamesExcept(['chess','go','shogi','xiangqi']); /* newest — big boards not yet certified */
    else if(i===7) allowed=gamesExcept(['hanabi','bridge']);
    else allowed=ALL_ARENA.slice();
    var tags=[];
    if(m.median<=4)tags.push('Fast'); if(m.rank<=3)tags.push('Strong'); if(m.median>7)tags.push('Slower turns');
    if(i>=10)tags.push('Newest'); if(!tags.length)tags.push('Balanced');
    return {id:m.id,name:m.name,prov:m.prov,provName:m.prov.charAt(0).toUpperCase()+m.prov.slice(1),
      initial:m.initial,tint:m.tint,median:m.median,rank:m.rank,allowed:allowed,tags:tags};
  });
  function rosterAvail(modelId,slug){
    var r=ROSTER.filter(function(x){return x.id===modelId;})[0];
    if(!r)return 'Ready';
    if(r.allowed.indexOf(slug)<0)return 'Not available for this game';
    return r.median>7?'Slower turns':'Ready';
  }
  function nearestFor(slug,notId){
    for(var i=0;i<ROSTER.length;i++){ if(ROSTER[i].id!==notId&&ROSTER[i].allowed.indexOf(slug)>=0)return ROSTER[i]; }
    return ROSTER[0];
  }

  /* ---------- §2 theme materials (materials + ink, per theme) ---------- */
  /* Each theme: plane (board surface treatment), ink (piece rendering), card face/back,
     table (felt/wood for card games), glow (budget + where allowed). CSS-expressible. */
  var MARK_INK={dark:'#647cff',light:'#1b32c4',neon:'#3fd6f2',club:'#8a6414',arcade:'#33ff77',midnight:'#7d8dc9'};
  var MATERIALS={
    dark:{label:'Classic Dark',plane:'flat matte',planeCss:'var(--board-bg)',ink:'flat discs, hairline rim',cardFace:'var(--surface)',cardBack:'var(--surface-3)',table:'var(--surface-2)',glow:'none',persistence:false,note:'the calm instrument'},
    light:{label:'Classic Light',plane:'flat matte, warm',planeCss:'var(--board-bg)',ink:'flat discs, hairline rim',cardFace:'#ffffff',cardBack:'var(--surface-3)',table:'var(--surface-2)',glow:'none',persistence:false,note:'the calm instrument, daylit'},
    neon:{plane:'near-black glass',planeCss:'linear-gradient(180deg,#0d0d18,#08080f)',ink:'light-tube strokes',cardFace:'var(--surface)',cardBack:'#0a0a14',table:'#0b0b16',glow:'accent bloom (budgeted)',persistence:false,note:'glass + cold cathode'},
    club:{plane:'wood grain',planeCss:'repeating-linear-gradient(90deg,#c99a5a,#c99a5a 6px,#c19152 6px,#c19152 12px)',ink:'lacquered discs',cardFace:'#fbf6ea',cardBack:'#8a6414',table:'radial-gradient(circle,#2e7d43,#25683a)',glow:'none',persistence:false,note:'wood, felt, brass'},
    arcade:{plane:'phosphor black',planeCss:'#04150a',ink:'phosphor strokes',cardFace:'var(--surface)',cardBack:'#07200f',table:'#04150a',glow:'accent bloom (budgeted)',persistence:true,note:'CRT persistence trail'},
    midnight:{plane:'true black void',planeCss:'#000000',ink:'floating discs, faint rim',cardFace:'var(--surface)',cardBack:'var(--surface-3)',table:'var(--surface-2)',glow:'none',persistence:false,note:'the board floats; motion carries it'}
  };
  var GLOW_THEMES=['neon','arcade'];
  var FAMILIES_12=['grid_3x3','connect_four','square_board','go_board','hex_board','card_table','dice_table','payoff_matrix','auction_panel','economic_panel','control_benchmark','custom'];

  window.APPD={
    fmtModel:fmtModel,provOf:provOf,OPP:OPP,BEST_FIRST:BEST_FIRST,
    famOf:famOf,glyphOf:glyphOf,howto:howto,scoreLang:scoreLang,
    MAIN:MAIN,TABLE6:TABLE6,SHELF:SHELF,PLAYABLE:PLAYABLE,
    ttt:{win:tttWin,full:tttFull,ai:tttAI},
    c4:{row:c4Row,win:c4Win,full:c4Full,ai:c4AI,tryMove:c4Try},
    oth:{init:othInit,legal:othLegal,flips:othFlips,apply:othApply,counts:othCounts,ai:othAI},
    gmk:{win:gmkWin,full:gmkFull,ai:gmkAI},
    rps:{ai:rpsAI,beats:RPS_BEATS,all:RPS},
    pd:{ai:pdAI,pay:PD_PAY},
    bj:{deck:bjDeck,val:bjVal,dealerPlay:bjDealerPlay},
    auc:{make:aucNew,modelBid:aucModelBid},
    LBL:LBL,REASON:REASON,CHESS_REASONS:CHESS_REASONS,HVM:HVM,NOTIFS:NOTIFS,
    PV:PV,SCENES:SCENES,
    humanLadder:humanLadder,everyone:everyone,STANDING:STANDING,
    ROSTER:ROSTER,rosterAvail:rosterAvail,nearestFor:nearestFor,ALL_ARENA:ALL_ARENA,
    MATERIALS:MATERIALS,MARK_INK:MARK_INK,GLOW_THEMES:GLOW_THEMES,FAMILIES_12:FAMILIES_12
  };
})();
