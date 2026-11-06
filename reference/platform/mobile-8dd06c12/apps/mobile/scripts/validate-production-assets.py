#!/usr/bin/env python3
"""Fail-closed validation for the committed Step 7 production asset pack."""

from __future__ import annotations

import hashlib
import json
import struct
import sys
import wave
import zlib
from pathlib import Path


MOBILE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = MOBILE_ROOT.parents[1]
MANIFEST_PATH = MOBILE_ROOT / "assets" / "production" / "manifest.json"
EXPECTED_THEMES = {
    "classic-light",
    "classic-dark",
    "neon",
    "club",
    "arcade",
    "midnight",
}
EXPECTED_FAMILIES = {
    "grid_3x3",
    "connect_four",
    "square_board",
    "go_board",
    "hex_board",
    "card_table",
    "dice_table",
    "auction_panel",
    "payoff_matrix",
    "control_benchmark",
    "economic_panel",
    "custom",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_hash(relative_path: str, expected_hash: str) -> Path:
    path = MOBILE_ROOT / relative_path
    require(path.is_file(), f"Missing asset: {relative_path}")
    require(sha256(path) == expected_hash, f"Hash mismatch: {relative_path}")
    return path


def validate_repo_hash(relative_path: str, expected_hash: str) -> Path:
    path = REPO_ROOT / relative_path
    require(path.is_file(), f"Missing source: {relative_path}")
    require(sha256(path) == expected_hash, f"Source hash mismatch: {relative_path}")
    return path


def parse_hex(value: str) -> tuple[int, int, int]:
    require(len(value) == 7 and value.startswith("#"), f"Invalid manifest colour: {value}")
    return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))  # type: ignore[return-value]


