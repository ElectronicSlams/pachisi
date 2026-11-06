"""Rebuild the local design census from reviewed dispatch sites and pinned evidence."""
import hashlib
import json
import re
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
A = Path('design-archive')
AP = A/'arena-app/prototype/src'
V4 = A/'web-v1-v4/app'
HOME = A/'home-v2/eSlams Home v2.dc.html'
MOB = A/'mobile-v3/eSlams Mobile App v3.dc.html'
MDATA = A/'mobile-v3/app-data-v3.js'
SK = Path('reference/platform/mobile-8dd06c12/packages/board-skia')
WEB = Path('reference/platform/web-0fa7dfe/apps/web')
PUBLIC = Path('reference/public-games')
NATIVE = SK/'goldens/offscreen/games'
REPORT = Path('docs/research/local-game-design-census.md')
INDEX = Path('catalogue/local-game-design-census.json')
PREVIEWS = Path('catalogue/public/design-census')
SCENE = Path('src/game/scene.tsx')


def read_json(path):
    return json.loads((ROOT/path).read_text())


@lru_cache(None)
def lines(path):
    return (ROOT/path).read_text().splitlines()


def proof(path, needle=None):
    assert (ROOT/path).exists(), path
    ref = {'path': str(path)}
    if needle:
        ref['line'] = next((i for i, line in enumerate(lines(path), 1) if needle in line), None)
        assert ref['line'], (path, needle)
    return ref


def evidence(name, kind, note, *refs):
    return {'name': name, 'kind': kind, 'note': note, 'evidence': list(refs)}


def sha(path):
    return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()


# Explicit branches in the mobile prototype. Card modes come from its separate scene table.
MOBILE_METHODS = {
    'chess':'rChess', 'tic-tac-toe':'rTTT', 'connect-four':'rC4', 'go':'rGoPrev',
    'gomoku':'rGo15', 'hex':'pvHex', 'checkers':'pvCheckers', 'othello':'rOth',
    'shogi':'pvKanji','xiangqi':'pvKanji','battleship':'pvBship','mancala':'pvMancala',
    'nine-mens-morris':'pvMorris','pentago':'pvPentago','backgammon':'pvBackgammon',
    'ultimate-tic-tac-toe':'pvUTTT','liars-dice':'pvDice','first-price-sealed-bid-auction':'rAuction',
    'rock-paper-scissors':'rRPS','prisoners-dilemma':'rPD','bargaining':'pvEcon','negotiation':'pvEcon',
}
ARCADE = dict(zip('alien-shooter lunar-lander car-racing bipedal-walker paddle-ball boxing-style-arena ice-hockey-style-arena mountain-car cartpole'.split(),
                  'drawAlienShooter drawLunarLander drawCarRacing drawWalker drawPaddleBall drawBoxingArena drawHockeyArena drawMountainCar drawCartPole'.split()))
WEB_KIND = {'go':'stone-grid','gomoku':'stone-grid','othello':'disc-grid','hex':'hex-grid','nine-mens-morris':'morris','ultimate-tic-tac-toe':'ultimate-grid','liars-dice':'dice-table','goofspiel':'dice-table'}
CUSTOM = {'nine-mens-morris':'morris'}
DIRECT_BOARD = {'chess','tic-tac-toe','connect-four','checkers','backgammon','battleship','mancala'}
HERO = {'chess','tic-tac-toe','connect-four','othello'}
EARLY = {'chess':'PvBoardSlide','tic-tac-toe':'PvTTT','connect-four':'PvC4','othello':'PvOthello','go':'PvGo','liars-dice':'PvDice','rock-paper-scissors':'PvRPS','lunar-lander':'PvLander'}
CLASSIC = {'tic-tac-toe':'TicTacToeGame','connect-four':'ConnectFourGame','othello':'OthelloGame','rock-paper-scissors':'RPSGame'}
C4 = 'connect-four'


