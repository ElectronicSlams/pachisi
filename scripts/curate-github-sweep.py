"""Verify the explicitly curated files at their inspected commits and prepare the selection.
Needs the search/inspection cache. No upstream module is imported or executed.
"""
import base64
import concurrent.futures
import csv
import hashlib
import json
import re
import subprocess
import urllib.parse
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'artifacts/github-visual-sweep'
BASE=ROOT/'reference/github-visual-sweep'
DOC=ROOT/'docs/research/github-visual-sweep'
REVIEWED='2026-11-04'

def pinned_file(repo,commit,path):
    q=urllib.parse.quote(path,safe='/')
    data=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/contents/{q}?ref={commit}']))
    if data.get('type')!='file' or data.get('encoding')!='base64' or data.get('target') or data.get('submodule_git_url'):raise ValueError('Not an ordinary text blob: '+path)
    raw=base64.b64decode(data['content'])
    digest=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    assert digest==data['sha'] and data['size']==len(raw)
    return {'path':path,'bytes':len(raw),'gitBlob':digest}, raw.decode('utf-8-sig',errors='replace')

terms={'MIT':'permission is hereby granted','ISC':'permission to use','Apache-2.0':'apache license','BSD-3-Clause':'redistribution and use','BSD-2-Clause':'redistribution and use','GPL-3.0':'gnu general public license','GPL-2.0':'gnu general public license','AGPL-3.0':'gnu affero general public license','CC0-1.0':'cc0'}
def verify(pair):
    repo,items=pair;sid=repo.lower().replace('/','--')
    audit=json.loads((CACHE/'inspections'/(sid+'.json')).read_text())
    pin=audit['commit']; assert re.fullmatch('[0-9a-f]{40}',pin)
    hint=audit.get('licenseHint')
    paths=sorted(set(item['file'] for item in items))
    evidence={}
    blobs=[]
    exclude=''
    for path in paths:
        meta,source=pinned_file(repo,pin,path)
        blanks=source.splitlines()
        listed=next((f for f in audit['files'] if f['path']==path),None)
        if listed:assert listed['gitBlob']==meta['gitBlob']
        line=listed['indicators'][0]['line'] if listed and listed['indicators'] else 1
        evidence[path]={'path':path,'gitBlob':meta['gitBlob'],'line':line}
        blobs.append(meta)
        if len(blanks)<2 or len(source)>200_000 or max(map(len,blanks),default=0)>5000:exclude='Large or bundled source retained as a link.'
        if re.search(r'data:(?:image|audio|font)|SPDX-License-Identifier:\s*(?!'+re.escape(hint or 'none')+r'\b)\S|non-commercial use only|all rights reserved.{0,60}no part',source,re.I):exclude='Embedded material or file-level terms require separate review.'
        (CACHE/'curation').mkdir(exist_ok=True)
        (CACHE/'curation'/(sid+'-'+meta['gitBlob']+'.txt')).write_text(source)
    licenses=audit.get('licenses',[])
    root=[p for p in licenses if '/' not in p and re.fullmatch(r'(licen[cs]e|copying)(\..*)?',p,re.I)]
    if hint not in terms or not root:exclude='No supported, identified root license/document pair in this review.'
    if not exclude:
        notices=[p for p in licenses if '/' not in p or any(PurePosixPath(p).parent in PurePosixPath(f).parents for f in paths)]
        for path in sorted(set(notices)):
            meta,lic=pinned_file(repo,pin,path);blobs.append(meta)
            if path in root and terms[hint] not in lic.lower():exclude='License text needs individual interpretation.'
            if '/' in path and not re.match('notice',PurePosixPath(path).name,re.I):exclude='Nested terms require individual reconciliation.'
    source=None if exclude else {'id':sid,'repository':repo,'commit':pin,'license':hint,'kind':'renderer','games':sorted(set(i['game'] for i in items)),'idea':' '.join(dict.fromkeys(i['design'] for i in items)),'limits':'Selected presentation source only. Original license and applicable notices retained. Dependencies and media omitted.','files':sorted(blobs,key=lambda b:b['path'])}
    findings=[dict(item,commit=pin,license=hint or 'Unspecified',evidence=evidence[item['file']],sourceId=sid,archived=source is not None,reason=exclude) for item in items]
    return source,findings

def main():
    with (DOC/'selections.tsv').open() as f:rows=list(csv.DictReader(f,delimiter='\t'))
    groups={}
    for item in rows:groups.setdefault(item['repository'],[]).append(item)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as e: results=list(e.map(verify,sorted(groups.items())))
    sources=[s for s,_ in results if s]
    BASE.mkdir(parents=True,exist_ok=True)
    (BASE/'SOURCES.json').write_text(json.dumps({'schemaVersion':1,'reviewedOn':REVIEWED,'sources':sources},indent=2)+'\n')
    findings=[item for _,items in results for item in items]
    (DOC/'findings.json').write_text(json.dumps(findings,indent=2)+'\n')
    print(f'{len(findings)} curated mappings, {len(groups)} repositories, {len(sources)} admitted snapshots',flush=True)
if __name__=='__main__':main()
