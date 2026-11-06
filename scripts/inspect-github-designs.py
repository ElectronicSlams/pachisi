"""Read-only follow-up to sweep-github-designs.py. Rank candidates and inspect pinned blobs.
Store only public metadata and inert excerpts in ignored cache; never build upstream code.
"""
import concurrent.futures
import hashlib
import json
import math
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'artifacts/github-visual-sweep'
AUDIT=CACHE/'inspections'
AUDIT.mkdir(exist_ok=True,parents=True)
OLD={s['repository'].lower() for s in json.loads((ROOT/'reference/public-games/SOURCES.json').read_text())['sources']}
SUFFIXES=set('js jsx ts tsx vue svelte css scss html py pde gd tscn cs cpp cc c hpp java kotlin kt swift dart rs elm hs lua qml scala fs glsl frag'.split())
VIS=re.compile(r'pygame|pyqt|tkinter|<canvas|canvasrenderingcontext|\.getcontext\(|fillrect|strokerect|drawimage|drawcircle|draw_circle|draw_rect|\.blit\(|\.draw\(|paintcomponent|paintevent|graphic[s.]|swing\.|<svg|<rect|<circle|<polygon|<path |<button|<div|className=|background(-color|-image)?:|border-radius:|sprite2d|nod[eE]2[dD]|control\]|boardpainter|custompainter|widget build\(|swiftui|opengl|raylib|sdl_render|\.render\(|THREE\.|phaser\.|egui|TextureRect|extends (Node2D|Control)|ImageView|setfill\(',re.I)
VISNAME=re.compile(r'board|render|scene|screen|canvas|viewer|widget|gameview|client|gui|display|table|draw|sprite|pieces|cardview|paint|frontend|game\.tsx|style\.css|field|court|courtroom|game\.py|main\.(gd|pde|py)',re.I)
BAD=re.compile(r'(^|/)(node_modules|vendor|vendors|third.party|dist|bundle|build|target|generated|release|test[s]?|testdata|examples?/vendor|migrations|\.git[^/]*)/|\.min\.|package-lock|webpack|vite\.config|\.designer\.|\.d\.ts$',re.I)

def candidates():
    groups={}
    for f in sorted(CACHE.glob('*_*_*.json')):
        page=json.loads(f.read_text());game=page['game']
        group=groups.setdefault(game,{})
        for node in page['result']['nodes']:
            if node.get('isPrivate') or node.get('isFork') or node['nameWithOwner'].lower() in OLD:continue
            key=node['nameWithOwner'].lower()
            previous=group.get(key)
            if previous:previous['hits']+=1
            else:group[key]=dict(node,hits=1)
    return groups

def score(row):
    t=(row['nameWithOwner'].split('/')[-1]+' '+(row['description'] or '')).lower()
    points=math.log2(1+row['stargazerCount'])*.55
    points+=min(row['hits'],3)*.7
    points+=min(4,len(re.findall(r'gui|graphic|playable|board game|user interface|interactive|browser|multiplayer|visual|simulat|client|frontend|canvas|online game|mobile game|pygame|godot|three.js|phaser|react|p5.js|3d game',t)))*2
    if row.get('license') in ('MIT','BSD-3-Clause','BSD-2-Clause','Apache-2.0','ISC','CC0-1.0','MPL-2.0'):points+=4
    elif row.get('license') and row['license']!='NOASSERTION':points+=2
    if row['primaryLanguage'] in ('TypeScript','JavaScript','GDScript','Dart','Swift','Kotlin','C++','Processing','Elm'):points+=1
    points-=min(3,len(re.findall(r'reinforcement|deep learning|training|trained|coursework|algorithm|benchmark|dqn|collection of|solutions to|game theory library|solver',t)))*2
    return points

def api(endpoint,accept=None):
    cmd=['gh','api',endpoint]
    if accept:cmd+=['-H','Accept: '+accept]
    for i in range(3):
        r=subprocess.run(cmd,capture_output=True)
        if r.returncode==0:return r.stdout
        if not any(x in r.stderr for x in [b'502',b'503',b'504']):break
        time.sleep(i+1)
    raise ValueError('GitHub API '+r.stderr.decode(errors='replace')[:100])

