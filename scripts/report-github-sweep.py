"""Compile the local, reviewable research ledger and catalogue index. No network access."""
import csv
import gzip
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'artifacts/github-visual-sweep'
DOC=ROOT/'docs/research/github-visual-sweep'
BASE=ROOT/'reference/github-visual-sweep'
GAMES=json.loads((ROOT/'docs/game-coverage.json').read_text())['games']
OLD=json.loads((ROOT/'docs/research/github-design-search-2026-11-01.json').read_text())
def gz(name, data):
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()
    (DOC/name).write_bytes(gzip.compress(payload,mtime=0))

def build():
    by_game=defaultdict(set); queries={};repos={};hits=0
    for path in sorted(CACHE.glob('*_*_*.json')):
        item=json.loads(path.read_text());game=item['game'];q=item['q'];page=int(path.stem.rsplit('_',1)[1])+1;result=item['result']
        ledger=queries.setdefault((game,q),{'game':game,'query':q+' is:public fork:false','pages':[]})
        names=[]
        for node in result['nodes']:
            if node['isPrivate'] or node['isFork']:continue
            key=node['nameWithOwner'].lower()
            repos[key]=node['nameWithOwner']
            by_game[game].add(key);names.append(key);hits+=1
        ledger['pages'].append({'page':page,'reportedTotal':result['repositoryCount'],'incomplete':result['incomplete'],'repositories':names})
    assert len(queries)==150 and len(by_game)==50
    pending=[];capped=[];incomplete=0
    for (slug,q),entry in sorted(queries.items()):
        pages=sorted(entry['pages'],key=lambda p:p['page'])
        assert [p['page'] for p in pages]==list(range(1,len(pages)+1))
        end=pages[-1]
        if end['page']<10 and len(end['repositories'])==100 and end['reportedTotal']>end['page']*100:pending.append(q)
        if any(p['reportedTotal']>1000 for p in pages):capped.append(q)
        incomplete+=sum(p['incomplete'] for p in pages)
    if pending:raise ValueError('Unfinished searches: '+str(len(pending)))
    audit={}; successful=set()
    for f in sorted((CACHE/'inspections').glob('*.json')):
        a=json.loads(f.read_text());k=a['repository'].lower()
        if k not in repos:continue
        if 'truncated' in a:successful.add(k)
        audit[k]={'repository':a['repository'],'commit':a.get('commit'),'licenseHint':a.get('licenseHint'),'truncatedTree':a.get('truncated'),
                  'status':'tree sampled' if k in successful else 'inspection failed','previewPaths':a.get('previews',[]),
                  'evidence':[{'path':x['path'],'gitBlob':x['gitBlob'],'detectedLines':[i['line'] for i in x['indicators']]} for x in a['files']]}
    # Preserve all matches and pins without making the web application ship the candidate dump.
    numbering={name:i for i,name in enumerate(sorted(repos))}
    for entry in queries.values():
        for page in entry['pages']:page['repositories']=[numbering[x] for x in page['repositories']]
    gz('discovery.json.gz',{'repositories':[repos[k] for k in sorted(repos)],'queries':[v for _,v in sorted(queries.items())]})
    gz('inspections.json.gz',list(audit.values()))
    findings=json.loads((DOC/'findings.json').read_text())
    notes={r['repository']:r for r in csv.DictReader((DOC/'visual-notes.tsv').open(),delimiter='\t')}
    manifest=json.loads((BASE/'MANIFEST.json').read_text())
    files={(f['sourceId'],f['upstreamPath']):f for f in manifest['files']}
    selections=json.loads((BASE/'SOURCES.json').read_text())['sources']
    old={r['full_name'].lower() for query in OLD['queries'] for r in query['repositories']}
    games=[]
    for g in GAMES:
        results=[]
        for r in findings:
            if r['game']!=g['slug']:continue
            repo=r['repository'];pin=r['commit'];assert pin==audit[repo.lower()]['commit']
            base=f'https://github.com/{repo}/blob/{pin}/'
            path=r['file'];line=r['evidence']['line']
            local=files.get((r['sourceId'],path))
            assert bool(local)==r['archived']
            observation=notes.get(repo)
            results.append({'repository':repo,'commit':pin,'relationship':r['relationship'],'idea':r['design'],
                          'license':r['license'],'file':path,'sourceUrl':base+quote(path,safe='/')+'#L'+str(line),
                          'localPath':local['path'] if local else None,'linkReason':r['reason'],
                          'visualNote':observation['observation'] if observation else None,
                          'previewUrl':base+quote(observation['image'],safe='/') if observation else None})
        assert results,g['slug']
        games.append({'slug':g['slug'],'name':g['name'],'candidates':len(by_game[g['slug']]),'sampled':len(by_game[g['slug']]&successful),'findings':results})
    stats={'games':len(games),'queries':len(queries),'pages':sum(len(v['pages']) for v in queries.values()),'matches':hits,'distinctCandidates':len(repos),
           'newVsPreviousSearch':len(repos.keys()-old),'pinnedInspections':len(successful),'failedInspections':len(audit)-len(successful),
           'cappedQueries':len(capped),'incompletePages':incomplete,'selectedRepositories':len({r['repository'] for r in findings}),
           'gameMappings':len(findings),'visualReviews':len(notes),'archivedRepositories':len(selections),'archivedFiles':len(files)}
    index={'startedOn':'2026-11-03','completedOn':'2026-11-04','summary':stats,'games':games}
    (ROOT/'catalogue/github-visual-sweep.json').write_text(json.dumps(index,indent=2,ensure_ascii=False)+'\n')
    text=['# GitHub visual-design sweep · 4 November 2026','',
          f"Across **50 games**, {stats['queries']} targeted searches returned {hits:,} repository hits and **{len(repos):,} distinct public repository names**. {stats['newVsPreviousSearch']:,} had not appeared in the previous search ledger. The local tree/source sampler completed **{len(successful)} pinned inspections**. The curated set contains **{len(findings)} game-to-design mappings across {stats['selectedRepositories']} repositories**. {len(notes)} repositories have visual notes from inspection of their upstream images.",
          '',f"**Material brought into Pachisi.** [The source snapshot collection](../../../reference/github-visual-sweep/README.md) contains {len(files)} verbatim files from {len(selections)} repositories. Other curated entries link to pinned originals. These research selections add zero to the existing 170 usable game/design pairs.",
          '','## How to read the findings','',
          'Game screens and board components are direct visual references. A rule variant, related experiment, scoring surface or physics relative has a narrower scope. For example, an e-ink cribbage pegboard supports score tracking, whereas the bundled Cribbage trace covers a discard/showdown game. An archived code selection is a partial source snapshot. Independent implementations still need a separate port and local behavioral tests.',
          '',f"**Search boundary.** Queries used GitHub repository search with public visibility and forks excluded. The collector followed pages of 100 until the last available page or GitHub’s 1,000-result limit. {len(capped)} queries reported more than 1,000 matches and {incomplete} page responses were flagged incomplete. Search indexing and ranking can change during pagination. This covers every Pachisi game and the accessible pages for these queries, not every repository on GitHub. [GitHub search limits](https://docs.github.com/en/rest/search/search#about-search).",
          '','The sampler ranked new candidates by game/UI terms, language, license hint and popularity, with additional languages represented. It read a commit tree, looked for license and preview files, and sampled likely rendering code. A rendering keyword alone does not establish a match. The curated findings were selected separately and point to specific blobs. Candidate totals exclude private repositories and forks. Per-game repository totals overlap.',
          '','[All query pages and returned repository IDs](discovery.json.gz) · [Pinned inspection evidence and dispositions](inspections.json.gz) · [Curated selections](selections.tsv) · [Visual observations](visual-notes.tsv) · [Previous local census](../local-game-design-census.md).','']
    text+=['## Strong port candidates','',
           '| Game | Design to study | Requirement before making it selectable |','|---|---|---|',
           '| Goofspiel | Dedicated canvas renderer and replay viewer | Map prize, both bid backs and their simultaneous reveal to public trace phases. |',
           '| Bridge | Four named seat edges and bidding history | Show the dummy only when the supplied viewer state permits it. Separate bidding from play. |',
           '| Cribbage | E-ink peg track with a left-hand score key | Supply actual pegging scores. The compact showdown trace alone cannot drive this surface. |',
           '| Go | Perspective goban with stone bowls | Test hit targets and coordinate mapping at every supported size before adopting the camera. |',
           '| Dou Dizhu | Full bottom hand with compact opponent information | Keep each private hand scoped to its owner and fit long hands on phones. |',
           '| Pentago | Four red trays around black and white marbles | Keep quadrant boundaries legible through a rotation. Animate only the resolved change. |','']
    for game in games:
        text+=[f"## {game['name']}",'',f"{game['candidates']:,} candidates · {game['sampled']} of those repositories received a pinned tree inspection.",'']
        for r in game['findings']:
            text+=[f"- **{r['repository']}** ({r['relationship']}). {r['idea']} "+(r['visualNote']+' ' if r['visualNote'] else '')+f"[Pinned source]({r['sourceUrl']})"+(f" · [Reviewed image]({r['previewUrl']})" if r['previewUrl'] else '')+(f" · [Local source](../../../{quote(r['localPath'],safe='/@')})" if r['localPath'] else ' · Link only')+f" · {r['license']}."]
        text+=['']
    (DOC/'README.md').write_text('\n'.join(text)+'\n')
    print(json.dumps(stats))
if __name__=='__main__':build()