def first_party(game):
    slug, category = game['slug'], game['category']
    rows = []
    def add(name, kind, note, *refs):
        rows.append(evidence(name, kind, note, *refs))
    mode = re.search(r"'" + re.escape(slug) + r"':\{mode:'([^']+)'", '\n'.join(lines(MDATA)))
    if mode:
        add('Mobile v3 · '+mode[1]+' table','Prototype','A scripted card composition with a game-specific scene configuration.',
            proof(MOB,'  pvCards(slug,t)'),proof(MDATA,"'"+slug+"':{mode:"))
        if slug=='blackjack':
            add('Mobile v3 · dealer play','Prototype','Separate hit/stand screen with a concealed dealer card.',proof(MOB,'  rBJ(o)'))
    elif category=='rl':
        add('Mobile v3 · '+game['name']+' benchmark','Prototype','Compact illustrative motion loop. Validate against the bundled trace before porting its movement.',proof(MOB,"slug==='{}".format(slug)+"'" if slug not in ('lunar-lander','cartpole') else ("if(slug==='lunar-lander') return this.rLander(t)" if slug=='lunar-lander' else "if(slug==='cartpole'){")),proof(MOB,'  rBench(slug,t)'))
    else:
        method=MOBILE_METHODS[slug]
        add('Mobile v3 · '+method,'Shared layout' if method in ('pvKanji','pvEcon') else 'Prototype',
            'The two economic games share an offer sequence.' if method=='pvEcon' else 'Mobile screen or named preview drawing routine.',proof(MOB,'  '+method+'('))
    # Arena App is a separate project from Mobile v3. Map by its registry, not its menu labels.
    pattern = re.compile(r"^\s*\['"+re.escape(slug)+r"',")
    row=next((line for line in lines(AP/'data.js') if pattern.search(line)),None)
    if row:
        fam=re.search(r"'(square_board|grid_3x3|connect_four|go_board|hex_board|custom|card_table|dice_table|auction_panel|payoff_matrix|economic_panel)'",row)[1]
        if fam=='custom':
            anchor='CUSTOM.'+CUSTOM.get(slug,slug)+' = function'
            entry=proof(AP/'boards-table.js',anchor)
        elif fam in ('square_board','grid_3x3','connect_four','go_board','hex_board'):
            entry=proof(AP/'boards-grid.js',"ESB.registerFamily('"+fam+"'")
        else:
            entry=proof(AP/'boards-table.js',"family('"+fam+"'")
        aux=[entry,proof(AP/'data.js',row.strip())]
        if slug=='goofspiel':aux.append(proof(AP/'boards-table.js','Goofspiel and other sealed'))
        add('Arena App · '+fam,'Prototype' if fam=='custom' or slug=='goofspiel' else 'Shared layout',
            'Bespoke geometry for this game.' if fam=='custom' else 'Bid cards and prize reveal in the shared table.' if slug=='goofspiel' else 'The prototype routes this game to the named component. Seat layout and public state specialize the view.',*aux)
    if slug in HERO:
        add('Home v1/v2 · match poster','Prototype','Home poster renderer. Both historical revisions are grouped as one lineage.',proof(HOME,"kind==='"+slug+"'"),proof(A/'home-v1/eSlams Home.dc.html',"kind==='"+slug+"'"))
    if slug in CLASSIC:
        add('Early web Arena · play screen','Prototype','First-party interactive prototype with a dedicated game component.',proof(V4/'games-arena.jsx','function '+CLASSIC[slug]+'('))
    if slug in ('chess','go'):
        add('Early web · board','Prototype','Original board component in the web v1–v4 handoff.',proof(V4/'games.jsx','function '+('ChessBoard' if slug=='chess' else 'GoBoard')+'('))
    if slug=='tic-tac-toe':
        add('Arena reference · neon crosses','Prototype','Pink X and cyan O with luminous type on the original standalone board.',proof(A/'web-v1-v4/references/arena.html','.board .cell.x'))
    if slug in EARLY:
        method=EARLY[slug]
        add('Web v4 poster · '+method,'Shared layout' if method=='PvBoardSlide' else 'Prototype','Decorative preview animation from the Arena picker.',proof(V4/'arena-preview.jsx','function '+method+'('))
    else:
        add('Web v4 picker fallback','Placeholder','The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only.',proof(V4/'arena-preview.jsx','function getArenaPreview('))
    # The Stadium DC renderer has six working families and an explicit other/placeholder.
    stadium_row=next(line for line in lines(A/'stadium-prototype/data.js') if pattern.search(line))
    family=re.search(r"'(square_board|grid_3x3|connect_four|go_board|hex_board|custom|card_table|dice_table|auction_panel|payoff_matrix|economic_panel|control_benchmark)'",stadium_row)[1]
    dc=A/'stadium-prototype/Board.dc.html'
    # Board.dc.html supports families, but the actual sample dispatcher substitutes
    # other games, including Othello for Battleship and Tic-Tac-Toe by default.
    used={'gomoku':'go','ultimate-tic-tac-toe':'tic-tac-toe','checkers':'othello','battleship':'othello','goofspiel':'cards'}.get(slug,slug)
    if used not in ('chess','go','hex','othello','tic-tac-toe','connect-four','cards'):used='tic-tac-toe'
    active=used==slug or slug=='goofspiel'
    add('Stadium prototype · '+('sealed cards' if used=='cards' else used),'Prototype' if active else 'Placeholder',
        'Documented historical sample and its view.' if active else f'Sample dispatch selects {used}. The catalogue records the requested game separately.',
        proof(dc,"fam === '"+family+"'" if family in ('grid_3x3','connect_four','square_board','go_board','hex_board','card_table') else 'value="{{ isOther }}"'),
        proof(A/'stadium-prototype/records.js','export function recordFor'),proof(A/'stadium-prototype/data.js',stadium_row.strip()))
    web=WEB/'components/replay-board.tsx'
    if slug in ARCADE:
        add('Platform replay · Pixi '+game['name'],'Archived renderer','Game-specific arcade drawing path with a separate DOM/SVG fallback.',proof(web,'function '+ARCADE[slug]+'('),proof(web,'function '+('ReplayRlTrack' if slug in ('cartpole','mountain-car') else 'ReplayRlScene')+'('))
    else:
        kind=WEB_KIND.get(slug,slug if slug in DIRECT_BOARD else {'card':'card-table','gametheory':'strategy-matrix','rl':'rl-grid','board':'grid'}[category])
        primary=proof(web,'renderer.kind === "'+kind+'"' if kind!='grid' else 'className="replay-gridboard"')
        add('Platform replay · '+kind,'Shared layout' if kind in ('grid','card-table','strategy-matrix','rl-grid','dice-table','stone-grid') else 'Archived renderer',
            'Default routing groups Goofspiel with dice/bids. The dedicated mobile and Arena App card views are stronger restoration candidates.' if slug=='goofspiel' else 'Default replay composition. A supplied renderer hint can change the route.',primary,proof(WEB/'lib/replay-visualization.ts','export function replayRendererForGame'))
    if category=='card' or slug=='goofspiel':
        table=WEB/'components/arena-card-table.tsx'
        add('Platform Arena · seated card table','Shared layout','Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen.',proof(table,'function ArenaCardTable'))
    return rows


