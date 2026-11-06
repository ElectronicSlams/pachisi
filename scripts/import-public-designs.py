#!/usr/bin/env python3
"""Fetch explicitly selected public source blobs, or verify their offline evidence.

Never executes or installs imported code. Snapshots retain original bytes except for
explicitly declared, hash-pinned credential redactions. Edit the
source selection only to append reviewed files/sources, each pinned to a full commit.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'reference/public-games'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def verify_redaction(data, item):
    evidence = item['redaction']
    if (evidence['kind'] != 'mailgun-api-key' or
        sha(data) != evidence['sha256'] or len(data) != evidence['bytes'] or
        data.count(b'REDACTED_MAILGUN_API_KEY') != evidence['occurrences'] or
        re.search(rb'\b(?:key-[0-9a-fA-F]{32}|[0-9a-fA-F]{32}-[0-9a-fA-F]{8}-[0-9a-fA-F]{8})\b', data)):
        raise ValueError('Redacted snapshot mismatch: ' + item['path'])

def target(source, item):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', source['repository']):
        raise ValueError('Invalid public repository name')
    parts = PurePosixPath(item['path'])
    if parts.is_absolute() or '..' in parts.parts or '\\' in item['path']:
        raise ValueError('Unsafe source path')
    if not re.fullmatch(r'[a-z0-9_.-]+--[a-z0-9_.-]+', source['id']):
        raise ValueError('Invalid source id')
    if not re.fullmatch(r'[0-9a-f]{40}', source['commit']):
        raise ValueError('Source must pin a full commit')
    return BASE / 'sources' / (source['id'] + '@' + source['commit'][:12]) / parts

def fetch(pair):
    source, item = pair
    path = target(source, item)
    url = f'https://raw.githubusercontent.com/{source["repository"]}/{source["commit"]}/' + urllib.parse.quote(item['path'], safe='/')
    data = path.read_bytes() if path.exists() else urllib.request.urlopen(url, timeout=60).read(2_000_001)
    if path.exists() and 'redaction' in item:
        verify_redaction(data, item)
    else:
        if len(data) > 2_000_000 or len(data) != item['bytes'] or blob(data) != item['gitBlob']:
            raise ValueError('Pinned blob mismatch or size limit: ' + source['id'] + '/' + item['path'])
        if 'redaction' in item:
            data = re.sub(rb'\b(?:key-[0-9a-fA-F]{32}|[0-9a-fA-F]{32}-[0-9a-fA-F]{8}-[0-9a-fA-F]{8})\b', b'REDACTED_MAILGUN_API_KEY', data)
            verify_redaction(data, item)
    # Reject active or externally dependent SVG content; never silently rewrite upstream bytes.
    if path.suffix == '.svg':
        text = data.decode('utf8')
        if re.search(r'<\s*(script|foreignObject|image)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["\'](?:https?:|//|data:|javascript:)', text, re.I):
            raise ValueError('SVG needs separate review: ' + item['path'])
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists(): path.write_bytes(data)
    entry = {'sourceId': source['id'], 'upstreamPath': item['path'], 'path': path.relative_to(ROOT).as_posix(),
             'url': url, 'gitBlob': item['gitBlob'], 'sha256': sha(data), 'bytes': len(data), 'modified': 'redaction' in item}
    if 'redaction' in item: entry['redaction'] = item['redaction']['kind']
    return entry

def verify(selection):
    manifest = json.loads((BASE/'MANIFEST.json').read_text())
    expected = {(s['id'], f['path']): (s,f) for s in selection['sources'] for f in s['files']}
    seen = set()
    for entry in manifest['files']:
        key = (entry['sourceId'],entry['upstreamPath'])
        if key in seen or key not in expected: raise ValueError('Unexpected/duplicate manifest entry: '+str(key))
        seen.add(key)
        s,f = expected[key]; path = target(s,f)
        if entry['path'] != path.relative_to(ROOT).as_posix(): raise ValueError('Target mismatch')
        url = f'https://raw.githubusercontent.com/{s["repository"]}/{s["commit"]}/' + urllib.parse.quote(f['path'], safe='/')
        if entry['url'] != url or entry['gitBlob'] != f['gitBlob'] or entry['modified'] is not ('redaction' in f):
            raise ValueError('Provenance mismatch: '+entry['path'])
        data = path.read_bytes()
        if sha(data) != entry['sha256'] or len(data) != entry['bytes']:
            raise ValueError('Snapshot changed: '+entry['path'])
        if 'redaction' in f:
            if entry.get('redaction') != f['redaction']['kind']: raise ValueError('Redaction provenance mismatch')
            verify_redaction(data, f)
        elif blob(data) != f['gitBlob'] or len(data) != f['bytes']:
            raise ValueError('Snapshot changed: '+entry['path'])
    if seen != set(expected): raise ValueError('Missing source files')
    actual = {p.relative_to(ROOT).as_posix() for p in (BASE/'sources').rglob('*') if p.is_file()}
    if actual != {e['path'] for e in manifest['files']}: raise ValueError('Unmanifested snapshot files')
    for s in selection['sources']:
        if not any(re.match(r'(?i)^(licen[sc]e|copying)(\..*)?$',f['path']) for f in s['files']):
            raise ValueError('Missing root license: '+s['id'])
    redacted = sum('redaction' in f for s in selection['sources'] for f in s['files'])
    print(f'Public design snapshots verified: {len(selection["sources"])} repositories, {len(seen)-redacted} byte-identical files, {redacted} explicitly redacted files; no source executed.')

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true')
    parser.add_argument('--collection',choices=['public-games','github-visual-sweep'],default='public-games')
    args=parser.parse_args()
    BASE=ROOT/'reference'/args.collection
    selection=json.loads((BASE/'SOURCES.json').read_text())
    if not args.verify:
        pairs=[(s,f) for s in selection['sources'] for f in s['files']]
        existing = BASE/'MANIFEST.json'
        if existing.exists():
            old = json.loads(existing.read_text())
            planned = {target(s,f).relative_to(ROOT).as_posix() for s,f in pairs}
            if not {f['path'] for f in old['files']} <= planned:
                raise ValueError('Existing snapshots are append-only; selection would remove files')
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: files=list(pool.map(fetch,pairs))
        (BASE/'MANIFEST.json').write_text(json.dumps({'schemaVersion':1,'reviewedOn':selection['reviewedOn'],'files':files},indent=2)+'\n')
    verify(selection)
