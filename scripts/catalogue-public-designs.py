#!/usr/bin/env python3
"""Generate authored catalogue/docs metadata; never imports or executes reference code."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
selection=json.loads((ROOT/'reference/public-games/SOURCES.json').read_text())
coverage=json.loads((ROOT/'docs/game-coverage.json').read_text())
search=json.loads((ROOT/'docs/research/github-design-search-2026-11-01.json').read_text())
sources=[]
for source in selection['sources']:
    s={k:v for k,v in source.items() if k!='files'}
    s['fileCount']=len(source['files']);s['bytes']=sum(f['bytes'] for f in source['files'])
    s['url']=f'https://github.com/{s["repository"]}/tree/{s["commit"]}'
    s['snapshotPath']=f'reference/public-games/sources/{s["id"]}@{s["commit"][:12]}'
    s['licensePaths']=[f['path'] for f in source['files'] if Path(f['path']).name.lower().startswith(('license','licence','copying','notice'))]
    s['reuse']='copyleft' if 'GPL' in s['license'] else 'public-domain' if s['license']=='CC0-1.0' else 'permissive'
    sources.append(s)
# State the mismatch instead of making a shared asset look like a dedicated game screen.
gaps={
 'first-price-sealed-bid-auction':'Rules/information reference only. No exact licensed game-screen implementation was selected; public auction candidates were unlicensed or different auction formats.',
 'goofspiel':'Rules plus shared card assets. No dedicated licensed graphical Goofspiel UI was established in this search.',
 'dou-dizhu':'Shared card presentation and assets; no dedicated graphical Dou Dizhu UI was imported.',
 'bridge':'Bidding diagram plus shared card assets. Play-phase dummy, declarer perspective and trick layout still need a dedicated visual reference.',
 'blackjack':'Gymnasium includes graphical Blackjack rendering code. Its images and font are excluded. RLCard also supplies a terminal example, alongside shared card art.',
 'negotiation':'Related experimental bargaining UI, not the exact Core price/delivery negotiation variant.',
 'boxing-style-arena':'Related pose-based boxing overlay; no exact visual implementation of Core’s discrete two-agent arena.',
 'ice-hockey-style-arena':'Related real-time hockey camera/animation; no exact implementation of Core’s discrete rink.',
 'paddle-ball':'Related two-sided Pong reference; Core’s bottom-paddle collision model differs.',
 'lunar-lander':'Full Gymnasium/arcade renderers; neither is a drop-in implementation of Core lander-lite.',
 'car-racing':'Gymnasium Box2D renderer/physics; Core uses a different abstract lane model.',
 'bipedal-walker':'Gymnasium Box2D renderer/physics; Core uses abstract alternating steps.',
}
games=[]
for game in coverage['games']:
    hits=[s['id'] for s in sources if game['slug'] in s['games']]
    if not hits:raise ValueError('Unmapped game '+game['slug'])
    games.append({'slug':game['slug'],'name':game['name'],'category':game['category'],'variant':game['variant'],'ruleVariantNote':game.get('ruleVariantNote'),'sourceIds':hits,'coverageNote':gaps.get(game['slug'],'Dedicated or closely related visual references are included. Upstream rules, dependencies and assets are not automatically compatible with the declared Core variant.')})
summary={'games':len(games),'queries':len(search['queries']),'searchResults':sum(len(q['repositories']) for q in search['queries']),'uniqueCandidates':len({r['full_name'].lower() for q in search['queries'] for r in q['repositories']}),'deepInspections':len(search['deepInspections']),'repositories':len(sources),'files':sum(s['fileCount'] for s in sources),'bytes':sum(s['bytes'] for s in sources)}
output={'schemaVersion':1,'reviewedOn':selection['reviewedOn'],'summary':summary,'scope':search['scope'],'sources':sources,'games':games}
(ROOT/'catalogue/public-design-sources.json').write_text(json.dumps(output,indent=2)+'\n')
text=f'''# Public GitHub game-design collection — {selection['reviewedOn']}

This collection covers all **{summary['games']} Pachisi identities** through **{summary['queries']} targeted queries**, **{summary['searchResults']} search hits / {summary['uniqueCandidates']} distinct candidates**, and **{summary['deepInspections']} repository tree/license inspections**. It imports reviewed selections from **{summary['repositories']} repositories: {summary['files']} files, {summary['bytes']:,} bytes**, pinned to immutable commits. It does **not** claim to contain every public GitHub design. Search ranking is a discovery aid, not a quality or licensing judgment.

The actual files live in [reference/public-games](../../reference/public-games/README.md). The [selection](../../reference/public-games/SOURCES.json) records purpose, exclusions and selected upstream paths; the [manifest](../../reference/public-games/MANIFEST.json) records exact paths, Git blob IDs, SHA-256 and bytes. [Search evidence](github-design-search-2026-11-01.json) retains every query and result. No remote source was installed, built, imported into Pachisi, or executed. Dependencies and unrelated repository files are intentionally omitted.

## What was collected

- Native, SVG, canvas, DOM, React, Flutter and desktop board renderers; card-table and trick-play layouts; bidding/clue controls; control-task geometry and physics references.
- 148 SVGs: 80 original CC0 Mahjong tile faces/backs across two styles, 66 shared playing-card designs with upstream MIT/public-domain provenance, and two MIT Go stones.
- Original licenses, copyright headers, README attribution and applicable NOTICE files accompany the verbatim code/assets. Source code licensed under GPL/AGPL stays visibly identified as copyleft reference material. Nothing is relicensed as MIT merely by being in this repository.
- No missing-license source, noncommercial audio, Staunty chess art, Minecraft font, ROMs, provider logos, game logs, trained models or credentials were imported. Root licenses were checked against README asset exceptions and nested license paths. The licenses are upstream declarations, not a warranty that every possible downstream use is cleared.

## Every game and its variants

A mapping can be a dedicated renderer, a related variant, a shared asset or a rules/information reference. Those are deliberately distinguished. Variant names below are Pachisi’s existing declared Core variants, not claims about the upstream projects.

| Game | Declared Core variant | Imported references | Coverage boundary |
|---|---|---|---|
'''
for g in games:
    refs=[s for s in sources if s['id'] in g['sourceIds']]
    links='; '.join(f'[{s["repository"]}]({s["url"]}) ({s["kind"]})' for s in refs)
    variant=g['variant']+(f'<br/>{g["ruleVariantNote"]}' if g['ruleVariantNote'] else '')
    text+=f'| {g["name"]} | {variant} | {links} | {g["coverageNote"]} |\n'
text+='\n## Repository-by-repository inspection\n\n| Source / immutable commit | License | Files | Design value and exclusions |\n|---|---|---:|---|\n'
for s in sources:
    text+=f'| [{s["repository"]}@{s["commit"][:12]}]({s["url"]}) · [local files](../../{s["snapshotPath"]}) | {s["license"]} | {s["fileCount"]} | {s["idea"]} {s["limits"]} |\n'
text+='''
## Search limitations and rejected material

The broad search returned engines without graphics, no-license student projects, similarly named unrelated projects (for example Pentagon tooling for a Pentago query), reinforcement-learning training code without UI, and assets with separate rights. Seven follow-up queries improved sparse card/strategy categories. Known primary sources were inspected in addition to search-ranked results. “Not imported” in the research ledger means not selected for this collection; it does not mean the repository is unusable or incorrectly licensed.

Unlicensed Goofspiel repositories and auction examples remain linked in the search record. An oTree double auction is not a first-price sealed-bid UI. A poker or card-deck renderer is not a Bridge dummy implementation. These gaps remain explicit rather than filling them with misleading labels.

## Local validation and maintenance

Run `pnpm check:design-sources` for offline hash/blob/path/selection verification. It validates original bytes and never executes upstream code. `python3 -I scripts/import-public-designs.py` can fetch missing selected blobs at the recorded commits; it will not silently overwrite existing snapshots. `python3 -I scripts/catalogue-public-designs.py` regenerates the authored catalogue index and this report from the reviewed metadata.

The collection is excluded from the package, source compilation and application imports. Full Pachisi local CI verifies catalogue behavior and package boundaries; it does not certify or test upstream applications. Future adoption requires porting a specific design under its own license, updating the source manifest and adding Pachisi behavioral/geometry/accessibility tests.
'''
(ROOT/'docs/research/public-game-designs.md').write_text(text)
print(json.dumps(summary))