def imported(game):
    records=[]
    for s in selection:
        if game['slug'] not in s['games']:continue
        slug=game['slug']
        files=[f['path'] for f in s['files'] if not re.search(r'(^|/)(license|licence|copying|readme|notice)\b',f['path'],re.I)]
        name=s['repository'].lower().split('/')[-1]
        kind={'assets':'Shared asset','interaction':'Interaction','physics':'Renderer / physics','rules':'Rules','renderer':'Renderer source'}[s['kind']]
        if name in ('pgx','bb4-games','pettingzoo','open_spiel','gymnasium','retro-games','rlcard'):
            alias={'tic-tac-toe':'tictactoe','no-limit-texas-holdem':'texas_holdem_no_limit','limit-texas-holdem':'texas_holdem','rock-paper-scissors':'rps','first-price-sealed-bid-auction':'first_sealed_auction','cliff-walking':'cliffwalking','alien-shooter':'space-invaders','gin-rummy':'gin_rummy','dou-dizhu':'rlcard/utils','shedding-card-game':'rlcard/utils'}.get(slug,slug.replace('-','_'))
            if name=='bb4-games' and 'holdem' in slug:alias='/poker/'
            if name=='retro-games' and slug=='lunar-lander':alias='lunar-lander'
            files=[f for f in files if alias.lower() in f.lower()]
            if name=='pettingzoo' and slug=='limit-texas-holdem':files=[f for f in files if 'no_limit' not in f]
            if name=='rlcard' and slug=='gin-rummy':files=sorted(files,key=lambda p:('game_app.py' not in p,p))
        assert files,(name,slug)
        if name=='boardgame.io':kind='Shared interaction'
        if name=='rlcard':kind={'gin-rummy':'Renderer source','blackjack':'Terminal interaction'}.get(slug,'Shared interaction')
        if name=='open_spiel':kind='Rules'
        if slug in ('bridge','boxing-style-arena','ice-hockey-style-arena','paddle-ball','negotiation') and kind not in ('Shared asset','Shared interaction','Rules'):kind='Related design'
        base=PUBLIC/'sources'/(s['id']+'@'+s['commit'][:12])
        detail=s['idea']+' '+s['limits']
        if name=='gymnasium' and slug=='blackjack':
            kind='Renderer source'
            detail='Pygame table renderer in the selected Blackjack environment. Its upstream images, fonts and dependencies are outside the source selection.'
        records.append(evidence(s['repository'],kind,detail,proof(base/files[0],'def render(self)' if name=='gymnasium' and slug=='blackjack' else None),proof(base)))
    return records


