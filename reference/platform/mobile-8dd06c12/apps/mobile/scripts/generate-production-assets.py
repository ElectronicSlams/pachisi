#!/usr/bin/env python3
"""Generate the deterministic Step 7 icon and sound asset pack.

The icon generator uses only the alpha channel of the supplied eSlams mark. It
never redraws or approximates the mark. Theme icon colours are read directly
from packages/theme-tokens/src/themes.ts so token changes cannot silently drift
from the shipped alternates.

WAV and CAF generation uses only the Python standard library. Android's Ogg
Vorbis notification asset is encoded by Xiph oggenc with a fixed stream serial;
install `vorbis-tools` (Homebrew/Linux package) before running this script.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import random
import re
import shutil
import struct
import subprocess
import sys
import wave
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence


SAMPLE_RATE = 44_100
CHANNELS = 1
BITS_PER_SAMPLE = 16
ICON_SIZE = 1_024
STORE_BLUE = "#1b32c4"
WHITE = "#ffffff"
THEME_IDS = (
    "classic-light",
    "classic-dark",
    "neon",
    "club",
    "arcade",
    "midnight",
)
RENDERER_FAMILIES = (
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
)

MOBILE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = MOBILE_ROOT.parents[1]
MARK_PATH = MOBILE_ROOT / "assets" / "brand" / "mark.png"
THEMES_PATH = REPO_ROOT / "packages" / "theme-tokens" / "src" / "themes.ts"
ASSET_ROOT = MOBILE_ROOT / "assets" / "production"
ICON_ROOT = ASSET_ROOT / "icons"
AUDIO_ROOT = ASSET_ROOT / "audio"
MANIFEST_PATH = ASSET_ROOT / "manifest.json"


@dataclass(frozen=True)
class ThemeColours:
    theme_id: str
    background: str
    accent: str


@dataclass(frozen=True)
class AudioSpec:
    cue_id: str
    purpose: str
    duration_seconds: float
    peak: float
    synth: Callable[[int], list[float]]
    renderer_family: str | None = None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_hex(value: str) -> tuple[int, int, int]:
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise ValueError(f"Expected an opaque six-digit colour, got {value!r}")
    return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))  # type: ignore[return-value]


def read_theme_colours(path: Path) -> tuple[ThemeColours, ...]:
    source = path.read_text(encoding="utf-8")
    block_pattern = re.compile(
        r"export const\s+[A-Z_]+\s*=\s*defineTheme\(\{"
        r".*?\bid:\s*\"(?P<id>[^\"]+)\""
        r".*?\bcolor:\s*\{(?P<colour>.*?)\n\s*\},\n\s*material:",
        re.DOTALL,
    )
    parsed: dict[str, ThemeColours] = {}
    for match in block_pattern.finditer(source):
        colour = match.group("colour")
        background_match = re.search(r'\bbackground:\s*"(#[0-9a-fA-F]{6})"', colour)
        accent_match = re.search(r'\baccent:\s*"(#[0-9a-fA-F]{6})"', colour)
        theme_id = match.group("id")
        if background_match and accent_match:
            parsed[theme_id] = ThemeColours(
                theme_id=theme_id,
                background=background_match.group(1).lower(),
                accent=accent_match.group(1).lower(),
            )
    if tuple(theme_id for theme_id in THEME_IDS if theme_id in parsed) != THEME_IDS:
        missing = [theme_id for theme_id in THEME_IDS if theme_id not in parsed]
        raise RuntimeError(f"Could not read authoritative icon colours for: {', '.join(missing)}")
    return tuple(parsed[theme_id] for theme_id in THEME_IDS)


def paeth(left: int, above: int, upper_left: int) -> int:
    prediction = left + above - upper_left
    left_distance = abs(prediction - left)
    above_distance = abs(prediction - above)
    upper_left_distance = abs(prediction - upper_left)
    if left_distance <= above_distance and left_distance <= upper_left_distance:
        return left
    if above_distance <= upper_left_distance:
        return above
    return upper_left


def read_rgba_png(path: Path) -> tuple[int, int, bytes]:
    payload = path.read_bytes()
    if payload[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    cursor = 8
    compressed = bytearray()
    width = height = bit_depth = colour_type = interlace = -1
    while cursor < len(payload):
        chunk_length = struct.unpack(">I", payload[cursor : cursor + 4])[0]
        chunk_type = payload[cursor + 4 : cursor + 8]
        chunk_data = payload[cursor + 8 : cursor + 8 + chunk_length]
        cursor += 12 + chunk_length
        if chunk_type == b"IHDR":
            width, height, bit_depth, colour_type, _compression, _filter, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
        elif chunk_type == b"IDAT":
            compressed.extend(chunk_data)
        elif chunk_type == b"IEND":
            break
    if (bit_depth, colour_type, interlace) != (8, 6, 0):
        raise ValueError("The supplied mark must be a non-interlaced 8-bit RGBA PNG")
    raw = zlib.decompress(bytes(compressed))
    stride = width * 4
    expected = (stride + 1) * height
    if len(raw) != expected:
        raise ValueError(f"Unexpected PNG data length: {len(raw)} (expected {expected})")
    pixels = bytearray(width * height * 4)
    previous = bytearray(stride)
    read_cursor = 0
    write_cursor = 0
    for _row in range(height):
        filter_type = raw[read_cursor]
        read_cursor += 1
        encoded = raw[read_cursor : read_cursor + stride]
        read_cursor += stride
        decoded = bytearray(stride)
        for index, value in enumerate(encoded):
            left = decoded[index - 4] if index >= 4 else 0
            above = previous[index]
            upper_left = previous[index - 4] if index >= 4 else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = above
            elif filter_type == 3:
                predictor = (left + above) // 2
            elif filter_type == 4:
                predictor = paeth(left, above, upper_left)
            else:
                raise ValueError(f"Unsupported PNG filter {filter_type}")
            decoded[index] = (value + predictor) & 0xFF
        pixels[write_cursor : write_cursor + stride] = decoded
        write_cursor += stride
        previous = decoded
    return width, height, bytes(pixels)


def png_chunk(name: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + name + payload + struct.pack(">I", zlib.crc32(name + payload))


def write_rgba_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    if len(pixels) != width * height * 4:
        raise ValueError("RGBA byte length does not match the requested image dimensions")
    scanlines = b"".join(
        b"\x00" + pixels[row * width * 4 : (row + 1) * width * 4] for row in range(height)
    )
    payload = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + png_chunk(b"sRGB", b"\x00")
        + png_chunk(b"IDAT", zlib.compress(scanlines, level=9))
        + png_chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def resize_alpha(source_width: int, source_height: int, rgba: bytes, size: int) -> bytes:
    """Resize the source alpha with deterministic bilinear sampling."""
    alpha = rgba[3::4]
    result = bytearray(size * size)
    x_samples: list[tuple[int, int, float]] = []
    for x in range(size):
        source_x = ((x + 0.5) * source_width / size) - 0.5
        left = math.floor(source_x)
        fraction = source_x - left
        left = max(0, min(source_width - 1, left))
        right = max(0, min(source_width - 1, left + 1))
        x_samples.append((left, right, fraction))
    for y in range(size):
        source_y = ((y + 0.5) * source_height / size) - 0.5
        top = math.floor(source_y)
        y_fraction = source_y - top
        top = max(0, min(source_height - 1, top))
        bottom = max(0, min(source_height - 1, top + 1))
        for x, (left, right, x_fraction) in enumerate(x_samples):
            top_value = alpha[top * source_width + left] * (1 - x_fraction) + alpha[
                top * source_width + right
            ] * x_fraction
            bottom_value = alpha[bottom * source_width + left] * (1 - x_fraction) + alpha[
                bottom * source_width + right
            ] * x_fraction
            result[y * size + x] = max(
                0, min(255, round(top_value * (1 - y_fraction) + bottom_value * y_fraction))
            )
    return bytes(result)


def render_icon(
    alpha: bytes,
    mark_size: int,
    background: str | None,
    foreground: str,
) -> bytes:
    if len(alpha) != mark_size * mark_size:
        raise ValueError("Alpha mask dimensions are invalid")
    foreground_rgb = parse_hex(foreground)
    background_rgb = parse_hex(background) if background else None
    output = bytearray(ICON_SIZE * ICON_SIZE * 4)
    offset = (ICON_SIZE - mark_size) // 2
    for y in range(ICON_SIZE):
        for x in range(ICON_SIZE):
            output_index = (y * ICON_SIZE + x) * 4
            if offset <= x < offset + mark_size and offset <= y < offset + mark_size:
                alpha_value = alpha[(y - offset) * mark_size + (x - offset)]
            else:
                alpha_value = 0
            if background_rgb is None:
                output[output_index : output_index + 4] = bytes((*foreground_rgb, alpha_value))
            else:
                for channel in range(3):
                    output[output_index + channel] = (
                        foreground_rgb[channel] * alpha_value
                        + background_rgb[channel] * (255 - alpha_value)
                        + 127
                    ) // 255
                output[output_index + 3] = 255
    return bytes(output)


def manifest_icon(
    asset_id: str,
    path: Path,
    role: str,
    background: str | None,
    foreground: str,
    theme_id: str | None = None,
) -> dict[str, object]:
    entry: dict[str, object] = {
        "id": asset_id,
        "role": role,
        "path": path.relative_to(MOBILE_ROOT).as_posix(),
        "sha256": sha256(path),
        "width": ICON_SIZE,
        "height": ICON_SIZE,
        "pixel_format": "rgba8-srgb",
        "background": background,
        "foreground": foreground,
    }
    if theme_id:
        entry["theme_id"] = theme_id
    return entry


def generate_icons(themes: Sequence[ThemeColours]) -> list[dict[str, object]]:
    source_width, source_height, source_rgba = read_rgba_png(MARK_PATH)
    if (source_width, source_height) != (861, 861):
        raise RuntimeError("The supplied mark dimensions changed; review icon optical sizing before regeneration")
    standard_alpha = resize_alpha(source_width, source_height, source_rgba, 896)
    adaptive_alpha = resize_alpha(source_width, source_height, source_rgba, 736)
    entries: list[dict[str, object]] = []

    store_path = ICON_ROOT / "primary" / "store-icon.png"
    write_rgba_png(store_path, ICON_SIZE, ICON_SIZE, render_icon(standard_alpha, 896, STORE_BLUE, WHITE))
    entries.append(manifest_icon("store", store_path, "primary-store", STORE_BLUE, WHITE))

    for theme in themes:
        path = ICON_ROOT / "alternate" / f"{theme.theme_id}.png"
        write_rgba_png(
            path,
            ICON_SIZE,
            ICON_SIZE,
            render_icon(standard_alpha, 896, theme.background, theme.accent),
        )
        entries.append(
            manifest_icon(
                f"alternate-{theme.theme_id}",
                path,
                "alternate-themed",
                theme.background,
                theme.accent,
                theme.theme_id,
            )
        )

        themed_adaptive_root = ICON_ROOT / "alternate" / "android" / theme.theme_id
        themed_background_path = themed_adaptive_root / "background.png"
        themed_background = bytes((*parse_hex(theme.background), 255)) * (ICON_SIZE * ICON_SIZE)
        write_rgba_png(themed_background_path, ICON_SIZE, ICON_SIZE, themed_background)
        entries.append(
            manifest_icon(
                f"alternate-{theme.theme_id}-android-adaptive-background",
                themed_background_path,
                "alternate-android-adaptive-background",
                theme.background,
                theme.background,
                theme.theme_id,
            )
        )

        themed_foreground_path = themed_adaptive_root / "foreground.png"
        write_rgba_png(
            themed_foreground_path,
            ICON_SIZE,
            ICON_SIZE,
            render_icon(adaptive_alpha, 736, None, theme.accent),
        )
        entries.append(
            manifest_icon(
                f"alternate-{theme.theme_id}-android-adaptive-foreground",
                themed_foreground_path,
                "alternate-android-adaptive-foreground",
                None,
                theme.accent,
                theme.theme_id,
            )
        )

        themed_monochrome_path = themed_adaptive_root / "monochrome.png"
        write_rgba_png(
            themed_monochrome_path,
            ICON_SIZE,
            ICON_SIZE,
            render_icon(adaptive_alpha, 736, None, WHITE),
        )
        entries.append(
            manifest_icon(
                f"alternate-{theme.theme_id}-android-adaptive-monochrome",
                themed_monochrome_path,
                "alternate-android-adaptive-monochrome-mask",
                None,
                WHITE,
                theme.theme_id,
            )
        )

    adaptive_background_path = ICON_ROOT / "android" / "adaptive-background.png"
    opaque_background = bytes((*parse_hex(STORE_BLUE), 255)) * (ICON_SIZE * ICON_SIZE)
    write_rgba_png(adaptive_background_path, ICON_SIZE, ICON_SIZE, opaque_background)
    entries.append(
        manifest_icon(
            "android-adaptive-background",
            adaptive_background_path,
            "android-adaptive-background",
            STORE_BLUE,
            STORE_BLUE,
        )
    )

    adaptive_foreground_path = ICON_ROOT / "android" / "adaptive-foreground.png"
    write_rgba_png(
        adaptive_foreground_path,
        ICON_SIZE,
        ICON_SIZE,
        render_icon(adaptive_alpha, 736, None, WHITE),
    )
    entries.append(
        manifest_icon(
            "android-adaptive-foreground",
            adaptive_foreground_path,
            "android-adaptive-foreground",
            None,
            WHITE,
        )
    )

    adaptive_monochrome_path = ICON_ROOT / "android" / "adaptive-monochrome.png"
    write_rgba_png(
        adaptive_monochrome_path,
        ICON_SIZE,
        ICON_SIZE,
        render_icon(adaptive_alpha, 736, None, WHITE),
    )
    entries.append(
        manifest_icon(
            "android-adaptive-monochrome",
            adaptive_monochrome_path,
            "android-adaptive-monochrome-mask",
            None,
            WHITE,
        )
    )
    return entries


def empty_signal(frames: int) -> list[float]:
    return [0.0] * frames


def add_tone(
    output: list[float],
    start_seconds: float,
    duration_seconds: float,
    frequency_start: float,
    amplitude: float,
    decay_seconds: float,
    frequency_end: float | None = None,
    attack_seconds: float = 0.003,
    phase: float = 0.0,
) -> None:
    start = round(start_seconds * SAMPLE_RATE)
    frames = min(round(duration_seconds * SAMPLE_RATE), len(output) - start)
    if frames <= 0:
        return
    end_frequency = frequency_end if frequency_end is not None else frequency_start
    angle = phase
    for frame in range(frames):
        time = frame / SAMPLE_RATE
        progress = frame / max(frames - 1, 1)
        frequency = frequency_start + (end_frequency - frequency_start) * progress
        angle += 2 * math.pi * frequency / SAMPLE_RATE
        attack = min(1.0, time / max(attack_seconds, 1 / SAMPLE_RATE))
        decay = math.exp(-time / decay_seconds)
        release = min(1.0, (frames - frame) / max(round(0.010 * SAMPLE_RATE), 1))
        output[start + frame] += math.sin(angle) * amplitude * attack * decay * release


def add_noise(
    output: list[float],
    start_seconds: float,
    duration_seconds: float,
    amplitude: float,
    decay_seconds: float,
    seed: int,
    high_pass: bool = False,
) -> None:
    start = round(start_seconds * SAMPLE_RATE)
    frames = min(round(duration_seconds * SAMPLE_RATE), len(output) - start)
    if frames <= 0:
        return
    generator = random.Random(seed)
    low_pass = 0.0
    for frame in range(frames):
        time = frame / SAMPLE_RATE
        sample = generator.uniform(-1.0, 1.0)
        low_pass += 0.18 * (sample - low_pass)
        coloured = sample - low_pass if high_pass else low_pass
        attack = min(1.0, time / 0.0015)
        decay = math.exp(-time / decay_seconds)
        release = min(1.0, (frames - frame) / max(round(0.006 * SAMPLE_RATE), 1))
        output[start + frame] += coloured * amplitude * attack * decay * release


def finish_signal(output: list[float], target_peak: float) -> list[float]:
    if not output:
        raise ValueError("Audio signal cannot be empty")
    mean = sum(output) / len(output)
    output = [sample - mean for sample in output]
    fade_frames = min(round(0.004 * SAMPLE_RATE), len(output) // 2)
    for index in range(fade_frames):
        gain = index / max(fade_frames - 1, 1)
        output[index] *= gain
        output[-index - 1] *= gain
    peak = max(abs(sample) for sample in output)
    if peak <= 0:
        raise RuntimeError("Synthesised cue is silent")
    gain = target_peak / peak
    return [max(-1.0, min(1.0, sample * gain)) for sample in output]


def synth_arrival(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_noise(output, 0.000, 0.035, 0.14, 0.010, 1001, high_pass=True)
    add_tone(output, 0.000, 0.170, 540, 0.38, 0.060, frequency_end=690)
    add_tone(output, 0.038, 0.160, 810, 0.22, 0.070, frequency_end=920, phase=0.7)
    return output


def synth_grid(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_noise(output, 0, 0.030, 0.20, 0.009, 1101)
    add_tone(output, 0, 0.105, 780, 0.35, 0.034)
    return output


def synth_connect_four(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.145, 720, 0.36, 0.075, frequency_end=310)
    add_noise(output, 0.105, 0.040, 0.18, 0.012, 1201)
    return output


def synth_square(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.120, 390, 0.30, 0.046)
    add_tone(output, 0, 0.075, 1_170, 0.17, 0.026, phase=0.4)
    add_noise(output, 0, 0.026, 0.12, 0.008, 1301)
    return output


def synth_go(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_noise(output, 0, 0.045, 0.27, 0.011, 1401, high_pass=True)
    add_tone(output, 0, 0.085, 1_380, 0.28, 0.022)
    add_tone(output, 0, 0.070, 2_070, 0.12, 0.019, phase=0.6)
    return output


def synth_hex(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.130, 930, 0.28, 0.052)
    add_tone(output, 0.004, 0.125, 1_395, 0.22, 0.055, phase=0.3)
    return output


def synth_card(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_noise(output, 0, 0.105, 0.34, 0.043, 1601, high_pass=True)
    add_tone(output, 0.012, 0.075, 1_060, 0.12, 0.030, frequency_end=1_440)
    return output


def synth_dice(frames: int) -> list[float]:
    output = empty_signal(frames)
    for index, delay in enumerate((0.000, 0.032, 0.071)):
        add_noise(output, delay, 0.032, 0.20 - index * 0.025, 0.009, 1701 + index)
        add_tone(output, delay, 0.050, 680 + index * 95, 0.15, 0.018)
    return output


def synth_auction(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.190, 820, 0.31, 0.090)
    add_tone(output, 0, 0.185, 1_640, 0.15, 0.070, phase=0.35)
    return output


def synth_payoff(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0.000, 0.090, 660, 0.25, 0.036)
    add_tone(output, 0.064, 0.105, 880, 0.28, 0.045)
    return output


def synth_control(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.145, 410, 0.34, 0.074, frequency_end=910)
    add_tone(output, 0.020, 0.100, 1_020, 0.10, 0.050, frequency_end=1_280)
    return output


def synth_economic(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.150, 1_210, 0.27, 0.061)
    add_tone(output, 0, 0.120, 1_815, 0.19, 0.049, phase=0.5)
    add_noise(output, 0, 0.026, 0.08, 0.008, 2101)
    return output


def synth_custom(frames: int) -> list[float]:
    output = empty_signal(frames)
    add_tone(output, 0, 0.120, 620, 0.30, 0.047)
    add_tone(output, 0, 0.105, 930, 0.18, 0.042, phase=0.2)
    return output


def synth_result(frames: int) -> list[float]:
    output = empty_signal(frames)
    for frequency, amplitude, phase in (
        (523.251, 0.24, 0.0),
        (659.255, 0.21, 0.3),
        (783.991, 0.18, 0.6),
        (1_046.502, 0.09, 0.9),
    ):
        add_tone(output, 0, 0.450, frequency, amplitude, 0.190, phase=phase)
    return output


AUDIO_SPECS: tuple[AudioSpec, ...] = (
    AudioSpec("piece_arrival", "notification-piece-arrival", 0.220, 0.34, synth_arrival),
    AudioSpec("move_grid_3x3", "move-cue", 0.120, 0.32, synth_grid, "grid_3x3"),
    AudioSpec("move_connect_four", "move-cue", 0.165, 0.34, synth_connect_four, "connect_four"),
    AudioSpec("move_square_board", "move-cue", 0.130, 0.32, synth_square, "square_board"),
    AudioSpec("move_go_board", "move-cue", 0.105, 0.32, synth_go, "go_board"),
    AudioSpec("move_hex_board", "move-cue", 0.145, 0.31, synth_hex, "hex_board"),
    AudioSpec("move_card_table", "move-cue", 0.130, 0.29, synth_card, "card_table"),
    AudioSpec("move_dice_table", "move-cue", 0.140, 0.32, synth_dice, "dice_table"),
    AudioSpec("move_auction_panel", "move-cue", 0.205, 0.30, synth_auction, "auction_panel"),
    AudioSpec("move_payoff_matrix", "move-cue", 0.185, 0.30, synth_payoff, "payoff_matrix"),
    AudioSpec("move_control_benchmark", "move-cue", 0.160, 0.30, synth_control, "control_benchmark"),
    AudioSpec("move_economic_panel", "move-cue", 0.170, 0.29, synth_economic, "economic_panel"),
    AudioSpec("move_custom", "move-cue", 0.140, 0.30, synth_custom, "custom"),
    AudioSpec("result_chord", "result-chord", 0.480, 0.36, synth_result),
)


def pcm16_bytes(signal: Iterable[float]) -> bytes:
    samples = [max(-32_767, min(32_767, round(sample * 32_767))) for sample in signal]
    return struct.pack(f"<{len(samples)}h", *samples)


def write_wav(path: Path, pcm: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(CHANNELS)
        output.setsampwidth(BITS_PER_SAMPLE // 8)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)


def write_caf(path: Path, pcm: bytes) -> None:
    """Write mono signed 16-bit linear PCM in Core Audio Format.

    CAF linear PCM payloads use network byte order. A zero format-flags field
    is Apple's canonical on-disk representation for big-endian signed packed
    integer PCM (confirmed by afinfo/afconvert).
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    sample_count = len(pcm) // 2
    samples = struct.unpack(f"<{sample_count}h", pcm)
    caf_pcm = struct.pack(f">{sample_count}h", *samples)
    format_flags = 0
    description = struct.pack(
        ">d4sIIIII",
        float(SAMPLE_RATE),
        b"lpcm",
        format_flags,
        2,
        1,
        CHANNELS,
        BITS_PER_SAMPLE,
    )
    payload = (
        b"caff"
        + struct.pack(">HH", 1, 0)
        + b"desc"
        + struct.pack(">q", len(description))
        + description
        + b"data"
        + struct.pack(">q", len(caf_pcm) + 4)
        + struct.pack(">I", 0)
        + caf_pcm
    )
    path.write_bytes(payload)


