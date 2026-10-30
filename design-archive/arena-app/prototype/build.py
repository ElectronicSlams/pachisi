#!/usr/bin/env python3
"""
build.py  [agent E]  eSlams Arena app prototype, single-file build.

Reads  prototype/src/index.html  and writes one self-contained file:
    ../eSlams Arena App.html      (next to the brief, one level above prototype/)

What it does
  * Every local  <link rel="stylesheet" href="...css">  becomes  <style>...</style>  in place.
  * Every local  <script src="...js"></script>          becomes  <script>...</script> in place.
  * Remote references (https://fonts.googleapis.com, preconnects, anything with a scheme or //) stay as they are.
  * Nothing else is copied. No minification, no timestamps: the same sources always give the same bytes.

Paths in index.html may be written relative to src/ ("tokens.css") or to prototype/ ("src/tokens.css").
Both resolve. A referenced file that does not exist yet is not an error: a warning is printed and an
empty block (<style data-src="..."></style> / <script data-src="..."></script>) is written in its place.
If src/index.html itself does not exist yet, a placeholder shell that follows the load order in
CONTRACT.md is built from whichever src files exist (clearly marked in a comment and in the warnings).

Usage
    python3 build.py              build, warn on gaps, exit 0
    python3 build.py --strict     same, but exit 1 if anything was missing (for CI / final QA)
    python3 build.py --out PATH   write somewhere else (default: ../eSlams Arena App.html)

Stdlib only, Python 3.8+.
"""
import os
import re
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))           # .../prototype
SRC_DIR = os.path.join(HERE, 'src')
INDEX = os.path.join(SRC_DIR, 'index.html')
DEFAULT_OUT = os.path.join(os.path.dirname(HERE), 'eSlams Arena App.html')

# Load order from CONTRACT.md, used only for the placeholder shell when index.html is missing.
SHELL_CSS = ['tokens.css', 'boards.css', 'app.css', 'canvas.css']
SHELL_JS = ['assets.js', 'data.js', 'engines.js', 'boards.js', 'app.js']
FONTS_LINK = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;650;700'
              '&family=JetBrains+Mono:wght@400;500;600&display=swap">')