def link(ref):
    url='../../'+quote(ref['path'],safe='/@')
    if 'line' in ref:url+='#L'+str(ref['line'])
    return '[{}]({})'.format(Path(ref['path']).name+(':'+str(ref['line']) if 'line' in ref else ''),url)


coverage=read_json('docs/game-coverage.json')['games']
selection=read_json(PUBLIC/'SOURCES.json')['sources']
editions=read_json('src/game/visual-editions.json')
web_names={slug:[look["name"] for look in family['looks']] for family in editions.values() for slug in family['games']}
assert set(web_names)=={g['slug'] for g in coverage if g['slug']!=C4}
native_map=dict(re.findall(r'entry\(\s*"([^"]+)",\s*"([^"]+)"','\n'.join(lines(SK/'src/golden/compatibility-matrix.ts'))))
active_turn=defaultdict(list)
for path in sorted((ROOT/NATIVE).glob('*/active_turn.png')):
    active_turn[sha(path)].append(path.parent.name)
PREVIEWS_ABS=ROOT/PREVIEWS
PREVIEWS_ABS.mkdir(parents=True,exist_ok=True)
games=[]
for g in coverage:
    slug=g['slug']
    origin=first_party(g)
    folder=NATIVE/slug
    captures=sorted((ROOT/folder).glob('*.png'))
    native=None
    if captures:
        family=native_map[slug]
        sample=folder/'active_turn.png'
        digest=sha(sample)
        preview=PREVIEWS/(digest+'.png')
        (ROOT/preview).write_bytes((ROOT/sample).read_bytes())
        native={'family':family,'source':str(sample),'sha256':digest,'image':'./design-census/'+preview.name,
                'sameImageGames':active_turn[digest], 'states':[p.stem for p in captures],
                'appearances':sorted(p.stem for p in (ROOT/SK/'goldens/offscreen/family-themes'/family).glob('*.png'))}
    names=re.findall(r"id: 'design-\d+', name: '([^']+)'",'\n'.join(lines(Path('src/game/connect-four-designs.ts')))) if slug==C4 else web_names[slug]
    fn={'cell':'cellScene','special-board':'boardScene','cards':'cardScene','grid':'gridScene','control':'controlScene','social':'socialScene'}[g['scene'].split('/')[0]]
    games.append({'slug':slug,'name':g['name'],'category':g['category'],'scene':g['scene'],'shipped':names,'atCensusStart':20 if slug==C4 else 1,
        'runtime':proof(Path('src/game/connect-four-designs.ts')) if slug==C4 else proof(Path('src/game/visual-editions.json')),
        'archive':origin,'native':native,'imports':imported(g)})
