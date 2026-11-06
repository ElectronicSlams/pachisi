"""Search public repository metadata only. Resume immutable result pages from the local cache.
Requires authenticated gh. Inspect/rendering work is deliberately separate from discovery.
"""
import collections
import json
import subprocess
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'artifacts/github-visual-sweep'
CACHE.mkdir(parents=True,exist_ok=True)
# Distinct names, community topics and implementation surfaces. Search GitHub's
# repository index, not code contents, private repositories or repository forks.
QUERIES={
'alien-shooter':['"space invaders" pygame','topic:space-invaders','"space invaders" canvas'],
'backgammon':['topic:backgammon','backgammon board game','backgammon GUI'],
'bargaining':['"bargaining game"','"ultimatum game" experiment','bargaining otree'],
'battleship':['topic:battleship','battleship GUI','battleship canvas'],
'bipedal-walker':['"bipedal walker" simulator','"bipedal walker" physics','"ragdoll" walking game'],
'blackjack':['blackjack GUI','blackjack table game','blackjack flutter'],
'boxing-style-arena':['boxing game pygame','boxing game godot','boxing game canvas'],
'bridge':['"contract bridge" game','bridge double dummy viewer','bridge card game GUI'],
'car-racing':['"top down" racing game','car racing pygame','racing game canvas'],
'cartpole':['cartpole simulator','cartpole visualization','"inverted pendulum" game'],
'checkers':['topic:checkers','draughts GUI','checkers board react'],
'chess':['topic:chessboard','chess GUI board','chessboard 3D'],
'cliff-walking':['"cliff walking" visualization','cliffwalking pygame','"cliff walking" gridworld'],
'connect-four':['topic:connect-four','"connect four" pygame','"connect four" 3d'],
'crazy-eights':['"crazy eights" game','crazy8s card game','"crazy eights" GUI'],
'cribbage':['cribbage board','cribbage game','cribbage GUI'],
'dou-dizhu':['斗地主 游戏','"dou dizhu" game','doudizhu GUI'],
'euchre':['euchre card game','euchre GUI','euchre multiplayer'],
'first-price-sealed-bid-auction':['"first price" auction experiment','"sealed bid" game','auction otree'],
'frozen-lake':['frozenlake visualization','"frozen lake" pygame','frozenlake GUI'],
'gin-rummy':['"gin rummy" game','ginrummy GUI','ginrummy multiplayer'],
'go':['goban board','baduk client','围棋 棋盘'],
'gomoku':['gomoku GUI','五子棋 游戏','renju board'],
'goofspiel':['goofspiel','"game of pure strategy" card','"gops" card game'],
'hanabi':['hanabi card game','hanabi GUI','hanabi multiplayer'],
'hearts':['hearts trick taking game','"hearts card game"','hearts card GUI'],
'hex':['"hex board game"','"game of hex" board','hex connection board game'],
'ice-hockey-style-arena':['ice hockey game','hockey game pygame','hockey game godot'],
'leduc-holdem':['"leduc" poker game','"leduc holdem"','leduc poker GUI'],
'liars-dice':['"liar\'s dice" game','liars dice multiplayer','perudo game'],
'limit-texas-holdem':['"limit holdem" poker game','"fixed limit" poker GUI','texas holdem poker client'],
'lunar-lander':['topic:lunar-lander','lunar lander simulator game','lunar lander canvas'],
'mahjong':['riichi mahjong client','麻将 游戏','mahjong tile renderer'],
'mancala':['mancala GUI','kalah board game','oware game'],
'mountain-car':['mountaincar visualization','"mountain car" simulator','"mountain car" pygame'],
'negotiation':['negotiation game multiplayer','negotiation game experiment','negotiation otree'],
'nine-mens-morris':['"nine men\'s morris" game','mill game GUI','muehle board game'],
'no-limit-texas-holdem':['"no limit" poker game','texas holdem multiplayer poker','poker table react'],
'othello':['reversi GUI','othello board game','reversi flutter'],
'paddle-ball':['breakout game canvas','pong pygame','paddle ball game godot'],
'pentago':['pentago game','pentago GUI','pentago board'],
'prisoners-dilemma':['"prisoner\'s dilemma" game','"prisoners dilemma" interactive','prisoners dilemma otree'],
'rock-paper-scissors':['rock paper scissors GUI','rock paper scissors arcade','rock paper scissors multiplayer'],
'shedding-card-game':['"shedding" card game','"switch" shedding card game','"mau mau" card game'],
'shogi':['shogi board GUI','将棋 盤面','shogi client'],
'spades':['spades trick taking game','"spades card game"','spades multiplayer card'],
'taxi':['"taxi-v3" visualization','"taxi" gridworld pygame','"taxi-v3" GUI'],
'tic-tac-toe':['tic tac toe GUI','tic tac toe 3d','tic tac toe canvas'],
'ultimate-tic-tac-toe':['"ultimate tic tac toe" game','uttt GUI','ultimate tic tac toe multiplayer'],
'xiangqi':['xiangqi GUI','中国象棋 游戏','xiangqi board client'],
}

def run():
    games=json.loads((ROOT/'docs/game-coverage.json').read_text())['games']
    assert set(QUERIES)=={g['slug'] for g in games}
    queue=collections.deque((g['slug'],i,QUERIES[g['slug']][i],1) for i in range(3) for g in games)
    while queue:
        game,idx,q,page=queue.popleft()
        f=CACHE/f'{game}_{idx}_{page-1}.json'
        if f.exists():
            saved=json.loads(f.read_text())
            assert saved['q']==q
            result=saved['result']
        else:
            # Sorted best match; up to GitHub’s 1,000 accessible results per query.
            for attempt in range(6):
                cmd=['gh','api','-X','GET','search/repositories','-f','q='+q+' is:public fork:false','-f','per_page=100','-f',f'page={page}']
                proc=subprocess.run(cmd,capture_output=True,text=True)
                if not proc.returncode: break
                print('retry',game,page,proc.stderr[:110],flush=True)
                time.sleep(12 if 'rate limit' in proc.stderr else 3+2*attempt)
            else: raise RuntimeError(game+': '+proc.stderr[:160])
            raw=json.loads(proc.stdout)
            nodes=[dict(nameWithOwner=r['full_name'],description=(r.get('description') or '')[:360],stargazerCount=r['stargazers_count'],isPrivate=r['private'],isFork=r['fork'],isArchived=r['archived'],primaryLanguage=r['language'],license=(r.get('license') or {}).get('spdx_id'),branch=r['default_branch']) for r in raw['items']]
            result=dict(repositoryCount=raw['total_count'],incomplete=raw['incomplete_results'],nodes=nodes)
            f.write_text(json.dumps(dict(q=q,game=game,result=result)))
            print(game,idx,page,len(nodes),'of',raw['total_count'],flush=True)
            time.sleep(1.1)
        if page<10 and result['repositoryCount']>page*100 and len(result['nodes'])==100:
            queue.append((game,idx,q,page+1))
if __name__=='__main__':run()
