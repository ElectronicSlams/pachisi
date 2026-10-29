# Mahjong tile asset source

- Base source: https://github.com/FluffyStuff/riichi-mahjong-tiles
- Base source commit: `26e127ba2117f45cdce5ea0225748cc0cfad3169`
- Base licence: CC0 1.0 Universal / public domain
- Base licence URL: https://creativecommons.org/publicdomain/zero/1.0/
- Flower and season source: https://github.com/xhokir/riichi-mahjong-tiles
- Flower and season source commit: `19d72ff5cf9ad9c401188734f80cef7e6c8c6140`
- Vendored-set licence: Creative Commons Attribution 4.0 International
- Licence URL: https://creativecommons.org/licenses/by/4.0/
- Optimizer: SVGO 4.0.0, multipass, precision 3
- Vendored: 2026-07-26

The xhokir fork adds four flower and four season faces and licenses its complete
set under CC BY 4.0. The numbered suits, winds, dragons, back, and blank derive
from the FluffyStuff CC0 base set. The files are vendored and optimized so Arena
never depends on a third-party image host at runtime.

## Deterministic filenames

| Arena value | Tile | Upstream face |
| --- | --- | --- |
| `B1`-`B9` | Bamboo 1-9 | `Sou1`-`Sou9` |
| `C1`-`C9` | Characters 1-9 | `Man1`-`Man9` |
| `D1`-`D9` | Dots 1-9 | `Pin1`-`Pin9` |
| `WE`, `WS`, `WW`, `WN` | East, South, West, North winds | `Ton`, `Nan`, `Shaa`, `Pei` |
| `DR`, `DG`, `DW` | Red, green, white dragons | `Chun`, `Hatsu`, `Haku` |
| `F1`-`F4` | Flowers 1-4 | `Flower1`-`Flower4` |
| `S1`-`S4` | Seasons 1-4 | `Season1`-`Season4` |
| `BACK`, `BLANK` | Hidden and blank tiles | `Back`, `Blank` |

Attribution: tile artwork by FluffyStuff and xhokir, used under the licences
listed above.

Runtime URLs include the immutable asset-set version directory
(`/assets/mahjong/v1/`).