assert len(games)==len(set(g['slug'] for g in games))==50
counts=Counter(e['kind'] for g in games for e in g['archive'])
summary={'games':len(games),'shippedGameDesigns':sum(len(g['shipped']) for g in games),'nativeGames':sum(bool(g['native']) for g in games),'distinctNativeSamples':len(active_turn),'importedRepos':len(selection),'archiveMappings':dict(counts)}
out={'scope':'Pachisi working tree and pinned local reference collection','summary':summary,'games':games}
(ROOT/INDEX).write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
text=['# Local game design census','',
      'This inventory separates usable Pachisi web designs, archived drawing implementations, shared layouts, local native captures and imported source selections. Counts refer to game/design pairs or explicitly named evidence types. Two source files can draw the same design. The prototype/source lists are restoration candidates, not a certified count of distinct looks.','',
      f"**{summary['games']} games · {summary['shippedGameDesigns']} currently usable game/design pairs · {summary['nativeGames']} games with native captures · {len(active_turn)} distinct active-turn PNGs · {len(selection)} locally archived public repositories.**",'',
      '## Counting and scope','',
      '- Connect Four has its 20 selectable designs. At the start of this census the other 49 games each had one existing Pachisi scene (69 game/design pairs overall). The table below includes the subsequent shared web editions, with the same underlying geometry. Shared editions are counted once per supported game, not claimed as independently authored games. A layout, rule variant, study position, palette, icon, sample trace or shared deck is not counted as another shipped design.',
      '- The first-party sweep covers Mobile v3, the Arena App grid and table registries, the Stadium board prototype, Home v1/v2 posters, early web game/picker routes, the original Arena reference and the pinned Platform replay/table sources and native compatibility matrix. The old picker uses several unrelated generic fallbacks. The mobile prototype has explicit drawing routines and card configurations for cases those fallbacks miss.',
      '- Home revisions, repeated web v3/v4 modules, the generated Arena HTML and its editable source are grouped by lineage. Historical code was inspected as text. Native state names and six family appearances are indexed separately. Only one byte-identical active-turn sample per SHA-256 is copied into the catalogue.',
      '- External references come from the existing pin/selection manifests. Each association points to a local selected file and its snapshot. Dedicated UI, shared interaction, partial artwork, related games and rules references carry separate labels. Availability of a reference is not proof of a working upstream application or permission to ship a port.',
      '- Evidence is scoped to identifiable game drawing routes and reviewed public assets. Original handoff screenshots, branding, duplicate workspace checkouts, unrelated projects and private/operator files are outside the shipped inventory. See the [archive exclusions](../../design-archive/ARCHIVE_INDEX.md) and [upstream import record](public-game-designs.md).','',
      'The [workspace cross-check](local-design-workspace.json) compares 139 identifiable renderer and prototype files in the original handoffs and three Platform checkouts against their in-repo counterparts. 133 are byte-identical. Six are revisions of replay-board.tsx or replay-visualization.ts. Those revisions are candidates for further comparison and add zero to the shipped count.','',
      '## Index','', '| Game | Shipped web looks | First-party screen/renderer candidates | Shared layouts | Native state captures | Local upstream repositories |','|---|---:|---:|---:|---:|---:|']
for g in games:
    rows=g['archive'];text.append(f"| [{g['name']}](#game-{g['slug']}) | {len(g['shipped'])} | {sum(e['kind'] in ('Prototype','Archived renderer') for e in rows)} | {sum(e['kind']=='Shared layout' for e in rows)} | {len(g['native']['states']) if g['native'] else 0} | {len(g['imports'])} |")
for g in games:
    text+=['',f"<a id=\"game-{g['slug']}\"></a>",'### '+g['name'],'',f"**Usable today.** {', '.join(g['shipped'])}. Scene `{g['scene']}`. {link(g['runtime'])}",'']
    for e in g['archive']+g['imports']:
        text.append(f"- **{e['name']}** ({e['kind']}). {e['note']} {' · '.join(link(s) for s in e['evidence'])}")
    n=g['native']
    if n:
        text+=['',f"**Native archive.** {n['family']}, {len(n['states'])} captured states and {len(n['appearances'])} shared family appearances. [Active-turn sample](../../{n['source']}). Identical active-turn bytes appear under: {', '.join(n['sameImageGames'])}."]
    else:text+=['','**Native archive.** No game-specific golden image found under this slug.']
(ROOT/REPORT).write_text('\n'.join(text)+'\n')
print(json.dumps(summary))