def find_oggenc() -> Path:
    candidates = [
        os.environ.get("OGGENC"),
        shutil.which("oggenc"),
        "/opt/homebrew/bin/oggenc",
        "/usr/local/bin/oggenc",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return Path(candidate)
    raise RuntimeError(
        "oggenc is required for the deterministic Android notification asset; install vorbis-tools"
    )


def encode_ogg(wav_path: Path, ogg_path: Path, serial: int) -> str:
    oggenc = find_oggenc()
    ogg_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            str(oggenc),
            "--quiet",
            "--quality",
            "4",
            "--serial",
            str(serial),
            "--output",
            str(ogg_path),
            str(wav_path),
        ],
        check=True,
    )
    version = subprocess.run(
        [str(oggenc), "--version"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    return " ".join(version.split())


def audio_format_entry(path: Path, container: str, codec: str, frames: int) -> dict[str, object]:
    return {
        "path": path.relative_to(MOBILE_ROOT).as_posix(),
        "sha256": sha256(path),
        "container": container,
        "codec": codec,
        "sample_rate_hz": SAMPLE_RATE,
        "channels": CHANNELS,
        "frames": frames,
        "duration_ms": round(frames * 1000 / SAMPLE_RATE, 3),
    }


def generate_audio() -> tuple[list[dict[str, object]], str]:
    entries: list[dict[str, object]] = []
    ogg_encoder = ""
    for index, spec in enumerate(AUDIO_SPECS):
        frames = round(spec.duration_seconds * SAMPLE_RATE)
        signal = finish_signal(spec.synth(frames), spec.peak)
        pcm = pcm16_bytes(signal)
        wav_path = AUDIO_ROOT / "runtime" / f"{spec.cue_id}.wav"
        write_wav(wav_path, pcm)
        formats = [audio_format_entry(wav_path, "wav", "pcm_s16le", frames)]
        if spec.cue_id == "piece_arrival":
            caf_path = AUDIO_ROOT / "notifications" / "ios" / "piece_arrival.caf"
            ogg_path = AUDIO_ROOT / "notifications" / "android" / "piece_arrival.ogg"
            write_caf(caf_path, pcm)
            ogg_encoder = encode_ogg(wav_path, ogg_path, serial=1_703_201 + index)
            formats.extend(
                (
                    audio_format_entry(caf_path, "caf", "pcm_s16be", frames),
                    audio_format_entry(ogg_path, "ogg", "vorbis", frames),
                )
            )
        entry: dict[str, object] = {
            "id": spec.cue_id,
            "purpose": spec.purpose,
            "peak_linear": spec.peak,
            "formats": formats,
        }
        if spec.renderer_family:
            entry["renderer_family"] = spec.renderer_family
        entries.append(entry)
    return entries, ogg_encoder


def write_manifest(
    icons: Sequence[dict[str, object]],
    audio: Sequence[dict[str, object]],
    themes: Sequence[ThemeColours],
    ogg_encoder: str,
) -> None:
    manifest = {
        "schema_version": 1,
        "generator": "scripts/generate-production-assets.py",
        "determinism": {
            "sample_rate_hz": SAMPLE_RATE,
            "pcm_bits_per_sample": BITS_PER_SAMPLE,
            "ogg_encoder": ogg_encoder,
            "ogg_quality": 4,
            "ogg_stream_serial": 1_703_201,
        },
        "sources": {
            "mark": {
                "path": MARK_PATH.relative_to(MOBILE_ROOT).as_posix(),
                "sha256": sha256(MARK_PATH),
                "usage": "alpha-mask-only",
            },
            "theme_tokens": {
                "path": THEMES_PATH.relative_to(REPO_ROOT).as_posix(),
                "sha256": sha256(THEMES_PATH),
                "values": [
                    {
                        "theme_id": theme.theme_id,
                        "background": theme.background,
                        "accent": theme.accent,
                    }
                    for theme in themes
                ],
            },
        },
        "icons": list(icons),
        "audio": list(audio),
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    themes = read_theme_colours(THEMES_PATH)
    icons = generate_icons(themes)
    audio, ogg_encoder = generate_audio()
    write_manifest(icons, audio, themes, ogg_encoder)
    print(f"Generated {len(icons)} icons and {len(audio)} logical audio cues.")
    print(f"Manifest: {MANIFEST_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