REMOTE = re.compile(r'^(?:[a-zA-Z][a-zA-Z0-9+.\-]*:|//)')    # http:, https:, data:, mailto:, //cdn...
ATTR = re.compile(r'([^\s"\'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'=<>`]+)))?')
LINK_TAG = re.compile(r'<link\b[^>]*>', re.I)
SCRIPT_TAG = re.compile(r'<script\b([^>]*)>\s*</script\s*>', re.I)
COMMENT_SPLIT = re.compile(r'(<!--.*?-->)', re.S)

warnings = []
inlined = []


def warn(msg):
    warnings.append(msg)
    sys.stderr.write('warning: %s\n' % msg)


def parse_attrs(attr_text):
    out = {}
    for m in ATTR.finditer(attr_text):
        name = m.group(1).lower()
        val = m.group(2) if m.group(2) is not None else (m.group(3) if m.group(3) is not None else m.group(4))
        out[name] = val if val is not None else ''
    return out


def is_local(ref):
    return bool(ref) and not REMOTE.match(ref.strip())


def resolve(ref):
    """Return (existing_path_or_None, display_path)."""
    clean = urllib.parse.unquote(ref.split('#', 1)[0].split('?', 1)[0].strip())
    clean = clean[2:] if clean.startswith('./') else clean
    candidates = [os.path.join(SRC_DIR, clean), os.path.join(HERE, clean)]
    if clean.startswith('src/'):
        candidates.append(os.path.join(SRC_DIR, clean[4:]))
    root_real = os.path.realpath(HERE)
    for c in candidates:
        real = os.path.realpath(c)
        if os.path.isfile(real) and (real == root_real or real.startswith(root_real + os.sep)):
            return real, clean
    return None, clean


def read_text(path):
    with open(path, 'r', encoding='utf-8-sig', newline='') as f:
        return f.read().replace('\r\n', '\n').strip('\n')


def make_style(ref, attrs):
    path, shown = resolve(ref)
    media = ' media="%s"' % attrs['media'] if attrs.get('media') else ''
    if path is None:
        warn('missing stylesheet %s, inlined an empty <style>' % shown)
        return '<style data-src="%s"%s></style>' % (shown, media)
    css = read_text(path)
    if re.search(r'</style', css, re.I):
        warn('%s contains "</style"; escaped for inlining' % shown)
        css = re.sub(r'</(style)', r'<\\/\1', css, flags=re.I)
    inlined.append((shown, len(css.encode('utf-8'))))
    return '<style data-src="%s"%s>\n%s\n</style>' % (shown, media, css)


def make_script(ref, attrs):
    path, shown = resolve(ref)
    keep = ''
    if attrs.get('type'):
        keep += ' type="%s"' % attrs['type']
    if path is None:
        warn('missing script %s, inlined an empty <script>' % shown)
        return '<script data-src="%s"%s></script>' % (shown, keep)
    js = read_text(path)
    # Keep the HTML parser inside the script element: no literal "</script" and no "<!--".
    js = re.sub(r'</(script)', r'<\\/\1', js, flags=re.I)
    js = js.replace('<!--', '<\\!--')
    inlined.append((shown, len(js.encode('utf-8'))))
    return '<script data-src="%s"%s>\n%s\n</script>' % (shown, keep, js)


def inline_segment(text):
    def link_sub(m):
        attrs = parse_attrs(m.group(0)[5:-1])
        rel = (attrs.get('rel') or '').lower().split()
        href = attrs.get('href')
        if not is_local(href or ''):
            return m.group(0)
        if 'stylesheet' in rel:
            return make_style(href, attrs)
        warn('local <link rel="%s" href="%s"> left as is (only stylesheets are inlined)' % (' '.join(rel), href))
        return m.group(0)

    def script_sub(m):
        attrs = parse_attrs(m.group(1))
        src = attrs.get('src')
        if not is_local(src or ''):
            return m.group(0)
        return make_script(src, attrs)

    text = LINK_TAG.sub(link_sub, text)
    text = SCRIPT_TAG.sub(script_sub, text)
    return text


def inline_html(html):
    # Comments are passed through untouched so a commented-out tag is never inlined.
    parts = COMMENT_SPLIT.split(html)
    return ''.join(p if p.startswith('<!--') else inline_segment(p) for p in parts)


def placeholder_shell():
    warn('src/index.html not found: building a placeholder shell from the files that exist')
    css = '\n    '.join(make_style(n, {}) for n in SHELL_CSS)
    js = '\n    '.join(make_script(n, {}) for n in SHELL_JS)
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>eSlams Arena App</title>\n'
            '<!-- build.py: src/index.html was missing; this is a placeholder shell, not the prototype -->\n'
            '%s\n    %s\n</head>\n<body>\n<div id="phone" data-theme="dark"></div>\n    %s\n</body>\n</html>\n'
            % (FONTS_LINK, css, js))


def human(n):
    return '%d bytes (%.1f KB, %.2f MB)' % (n, n / 1024.0, n / 1048576.0)


def main(argv):
    out_path = DEFAULT_OUT
    strict = False
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--strict':
            strict = True
        elif a == '--out' and i + 1 < len(argv):
            i += 1
            out_path = os.path.abspath(argv[i])
        else:
            sys.stderr.write(__doc__)
            return 2
        i += 1

    if os.path.isfile(INDEX):
        html = inline_html(read_text(INDEX) + '\n')
    else:
        html = placeholder_shell()

    data = html.encode('utf-8')
    tmp = out_path + '.tmp'
    try:
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, out_path)           # atomic, so a half-written file is never opened
    except OSError as e:
        sys.stderr.write('error: cannot write %s: %s\n' % (out_path, e))
        return 1

    for shown, size in inlined:
        print('  inlined %-22s %8d bytes' % (shown, size))
    print('wrote %s' % out_path)
    print('size  %s' % human(len(data)))
    if warnings:
        print('%d warning(s), see above' % len(warnings))
    return 1 if (strict and warnings) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