def png_metadata(path: Path) -> tuple[int, int, int, int, int]:
    payload = path.read_bytes()
    require(payload[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG signature: {path}")
    require(payload[12:16] == b"IHDR", f"PNG lacks an initial IHDR: {path}")
    return struct.unpack(">IIBBB", payload[16:27])


def read_generated_png(path: Path) -> tuple[int, int, bytes]:
    payload = path.read_bytes()
    width, height, depth, colour_type, _compression = png_metadata(path)
    require((depth, colour_type) == (8, 6), f"Expected an RGBA8 PNG: {path}")
    compressed = bytearray()
    cursor = 8
    while cursor < len(payload):
        length = struct.unpack(">I", payload[cursor : cursor + 4])[0]
        kind = payload[cursor + 4 : cursor + 8]
        if kind == b"IDAT":
            compressed.extend(payload[cursor + 8 : cursor + 8 + length])
        cursor += 12 + length
    raw = zlib.decompress(bytes(compressed))
    stride = width * 4
    require(len(raw) == (stride + 1) * height, f"Unexpected PNG scanline length: {path}")
    rows = []
    for row in range(height):
        start = row * (stride + 1)
        require(raw[start] == 0, f"Generated PNG must use deterministic filter zero: {path}")
        rows.append(raw[start + 1 : start + 1 + stride])
    return width, height, b"".join(rows)


def validate_icon_pixels(icon: dict[str, object], path: Path) -> None:
    width, height, pixels = read_generated_png(path)
    foreground = parse_hex(str(icon["foreground"]))
    background_value = icon["background"]
    if background_value is None:
        require(pixels[:4] == bytes((*foreground, 0)), f"Transparent icon corner is invalid: {path}")
        alpha = pixels[3::4]
        require(min(alpha) == 0 and max(alpha) == 255, f"Adaptive layer requires clear and solid pixels: {path}")
        opaque_points = [index for index, value in enumerate(alpha) if value == 255]
        require(opaque_points, f"Adaptive layer has no opaque mark pixels: {path}")
        xs = [point % width for point in opaque_points]
        ys = [point // width for point in opaque_points]
        require(min(xs) >= 188 and max(xs) <= 835, f"Adaptive mark exceeds the horizontal safe zone: {path}")
        require(min(ys) >= 188 and max(ys) <= 835, f"Adaptive mark exceeds the vertical safe zone: {path}")
    else:
        background = parse_hex(str(background_value))
        require(pixels[:4] == bytes((*background, 255)), f"Opaque icon corner does not match its background: {path}")
        require(bytes((*foreground, 255)) in pixels, f"Icon lacks solid foreground mark pixels: {path}")


def validate_wav(path: Path, expected_frames: int) -> None:
    with wave.open(str(path), "rb") as source:
        require(source.getnchannels() == 1, f"WAV must be mono: {path}")
        require(source.getsampwidth() == 2, f"WAV must be PCM16: {path}")
        require(source.getframerate() == 44_100, f"Unexpected WAV sample rate: {path}")
        require(source.getnframes() == expected_frames, f"Unexpected WAV frame count: {path}")
        pcm = source.readframes(source.getnframes())
    samples = struct.unpack(f"<{expected_frames}h", pcm)
    require(max(abs(sample) for sample in samples) > 4_000, f"WAV is effectively silent: {path}")
    require(max(abs(sample) for sample in samples) < 32_767, f"WAV clips: {path}")


def validate_caf(path: Path, expected_frames: int) -> None:
    payload = path.read_bytes()
    require(payload[:8] == b"caff\x00\x01\x00\x00", f"Invalid CAF header: {path}")
    require(payload[8:12] == b"desc", f"CAF description must be first: {path}")
    description_length = struct.unpack(">q", payload[12:20])[0]
    require(description_length == 32, f"Unexpected CAF description length: {path}")
    sample_rate, codec, flags, bytes_per_packet, frames_per_packet, channels, bits = struct.unpack(
        ">d4sIIIII", payload[20:52]
    )
    require(sample_rate == 44_100.0 and codec == b"lpcm", f"Unexpected CAF codec: {path}")
    require(flags == 0, f"CAF PCM must use the canonical big-endian on-disk flag set: {path}")
    require((bytes_per_packet, frames_per_packet, channels, bits) == (2, 1, 1, 16), f"Unexpected CAF stream description: {path}")
    require(payload[52:56] == b"data", f"CAF data chunk is missing: {path}")
    data_length = struct.unpack(">q", payload[56:64])[0]
    require(data_length == expected_frames * 2 + 4, f"Unexpected CAF data length: {path}")
    require(payload[64:68] == b"\x00\x00\x00\x00", f"CAF edit count must be zero: {path}")


def ogg_metadata(path: Path) -> tuple[int, int, int]:
    payload = path.read_bytes()
    cursor = 0
    last_granule = -1
    pages = 0
    while cursor < len(payload):
        require(payload[cursor : cursor + 4] == b"OggS", f"Invalid Ogg page at byte {cursor}: {path}")
        require(payload[cursor + 4] == 0, f"Unsupported Ogg version: {path}")
        granule = struct.unpack("<q", payload[cursor + 6 : cursor + 14])[0]
        segment_count = payload[cursor + 26]
        segment_table = payload[cursor + 27 : cursor + 27 + segment_count]
        page_length = 27 + segment_count + sum(segment_table)
        require(cursor + page_length <= len(payload), f"Truncated Ogg page: {path}")
        if granule >= 0:
            last_granule = granule
        cursor += page_length
        pages += 1
    require(cursor == len(payload) and pages >= 2, f"Invalid Ogg page boundaries: {path}")
    identification = payload.find(b"\x01vorbis")
    require(identification >= 0, f"Ogg does not contain a Vorbis identification packet: {path}")
    channels = payload[identification + 11]
    sample_rate = struct.unpack("<I", payload[identification + 12 : identification + 16])[0]
    return sample_rate, channels, last_granule


def validate_ogg(path: Path, expected_frames: int) -> None:
    sample_rate, channels, granule = ogg_metadata(path)
    require(sample_rate == 44_100, f"Unexpected Ogg sample rate: {path}")
    require(channels == 1, f"Ogg notification must be mono: {path}")
    require(granule == expected_frames, f"Unexpected Ogg duration granule: {path}")


def main() -> int:
    require(MANIFEST_PATH.is_file(), "Production asset manifest is missing")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    require(manifest.get("schema_version") == 1, "Unsupported asset manifest schema")

    source_mark = manifest["sources"]["mark"]
    validate_hash(source_mark["path"], source_mark["sha256"])
    require(source_mark["usage"] == "alpha-mask-only", "Mark usage must remain alpha-mask-only")
    theme_source = manifest["sources"]["theme_tokens"]
    validate_repo_hash(theme_source["path"], theme_source["sha256"])
    theme_values = theme_source["values"]
    require({entry["theme_id"] for entry in theme_values} == EXPECTED_THEMES, "Theme source set is incomplete")
    colours_by_theme = {entry["theme_id"]: entry for entry in theme_values}

    icons = manifest["icons"]
    require(
        len(icons) == 28,
        "Expected one store, six legacy alternates, eighteen themed adaptive layers, and three primary adaptive assets",
    )
    alternate_themes = {entry.get("theme_id") for entry in icons if entry["role"] == "alternate-themed"}
    require(alternate_themes == EXPECTED_THEMES, "Alternate icon theme coverage is incomplete")
    alternate_hashes = {entry["sha256"] for entry in icons if entry["role"] == "alternate-themed"}
    require(len(alternate_hashes) == len(EXPECTED_THEMES), "The six themed alternate icons must be visually distinct")
    adaptive_roles = {
        "alternate-android-adaptive-background",
        "alternate-android-adaptive-foreground",
        "alternate-android-adaptive-monochrome-mask",
    }
    for role in adaptive_roles:
        role_entries = [entry for entry in icons if entry["role"] == role]
        require(len(role_entries) == len(EXPECTED_THEMES), f"Expected six assets for role {role}")
        require(
            {entry.get("theme_id") for entry in role_entries} == EXPECTED_THEMES,
            f"Themed adaptive coverage is incomplete for role {role}",
        )
    for theme_id in EXPECTED_THEMES:
        theme_layers = [
            entry for entry in icons if entry.get("theme_id") == theme_id and entry["role"] in adaptive_roles
        ]
        require(len(theme_layers) == 3, f"Theme {theme_id} requires background, foreground, and monochrome layers")
        colours = colours_by_theme[theme_id]
        legacy = next(
            entry for entry in icons if entry.get("theme_id") == theme_id and entry["role"] == "alternate-themed"
        )
        require(
            legacy["background"] == colours["background"] and legacy["foreground"] == colours["accent"],
            f"Legacy icon colours drifted from theme tokens for {theme_id}",
        )
        background_layer = next(
            entry for entry in theme_layers if entry["role"] == "alternate-android-adaptive-background"
        )
        foreground_layer = next(
            entry for entry in theme_layers if entry["role"] == "alternate-android-adaptive-foreground"
        )
        monochrome_layer = next(
            entry for entry in theme_layers if entry["role"] == "alternate-android-adaptive-monochrome-mask"
        )
        require(
            background_layer["background"] == colours["background"]
            and background_layer["foreground"] == colours["background"],
            f"Adaptive background drifted from theme tokens for {theme_id}",
        )
        require(
            foreground_layer["background"] is None and foreground_layer["foreground"] == colours["accent"],
            f"Adaptive foreground drifted from theme tokens for {theme_id}",
        )
        require(
            monochrome_layer["background"] is None and monochrome_layer["foreground"] == "#ffffff",
            f"Adaptive monochrome mask is invalid for {theme_id}",
        )
    for icon in icons:
        path = validate_hash(icon["path"], icon["sha256"])
        width, height, depth, colour_type, _compression = png_metadata(path)
        require((width, height, depth, colour_type) == (1_024, 1_024, 8, 6), f"Invalid icon format: {path}")
        validate_icon_pixels(icon, path)

    audio = manifest["audio"]
    require(len(audio) == 14, "Expected one arrival, twelve move cues, and one result chord")
    move_families = {entry.get("renderer_family") for entry in audio if entry["purpose"] == "move-cue"}
    require(move_families == EXPECTED_FAMILIES, "Renderer-family sound coverage is incomplete")
    wav_hashes: set[str] = set()
    for cue in audio:
        formats = cue["formats"]
        require(any(item["container"] == "wav" for item in formats), f"Cue lacks runtime WAV: {cue['id']}")
        for item in formats:
            path = validate_hash(item["path"], item["sha256"])
            frames = item["frames"]
            require(item["duration_ms"] < 1_000, f"Cue exceeds the short-form budget: {cue['id']}")
            if item["container"] == "wav":
                wav_hashes.add(item["sha256"])
                validate_wav(path, frames)
            elif item["container"] == "caf":
                validate_caf(path, frames)
            elif item["container"] == "ogg":
                validate_ogg(path, frames)
            else:
                raise AssertionError(f"Unsupported audio container in manifest: {item['container']}")
    require(len(wav_hashes) == len(audio), "Every logical cue must have a distinct WAV signature")
    arrival = next(entry for entry in audio if entry["id"] == "piece_arrival")
    require({item["container"] for item in arrival["formats"]} == {"wav", "caf", "ogg"}, "Arrival notification formats are incomplete")

    print(f"Validated {len(icons)} icons and {len(audio)} logical audio cues ({sum(len(cue['formats']) for cue in audio)} files).")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (AssertionError, KeyError, TypeError, ValueError, struct.error, zlib.error) as error:
        print(f"Asset validation failed: {error}", file=sys.stderr)
        sys.exit(1)
