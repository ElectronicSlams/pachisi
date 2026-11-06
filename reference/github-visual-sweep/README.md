# Public GitHub visual design sweep · November 2026

This second, dated research collection brings selected original renderer or UI files into the repository. The [November 1 selection](../public-games/README.md) is preserved separately. Every game has findings in the [per-game report](../../docs/research/github-visual-sweep/README.md), including related games and link-only examples.

- [SOURCES.json](SOURCES.json) lists the selected repositories, relevant games, full commit IDs, root license declarations and reviewed file paths.
- [MANIFEST.json](MANIFEST.json) records the source URL, byte length, Git blob ID and SHA-256 of every local snapshot file.
- Each entry under `sources/` retains its original bytes and upstream license documents. The snapshots are partial and may reference omitted code or artwork. No upstream code is executed by the catalogue, installed as a dependency or distributed in the library package. Upstream images in the research report are pinned links, including the separately inspected visual examples.
- Upstream rights apply individually, including copyleft terms where present. The repository's root MIT license does not relicense these files. Package adoption requires a separate provenance and implementation decision.

Root licences declared in `SOURCES.json` for the 77 sources: MIT 60, Apache-2.0 6, GPL-3.0 6, BSD-3-Clause 3, GPL-2.0 1, CC0-1.0 1. The copyleft sources are `futaalice--futahex2` (GPL-2.0) and `abdullahjamal1--battleshipboardgame`, `farindk--morris`, `juef17--librebridge`, `juzzlin--dustracing2d`, `popojan--goban` and `san-santra--pyboxing` (GPL-3.0). `junosan--nama` is declared Apache-2.0, and its upstream `NOTICE` also carries LGPL-2.1 and BSD notices. Moving the copyleft snapshots to link-only pins is a pending legal decision; see [NOTICE.md](../../NOTICE.md).

Run `pnpm check:design-sources` for offline verification of both collections. To restore missing reviewed blobs from their pinned commits, run `python3 -I scripts/import-public-designs.py --collection github-visual-sweep`.

The discovery process is reproducible in stages. `scripts/sweep-github-designs.py` collects the search pages, and `scripts/inspect-github-designs.py` samples likely new renderers at their commit IDs. The dated research directory preserves the compressed search and inspection ledgers even without the ignored working cache. The authored TSV selections and visual observations are the decisions that turn automated hits into curated findings. `scripts/curate-github-sweep.py` checks those selected files and license documents before the pinned importer runs. `scripts/report-github-sweep.py` reconciles the archive, pins, query pages and per-game catalogue without executing upstream code. Live search results may differ on a later date.