def raw(repo,commit,path,limit):
    url='https://raw.githubusercontent.com/'+repo+'/'+commit+'/'+urllib.parse.quote(path,safe='/')
    with urllib.request.urlopen(url,timeout=14) as res:
        data=res.read(limit+1)
    return data[:limit].decode('utf8',errors='replace')

def priority(f,repo):
    p=f['path'].lower();base=p.split('/')[-1]
    n=len(VISNAME.findall(p))*2
    if re.search(r'(^|[._-])(board|gui|renderer|game|main|table|scene|app|index|goban|style)[._-]',base):n+=2
    if base.endswith(('.tsx','.jsx','.qml','.gd','.tscn','.pde','.vue','.dart')):n+=1.8
    if '/src/' in '/'+p:n+=1
    if f['size']>120_000:n-=3
    if f['size']<350:n-=5
    if any(x in p for x in ['service','config','controller','playerai','generator','server/','network','database','evaluator','boardstate','model/','constants','rules/','archive/']):n-=3
    return n-.04*p.count('/')

def inspect(row):
    repo=row['nameWithOwner'];f=AUDIT/(repo.lower().replace('/','--')+'.json')
    if f.exists():return
    record={'repository':repo,'licenseHint':row.get('license'),'language':row.get('primaryLanguage'),'description':row['description'],'files':[]}
    try:
        branch=urllib.parse.quote(row['branch'],safe='')
        pin=api('repos/'+repo+'/commits/'+branch,'application/vnd.github.sha').decode().strip()
        if not re.fullmatch('[a-f0-9]{40}',pin):raise ValueError('invalid pin')
        record['commit']=pin
        tree=json.loads(api('repos/'+repo+'/git/trees/'+pin+'?recursive=1'))
        blobs=[x for x in tree['tree'] if x['type']=='blob' and x['mode']=='100644' and not BAD.search(x['path'])]
        record['truncated']=tree['truncated']
        record['licenses']=[x['path'] for x in blobs if re.search(r'(^|/)(license|licence|copying|notice)([.].*)?$',x['path'],re.I)][:80]
        record['previews']=[x['path'] for x in blobs if re.search(r'(screenshot|screen[-_ ]?shot|(^|/)preview|gameplay|demo\.|game[-_]screen)',x['path'],re.I) and x['path'].lower().endswith(('.png','.jpg','.jpeg','.gif','.webp'))][:10]
        options=sorted([x for x in blobs if x['path'].rsplit('.',1)[-1].lower() in SUFFIXES and 100<=x.get('size',0)<=400_000],key=lambda x:-priority(x,repo))
        record['otherPaths']=[x['path'] for x in options[:30]]
        picks=options[:4]
        readmes=[x['path'] for x in blobs if re.fullmatch(r'README(\.md|\.rst|\.txt)?',x['path'],re.I)]
        if readmes:
            record['readmePath']=readmes[0]
            try:record['readme']=raw(repo,pin,readmes[0],9000)
            except Exception:pass
        for x in picks:
            try:source=raw(repo,pin,x['path'],60000)
            except Exception:continue
            indicators=[{'line':i,'text':l.strip()[:160]} for i,l in enumerate(source.splitlines(),1) if VIS.search(l)]
            if indicators:record['files'].append(dict(path=x['path'],gitBlob=x['sha'],bytes=x['size'],indicators=indicators[:8]))
    except Exception as e: record['error']=str(e)[:180]
    f.write_text(json.dumps(record))

def run():
    groups=candidates()
    pool={}
    for game,group in groups.items():
        ranked=sorted(group.values(),key=lambda row:-score(row))
        # Strongest candidates plus alternate implementation languages per game.
        picks=ranked[:6]
        langs={r['primaryLanguage'] for r in picks}
        for r in ranked[6:]:
            if len(picks)>=9:break
            if r['primaryLanguage'] not in langs:langs.add(r['primaryLanguage']);picks.append(r)
        for r in picks:pool[r['nameWithOwner'].lower()]=r
    pending=[r for k,r in pool.items() if not (AUDIT/(k.replace('/','--')+'.json')).exists()]
    print('inspect',len(pending),'of',len(pool),'for',len(groups),'games',flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        for i,_ in enumerate(executor.map(inspect,pending),1):
            if i%20==0:print('processed',i,flush=True)
if __name__=='__main__':run()
