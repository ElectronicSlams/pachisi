# Public game-design reference collection

This is a non-canonical, read-only research collection, reviewed on **2026-11-01**. It contains selected design source and assets from 38 public GitHub repositories, mapped to all 50 Pachisi games. The detailed [research report](../../docs/research/public-game-designs.md) records 57 searches, 270 distinct candidates and 49 deeper repository inspections. It is not an exhaustive archive of public GitHub.

- [SOURCES.json](SOURCES.json): source repositories, full immutable commits, selected upstream paths, purpose, game mappings, license declarations and exclusions.
- [MANIFEST.json](MANIFEST.json): every imported file, original URL, Git blob ID, SHA-256, length and modification status.
- `sources/<owner--repo>@<commit-prefix>/`: 443 selected files, including original licenses/README notices and 148 SVGs. 442 files retain their original bytes. The Spades README has two Mailgun API key occurrences replaced with `REDACTED_MAILGUN_API_KEY`; its original Git blob and the redacted SHA-256 are recorded separately.
- [Search evidence](../../docs/research/github-design-search-2026-11-01.json): all query results and inspection dispositions, including candidates that were not imported.

## Authority and reuse

Pachisi `src/` and `styles/` remain the supported implementation. No files in this collection are imported, compiled, executed or shipped in the Pachisi package. These source selections are generally **not standalone runnable upstream applications**: dependencies, servers, build outputs, trained models, fonts, sounds and most application assets are deliberately omitted.

Each source retains **its own upstream license**, not Pachisi's MIT license. Read the accompanying LICENSE/COPYING/NOTICE and the per-source limitations before reuse. The collection includes MIT, Apache-2.0, BSD, CC0, GPL and AGPL material. Copyleft files are references, not pre-cleared MIT contributions. Any future implementation port must record its provenance and compatible licensing separately. Licenses are upstream declarations, not an independent warranty of every possible right.

Known mixed-license material was excluded: cm-chessboard's Staunty pieces, noncommercial sound packs in PlayHex and The Evolution of Trust, PettingZoo's Minecraft font, PGX's separately sourced piece images, Atari ROMs, provider marks and game/participant logs. Original copyright contact details inside license notices are retained. Vector cards retain the upstream MIT notice and README's public-domain artwork attribution; FluffyStuff's two Mahjong tile sets retain their explicit CC0 dedication.

## Verify or extend

```sh
pnpm check:design-sources
python3 -I scripts/import-public-designs.py
python3 -I scripts/catalogue-public-designs.py
```

The first command works offline and verifies every byte against the manifest and pinned Git blob ID, with the explicitly declared credential redaction checked against its own pinned hash. The second fetches only missing, explicitly selected blobs; it never installs dependencies or runs upstream code. The third regenerates Pachisi-authored metadata and documentation, not upstream source. New imports must be reviewed and appended with a new immutable pin; never silently rewrite an existing snapshot. Declared credential redactions are applied only after verifying the original downloaded blob, before writing it to disk.

The catalogue uses a small authored metadata index (`catalogue/public-design-sources.json`) and links to pinned upstream source. It does not load these archived modules or make network requests for third-party art.
