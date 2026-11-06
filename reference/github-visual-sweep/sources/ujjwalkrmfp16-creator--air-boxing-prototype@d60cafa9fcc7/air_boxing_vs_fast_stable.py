
import cv2
import mediapipe as mp
import numpy as np
import pygame
import time
import random
import math
import os
from collections import deque


# ============================================================
# AIR BOXING VS - ENHANCED VERSION
# Python 3.11 + MediaPipe 0.10.21
# ============================================================

WINDOW_NAME = "AIR BOXING VS"

WIDTH = 1280
HEIGHT = 720

# A full match should need sustained, accurate play rather than ending in a
# couple of registered gestures.
MAX_HEALTH = 300
ROUND_TIME = 60
TOTAL_ROUNDS = 3
ROUNDS_TO_WIN = 2
ROUND_BREAK_TIME = 3.0

# Player
PLAYER_DAMAGE = 6
PUNCH_SPEED = 120
PUNCH_COOLDOWN = 0.36
PUNCH_MIN_TRAVEL = 14
# A hand must recoil after a registered punch before it can strike again.
# This stops one sweeping physical motion from producing several hits.
PUNCH_REARM_DISTANCE = 48
PUNCH_REARM_OPPOSITE_TRAVEL = 16

# Moderate opponent: more active than the easy version, but still readable.
OPPONENT_DAMAGE = 7
ATTACK_MIN_DELAY = 1.55
ATTACK_MAX_DELAY = 2.85
GUARD_CHANGE_TIME = 2.0

# Defence is deliberately generous: attacks are shown well before impact.
ATTACK_TELEGRAPH = 1.20
BLOCK_HOLD_TIME = 0.18
DODGE_DISTANCE = 0.032
DUCK_DISTANCE = 0.028

# Hand responsiveness
POSITION_ALPHA = 0.90
HISTORY_SIZE = 3

# Game states
COUNTDOWN = "COUNTDOWN"
PLAYING = "PLAYING"
WIN = "WIN"
LOSE = "LOSE"
MENU = "MENU"
PAUSED = "PAUSED"
ROUND_BREAK = "ROUND_BREAK"


# ============================================================
# SOUND
# Keep the game silent.  The sound code remains available but is disabled so
# it does not affect the player's requested no-sound setup.
# ============================================================

SOUND_ENABLED = False

try:
    pygame.mixer.pre_init(
        frequency=44100,
        size=-16,
        channels=1,
        buffer=512
    )
    pygame.init()
    pygame.mixer.init()
    SOUND_OK = True
except Exception as e:
    SOUND_OK = False
    print("WARNING: pygame audio could not start:", e)


def make_tone(freq, duration, volume=0.35, end_freq=None):
    """Create a short sound without requiring external .wav files."""
    if not SOUND_OK:
        return None

    sample_rate = 44100
    count = max(1, int(sample_rate * duration))
    t = np.linspace(0, duration, count, endpoint=False)

    if end_freq is None:
        frequencies = np.full(count, freq, dtype=np.float32)
    else:
        frequencies = np.linspace(
            freq, end_freq, count
        ).astype(np.float32)

    wave = np.sin(
        2.0 * np.pi * frequencies * t
    )

    # Quick attack/release envelope
    attack = max(1, int(count * 0.03))
    release = max(1, int(count * 0.18))

    envelope = np.ones(count, dtype=np.float32)
    envelope[:attack] = np.linspace(
        0, 1, attack
    )
    envelope[-release:] = np.linspace(
        1, 0, release
    )

    audio = (
        wave *
        envelope *
        volume *
        32767
    ).astype(np.int16)

    try:
        return pygame.sndarray.make_sound(audio)
    except Exception:
        return None


punch_sound = make_tone(
    180, 0.11, 0.42, 95
)

hit_sound = make_tone(
    85, 0.20, 0.55, 45
)

countdown_sound = make_tone(
    650, 0.14, 0.35, 500
)

fight_sound = make_tone(
    850, 0.28, 0.45, 1200
)

ko_sound = make_tone(
    120, 0.55, 0.55, 45
)


def play_sound(sound):
    if SOUND_ENABLED and sound is not None:
        try:
            sound.play()
        except Exception:
            pass


# ============================================================
# MEDIAPIPE
# ============================================================

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose


# ============================================================
# CAMERA
# ============================================================

cap = cv2.VideoCapture(
    0,
    cv2.CAP_DSHOW
)

if not cap.isOpened():
    cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Camera could not be opened.")
    input("Press ENTER to exit...")
    raise SystemExit

cap.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    640
)
cap.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    480
)
cap.set(
    cv2.CAP_PROP_FPS,
    30
)
cap.set(
    cv2.CAP_PROP_BUFFERSIZE,
    1
)


# ============================================================
# WINDOW
# ============================================================

cv2.namedWindow(
    WINDOW_NAME,
    cv2.WINDOW_NORMAL
)

cv2.setWindowProperty(
    WINDOW_NAME,
    cv2.WND_PROP_FULLSCREEN,
    cv2.WINDOW_FULLSCREEN
)


# ============================================================
# GAME VARIABLES
# ============================================================

game_state = MENU
countdown_start = time.time()
game_start_time = None
round_number = 1
player_round_wins = 0
opponent_round_wins = 0
round_break_start = 0
paused_at = None

player_health = MAX_HEALTH
opponent_health = MAX_HEALTH

score = 0
hits = 0
blocked = 0
dodges = 0

combo = 0
best_combo = 0

message = ""
message_until = 0


# ============================================================
# HAND STATE
# ============================================================

left_hand_pos = None
right_hand_pos = None

left_prev_pos = None
right_prev_pos = None

left_speed = 0.0
right_speed = 0.0

left_fist = False
right_fist = False

left_prev_fist = False
right_prev_fist = False

left_last_punch = -10
right_last_punch = -10

left_punch_effect = -10
right_punch_effect = -10

left_history = deque(
    maxlen=HISTORY_SIZE
)
right_history = deque(
    maxlen=HISTORY_SIZE
)

# Keep physical hand identity stable.
# The camera is mirrored, so screen-left is the user's physical LEFT
# and screen-right is the user's physical RIGHT.
last_left_x = 0.28 * WIDTH
last_right_x = 0.72 * WIDTH


# ============================================================
# OPPONENT STATE
# ============================================================

guard_zones = [
    "LEFT",
    "RIGHT",
    "HEAD"
]

guard_zone = random.choice(
    guard_zones
)

last_guard_change = time.time()

opponent_attack = False
opponent_attack_type = None
opponent_attack_start = 0
attack_body_baseline_x = 0.5
attack_body_baseline_y = 0.55
next_attack_time = (
    time.time() +
    random.uniform(
        ATTACK_MIN_DELAY,
        ATTACK_MAX_DELAY
    )
)

opponent_combo_count = 0
opponent_combo_queue = []
opponent_pattern_name = "SINGLE"
opponent_difficulty_level = 0
last_opponent_attack_type = None

# Adaptive defense: the opponent remembers recent player target choices.
player_target_history = deque(maxlen=6)
last_player_target = None


# Each punch has a tiny state machine: strike -> recoil -> armed.  A recoil
# in the opposite direction is natural when boxing and is much more reliable
# than a simple time cooldown for webcam motion.
left_punch_armed = True
right_punch_armed = True
left_punch_origin = None
right_punch_origin = None
left_punch_direction = None
right_punch_direction = None


# ============================================================
# EFFECTS
# ============================================================

impact_active = False
impact_x = WIDTH // 2
impact_y = 275
impact_start = 0

screen_shake = 0

flash_until = 0


# ============================================================
# BODY MOVEMENT
# ============================================================

body_center_x = 0.5
body_center_y = 0.55

previous_body_x = 0.5
previous_body_y = 0.65

body_dx = 0.0
body_dy = 0.0

# Shoulder-centre body tracking is used for dodge and duck detection.
body_baseline_x = 0.5
body_baseline_y = 0.55
shoulders_visible = False

# A block must be held briefly, so a passing fist is not mistaken for guard.
block_started = None
block_active = False

# Correct frame-to-frame hand motion tracking.
# The previous version updated the previous position too early,
# which could make punch speed unreliable.
last_frame_time = time.time()


# ============================================================
# UTILITY
# ============================================================

def distance(a, b):
    return math.hypot(
        a[0] - b[0],
        a[1] - b[1]
    )


def lerp(old, new, alpha):
    if old is None:
        return new

    return (
        int(old[0] * (1 - alpha) + new[0] * alpha),
        int(old[1] * (1 - alpha) + new[1] * alpha)
    )


def set_message(text, duration=0.65):
    global message, message_until
    message = text
    message_until = time.time() + duration


def get_opponent_difficulty(now):
    """Return a readable 0..3 difficulty level that rises through a round."""
    if game_start_time is None:
        return 0

    round_progress = min(1.0, (now - game_start_time) / ROUND_TIME)
    pressure = max(0.0, 1.0 - opponent_health / MAX_HEALTH)
    score_pressure = min(1.0, score / 220.0)
    return min(3, int(round_progress * 2.2 + pressure * 1.4 + score_pressure * 0.7))


def attack_telegraph_for(level):
    """Keep every attack defendable while making later rounds more demanding."""
    return max(0.62, ATTACK_TELEGRAPH - level * 0.15)


def attack_delay_for(level):
    fast_min = max(0.72, ATTACK_MIN_DELAY - level * 0.28)
    fast_max = max(fast_min + 0.30, ATTACK_MAX_DELAY - level * 0.38)
    return random.uniform(fast_min, fast_max)


def can_rearm_punch(hand_pos, punch_origin, punch_direction):
    """True only after the glove has clearly travelled back from a punch."""
    if hand_pos is None or punch_origin is None or punch_direction is None:
        return False

    recoil_x = hand_pos[0] - punch_origin[0]
    recoil_y = hand_pos[1] - punch_origin[1]
    recoil_distance = math.hypot(recoil_x, recoil_y)
    opposite_travel = recoil_x * punch_direction[0] + recoil_y * punch_direction[1]
    return (
        recoil_distance >= PUNCH_REARM_DISTANCE
        and opposite_travel <= -PUNCH_REARM_OPPOSITE_TRAVEL
    )


def draw_text_center(
    img,
    text,
    y,
    scale=1.0,
    thickness=2,
    color=(255, 255, 255)
):
    size = cv2.getTextSize(
        text,
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        thickness
    )[0]

    x = (WIDTH - size[0]) // 2

    cv2.putText(
        img,
        text,
        (x, y),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        color,
        thickness,
        cv2.LINE_AA
    )


# ============================================================
# ROBUST FIST DETECTION
# ============================================================

def is_fist(hand_landmarks):
    """
    Orientation-independent-ish fist detector.

    It compares each fingertip distance from the wrist with
    the corresponding PIP-joint distance. This is much more
    reliable than checking only landmark y coordinates.

    Open hand -> fingertips are farther from wrist.
    Closed fist -> fingertips move closer to wrist.
    """

    lm = hand_landmarks.landmark

    wrist = np.array(
        [lm[0].x, lm[0].y]
    )

    finger_pairs = [
        (8, 6),    # index
        (12, 10),  # middle
        (16, 14),  # ring
        (20, 18),  # pinky
    ]

    folded = 0

    for tip_i, pip_i in finger_pairs:

        tip = np.array(
            [lm[tip_i].x, lm[tip_i].y]
        )

        pip = np.array(
            [lm[pip_i].x, lm[pip_i].y]
        )

        tip_dist = np.linalg.norm(
            tip - wrist
        )

        pip_dist = np.linalg.norm(
            pip - wrist
        )

        # In a fist, fingertip is not significantly farther
        # from the wrist than the PIP joint.
        if tip_dist < pip_dist * 1.12:
            folded += 1

    # Two or more clearly folded fingers is enough. This is intentionally
    # permissive because webcam angles often hide one or two fingers.
    compact = 0
    for tip_i in [8, 12, 16, 20]:
        tip = np.array([lm[tip_i].x, lm[tip_i].y])
        if np.linalg.norm(tip - wrist) < 0.34:
            compact += 1

    return folded >= 2 and compact >= 2


def finger_extension_score(hand_landmarks):
    """Return 0..4: approximate number of extended fingers."""
    lm = hand_landmarks.landmark
    wrist = np.array([lm[0].x, lm[0].y])

    score = 0

    for tip_i, pip_i in [
        (8, 6),
        (12, 10),
        (16, 14),
        (20, 18)
    ]:
        tip = np.array([lm[tip_i].x, lm[tip_i].y])
        pip = np.array([lm[pip_i].x, lm[pip_i].y])

        if np.linalg.norm(tip - wrist) > np.linalg.norm(pip - wrist) * 1.12:
            score += 1

    return score


# ============================================================
# BACKGROUND
# ============================================================

def draw_background(img):
    img[:] = (18, 24, 38)

    # Upper arena
    cv2.rectangle(
        img,
        (0, 105),
        (WIDTH, 420),
        (10, 15, 25),
        -1
    )

    # Audience
    random.seed(42)

    for _ in range(260):
        x = random.randint(0, WIDTH - 1)
        y = random.randint(125, 400)

        cv2.circle(
            img,
            (x, y),
            random.choice([1, 1, 2]),
            (85, 92, 105),
            -1
        )

    # Floor
    floor = np.array(
        [
            [0, 420],
            [WIDTH, 420],
            [WIDTH, HEIGHT],
            [0, HEIGHT]
        ],
        dtype=np.int32
    )

    cv2.fillPoly(
        img,
        [floor],
        (28, 48, 32)
    )

    # Perspective floor lines
    for y in [470, 525, 590, 660]:
        cv2.line(
            img,
            (0, y),
            (WIDTH, y),
            (50, 72, 52),
            2
        )

    for x in range(
        0,
        WIDTH + 1,
        160
    ):
        cv2.line(
            img,
            (WIDTH // 2, 420),
            (x, HEIGHT),
            (50, 72, 52),
            2
        )

    # Ring ropes
    for y in [300, 335, 370]:
        cv2.line(
            img,
            (30, y),
            (WIDTH - 30, y),
            (30, 30, 200),
            6
        )

    # Rope highlights
    for y in [300, 335, 370]:
        cv2.line(
            img,
            (30, y - 2),
            (WIDTH - 30, y - 2),
            (100, 100, 255),
            1
        )

    # Posts
    for x in [42, WIDTH - 42]:
        cv2.rectangle(
            img,
            (x - 14, 270),
            (x + 14, 620),
            (25, 25, 155),
            -1
        )

    # Arena lights
    for x in [140, 380, 640, 900, 1140]:
        cv2.circle(
            img,
            (x, 68),
            22,
            (180, 180, 180),
            -1
        )

        cv2.circle(
            img,
            (x, 68),
            30,
            (100, 105, 120),
            2
        )


# ============================================================
# HEALTH BAR
# ============================================================

def draw_health_bar(
    img,
    x,
    y,
    width,
    height,
    health,
    label,
    reverse=False
):
    cv2.putText(
        img,
        label,
        (x, y - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.62,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    cv2.rectangle(
        img,
        (x, y),
        (x + width, y + height),
        (8, 8, 8),
        -1
    )

    ratio = max(
        0.0,
        min(
            1.0,
            health / MAX_HEALTH
        )
    )

    fill = int(width * ratio)

    if fill > 0:
        if reverse:
            cv2.rectangle(
                img,
                (x + width - fill, y),
                (x + width, y + height),
                (50, 70, 225),
                -1
            )
        else:
            cv2.rectangle(
                img,
                (x, y),
                (x + fill, y + height),
                (30, 210, 60),
                -1
            )

    cv2.rectangle(
        img,
        (x, y),
        (x + width, y + height),
        (240, 240, 240),
        3
    )


# ============================================================
# OPPONENT DRAWING
# ============================================================

def draw_opponent(img):
    cx = WIDTH // 2
    head_y = 275
    body_top = 340
    body_bottom = 570

    # Shadow
    cv2.ellipse(
        img,
        (cx, 625),
        (165, 24),
        0,
        0,
        360,
        (8, 12, 12),
        -1
    )

    # Legs
    cv2.line(
        img,
        (cx - 35, body_bottom),
        (cx - 82, 650),
        (105, 110, 125),
        30
    )

    cv2.line(
        img,
        (cx + 35, body_bottom),
        (cx + 82, 650),
        (105, 110, 125),
        30
    )

    # Body
    cv2.rectangle(
        img,
        (cx - 90, body_top),
        (cx + 90, body_bottom),
        (45, 60, 190),
        -1
    )

    # Neck
    cv2.rectangle(
        img,
        (cx - 25, head_y + 35),
        (cx + 25, body_top),
        (170, 120, 95),
        -1
    )

    # Head
    cv2.circle(
        img,
        (cx, head_y),
        55,
        (190, 145, 120),
        -1
    )

    # Hair
    cv2.ellipse(
        img,
        (cx, head_y - 35),
        (55, 30),
        0,
        180,
        360,
        (25, 22, 20),
        -1
    )

    # Eyes
    cv2.circle(
        img,
        (cx - 20, head_y),
        4,
        (20, 20, 20),
        -1
    )
    cv2.circle(
        img,
        (cx + 20, head_y),
        4,
        (20, 20, 20),
        -1
    )

    # Attack animation
    if opponent_attack:

        if opponent_attack_type == "LEFT":

            cv2.line(
                img,
                (cx - 70, body_top + 30),
                (cx - 260, head_y + 15),
                (45, 60, 190),
                30
            )

            cv2.circle(
                img,
                (cx - 275, head_y + 10),
                34,
                (30, 35, 160),
                -1
            )

        elif opponent_attack_type == "RIGHT":

            cv2.line(
                img,
                (cx + 70, body_top + 30),
                (cx + 260, head_y + 15),
                (45, 60, 190),
                30
            )

            cv2.circle(
                img,
                (cx + 275, head_y + 10),
                34,
                (30, 35, 160),
                -1
            )

        else:

            cv2.line(
                img,
                (cx - 70, body_top + 30),
                (cx - 115, head_y + 5),
                (45, 60, 190),
                27
            )

            cv2.line(
                img,
                (cx + 70, body_top + 30),
                (cx + 115, head_y + 5),
                (45, 60, 190),
                27
            )

    else:

        # Guard pose
        cv2.line(
            img,
            (cx - 75, body_top + 30),
            (cx - 125, head_y + 60),
            (45, 60, 190),
            25
        )

        cv2.line(
            img,
            (cx + 75, body_top + 30),
            (cx + 125, head_y + 60),
            (45, 60, 190),
            25
        )

        cv2.circle(
            img,
            (cx - 125, head_y + 60),
            30,
            (30, 35, 160),
            -1
        )

        cv2.circle(
            img,
            (cx + 125, head_y + 60),
            30,
            (30, 35, 160),
            -1
        )

    # Guard indicator
    if guard_zone == "LEFT":
        guard_pos = (
            cx - 65,
            head_y + 10
        )
    elif guard_zone == "RIGHT":
        guard_pos = (
            cx + 65,
            head_y + 10
        )
    else:
        guard_pos = (
            cx,
            head_y - 10
        )

    cv2.circle(
        img,
        guard_pos,
        40,
        (0, 255, 255),
        4
    )

    cv2.putText(
        img,
        "GUARD",
        (
            guard_pos[0] - 35,
            guard_pos[1] + 60
        ),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (0, 255, 255),
        2,
        cv2.LINE_AA
    )


# ============================================================
# PLAYER GLOVE
# ============================================================

def draw_glove(
    img,
    pos,
    fist=False,
    punch=False
):
    if pos is None:
        return

    x, y = pos

    # Keep glove on screen
    x = max(50, min(WIDTH - 50, x))
    y = max(250, min(HEIGHT - 50, y))

    # Shadow
    cv2.ellipse(
        img,
        (x + 8, y + 10),
        (64, 44),
        0,
        0,
        360,
        (5, 8, 12),
        -1
    )

    if fist:

        cv2.circle(
            img,
            (x, y),
            62,
            (30, 50, 220),
            -1
        )

        for i in [-2, -1, 0, 1, 2]:
            cv2.line(
                img,
                (x + i * 17, y - 32),
                (x + i * 17, y + 12),
                (205, 215, 255),
                3
            )

    else:

        # Open hand is completely valid and idle.
        cv2.ellipse(
            img,
            (x, y),
            (58, 48),
            0,
            0,
            360,
            (55, 105, 235),
            -1
        )

        for i in [-2, -1, 0, 1, 2]:
            cv2.line(
                img,
                (x + i * 17, y - 20),
                (x + i * 20, y - 67),
                (55, 105, 235),
                12
            )

    # Wrist
    cv2.rectangle(
        img,
        (x - 32, y + 43),
        (x + 32, y + 83),
        (20, 35, 130),
        -1
    )

    if punch:

        cv2.circle(
            img,
            (x, y),
            82,
            (0, 230, 255),
            5
        )

        cv2.circle(
            img,
            (x, y),
            102,
            (255, 255, 255),
            2
        )


# ============================================================
# IMPACT
# ============================================================

def draw_impact(img, now):
    global impact_active

    elapsed = now - impact_start

    if elapsed > 0.38:
        impact_active = False
        return

    progress = elapsed / 0.38
    radius = int(30 + progress * 135)

    cv2.circle(
        img,
        (int(impact_x), int(impact_y)),
        radius,
        (0, 230, 255),
        5
    )

    cv2.circle(
        img,
        (int(impact_x), int(impact_y)),
        int(18 + progress * 50),
        (255, 255, 255),
        3
    )

    for angle in range(0, 360, 45):
        rad = math.radians(angle)

        x1 = int(
            impact_x +
            math.cos(rad) * 45
        )
        y1 = int(
            impact_y +
            math.sin(rad) * 45
        )

        x2 = int(
            impact_x +
            math.cos(rad) * radius
        )
        y2 = int(
            impact_y +
            math.sin(rad) * radius
        )

        cv2.line(
            img,
            (x1, y1),
            (x2, y2),
            (255, 255, 255),
            3
        )


# ============================================================
# HUD
# ============================================================

def draw_hud(img, time_left):

    # Top TV panel
    panel = img.copy()

    cv2.rectangle(
        panel,
        (0, 0),
        (WIDTH, 118),
        (7, 10, 18),
        -1
    )

    img[:] = cv2.addWeighted(
        panel,
        0.90,
        img,
        0.10,
        0
    )

    draw_health_bar(
        img,
        35,
        52,
        375,
        28,
        player_health,
        "YOU"
    )

    draw_health_bar(
        img,
        WIDTH - 410,
        52,
        375,
        28,
        opponent_health,
        "OPPONENT",
        True
    )

    draw_text_center(
        img,
        "AIR BOXING VS",
        35,
        0.86,
        2
    )

    cv2.putText(img, f"ROUND {round_number}   {player_round_wins}-{opponent_round_wins}", (WIDTH//2 - 120, 116), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 220, 80), 2, cv2.LINE_AA)

    seconds_left = max(
        0,
        int(time_left)
    )

    timer = f"{seconds_left // 60:02d}:{seconds_left % 60:02d}"

    draw_text_center(
        img,
        timer,
        94,
        0.65,
        2
    )

    cv2.putText(
        img,
        f"SCORE {score}",
        (35, 155),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    cv2.putText(
        img,
        f"HITS {hits}",
        (35, 188),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.52,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    cv2.putText(
        img,
        f"BLOCKED {blocked}",
        (140, 188),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.52,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    cv2.putText(
        img,
        f"DODGES {dodges}",
        (290, 188),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.52,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    cv2.putText(
        img,
        f"COMBO x{combo}",
        (WIDTH - 245, 155),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.68,
        (0, 230, 255),
        2,
        cv2.LINE_AA
    )

    if opponent_attack:
        telegraph = attack_telegraph_for(opponent_difficulty_level)
        remaining = max(0.0, telegraph - (time.time() - opponent_attack_start))
        if opponent_attack_type == "LEFT":
            warning = "INCOMING LEFT - DODGE RIGHT OR BLOCK"
        elif opponent_attack_type == "RIGHT":
            warning = "INCOMING RIGHT - DODGE LEFT OR BLOCK"
        else:
            warning = "INCOMING HEAD - DUCK OR BLOCK"
        cv2.rectangle(img, (250, 125), (1030, 166), (10, 30, 95), -1)
        draw_text_center(img, warning, 154, 0.62, 2, (0, 235, 255))
        cv2.putText(img, f"REACT {remaining:.1f}s", (535, 188),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 235, 255), 1, cv2.LINE_AA)
        cv2.putText(img, f"AI LEVEL {opponent_difficulty_level + 1}  {opponent_pattern_name}",
                    (WIDTH - 315, 188), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                    (180, 210, 255), 1, cv2.LINE_AA)


# ============================================================
# MATCH / ROUND FLOW
# ============================================================

def start_match():
    """Start Round 1 from the arcade menu."""
    global game_state, countdown_start, game_start_time
    global player_health, opponent_health, combo
    global next_attack_time, paused_at
    game_state = COUNTDOWN
    countdown_start = time.time()
    game_start_time = None
    player_health = MAX_HEALTH
    opponent_health = MAX_HEALTH
    combo = 0
    paused_at = None
    next_attack_time = time.time() + random.uniform(1.4, 2.3)


def start_next_round(now):
    """Reset only round health/state while keeping match statistics."""
    global game_state, countdown_start, game_start_time
    global player_health, opponent_health, combo
    global opponent_attack, opponent_attack_type, opponent_combo_queue
    global opponent_pattern_name, opponent_combo_count
    global next_attack_time, guard_zone, last_guard_change
    global round_break_start, paused_at
    game_state = COUNTDOWN
    countdown_start = now
    game_start_time = None
    player_health = MAX_HEALTH
    opponent_health = MAX_HEALTH
    combo = 0
    opponent_attack = False
    opponent_attack_type = None
    opponent_combo_queue = []
    opponent_pattern_name = "SINGLE"
    opponent_combo_count = 0
    guard_zone = random.choice(guard_zones)
    last_guard_change = now
    next_attack_time = now + random.uniform(1.4, 2.3)
    round_break_start = 0
    paused_at = None


def finish_round(now):
    """Award a round, then either finish the match or launch the next round."""
    global player_round_wins, opponent_round_wins, game_state, round_break_start
    global round_number
    if player_health > opponent_health:
        player_round_wins += 1
        set_message("ROUND WON!", 1.4)
    elif opponent_health > player_health:
        opponent_round_wins += 1
        set_message("ROUND LOST!", 1.4)
    else:
        set_message("ROUND DRAW!", 1.4)

    if player_round_wins >= ROUNDS_TO_WIN:
        game_state = WIN
        return
    if opponent_round_wins >= ROUNDS_TO_WIN:
        game_state = LOSE
        return
    if round_number >= TOTAL_ROUNDS:
        if player_round_wins > opponent_round_wins:
            game_state = WIN
        elif opponent_round_wins > player_round_wins:
            game_state = LOSE
        else:
            game_state = WIN if score >= 0 else LOSE
        return

    round_number += 1
    round_break_start = now
    game_state = ROUND_BREAK


def toggle_pause(now):
    """Pause without letting the round timer or attack timers jump."""
    global game_state, paused_at, game_start_time, next_attack_time
    global opponent_attack_start, last_guard_change
    if game_state == PLAYING:
        paused_at = now
        game_state = PAUSED
    elif game_state == PAUSED:
        delta = max(0.0, now - (paused_at or now))
        if game_start_time is not None:
            game_start_time += delta
        next_attack_time += delta
        opponent_attack_start += delta
        last_guard_change += delta
        paused_at = None
        game_state = PLAYING


# ============================================================
# RESET GAME
# ============================================================

def reset_game():
    global game_state
    global countdown_start
    global round_number
    global player_round_wins
    global opponent_round_wins
    global round_break_start
    global paused_at
    global game_start_time
    global player_health
    global opponent_health
    global score
    global hits
    global blocked
    global dodges
    global combo
    global best_combo
    global opponent_attack
    global opponent_attack_type
    global attack_body_baseline_x
    global attack_body_baseline_y
    global next_attack_time
    global guard_zone
    global last_guard_change
    global message
    global message_until
    global screen_shake
    global impact_active
    global last_left_x
    global last_right_x
    global block_started
    global block_active
    global body_baseline_x
    global body_baseline_y
    global opponent_combo_count
    global opponent_combo_queue
    global opponent_pattern_name
    global opponent_difficulty_level
    global last_opponent_attack_type
    global player_target_history
    global last_player_target
    global left_punch_armed
    global right_punch_armed
    global left_punch_origin
    global right_punch_origin
    global left_punch_direction
    global right_punch_direction

    game_state = MENU
    countdown_start = time.time()
    game_start_time = None
    round_number = 1
    player_round_wins = 0
    opponent_round_wins = 0
    round_break_start = 0
    paused_at = None

    player_health = MAX_HEALTH
    opponent_health = MAX_HEALTH

    score = 0
    hits = 0
    blocked = 0
    dodges = 0

    combo = 0
    best_combo = 0

    opponent_attack = False
    opponent_attack_type = None
    attack_body_baseline_x = body_center_x
    attack_body_baseline_y = body_center_y

    next_attack_time = (
        time.time() +
        random.uniform(
            ATTACK_MIN_DELAY,
            ATTACK_MAX_DELAY
        )
    )

    guard_zone = random.choice(
        guard_zones
    )

    last_guard_change = time.time()

    message = ""
    message_until = 0

    screen_shake = 0
    impact_active = False

    last_left_x = 0.28 * WIDTH
    last_right_x = 0.72 * WIDTH
    block_started = None
    block_active = False
    body_baseline_x = body_center_x
    body_baseline_y = body_center_y
    opponent_combo_count = 0
    opponent_combo_queue = []
    opponent_pattern_name = "SINGLE"
    opponent_difficulty_level = 0
    last_opponent_attack_type = None
    player_target_history.clear()
    last_player_target = None
    left_punch_armed = True
    right_punch_armed = True
    left_punch_origin = None
    right_punch_origin = None
    left_punch_direction = None
    right_punch_direction = None


# ============================================================
# PUNCH REGISTRATION
# ============================================================

def register_player_hit(hand_name, hand_pos, now):
    global opponent_health
    global last_player_target
    global hits
    global blocked
    global combo
    global best_combo
    global score
    global impact_active
    global impact_x
    global impact_y
    global impact_start
    global screen_shake
    global flash_until

    if hand_pos is None:
        return

    x, y = hand_pos

    # Target selection:
    # high hand position = HEAD
    # lower position = side
    if y < 430:
        target = "HEAD"
    elif x < WIDTH // 2:
        target = "LEFT"
    else:
        target = "RIGHT"

    # Remember attempted targets so the opponent can adapt its guard.
    last_player_target = target
    player_target_history.append(target)

    if target == guard_zone:

        combo = 0

        set_message(
            "OPPONENT GUARDED!",
            0.55
        )

        return

    hits += 1
    combo += 1
    best_combo = max(
        best_combo,
        combo
    )

    # Combo rewards timing without letting successive hits turn into a
    # two-punch knockout.  Each clean hit deals 9–12 damage.
    damage = (
        PLAYER_DAMAGE +
        min(combo, 3)
    )

    opponent_health = max(
        0,
        opponent_health - damage
    )

    score += (
        12 +
        combo * 3
    )

    impact_active = True
    impact_x = WIDTH // 2
    impact_y = 275
    impact_start = now

    flash_until = now + 0.08

    play_sound(hit_sound)

    set_message(
        f"{hand_name} PUNCH!",
        0.55
    )


# ============================================================
# OPPONENT ATTACK
# ============================================================

def start_opponent_attack(now, continuing_combo=False):
    global opponent_attack
    global opponent_attack_type
    global opponent_attack_start
    global opponent_combo_count
    global opponent_combo_queue
    global opponent_pattern_name
    global opponent_difficulty_level
    global last_opponent_attack_type
    global attack_body_baseline_x
    global attack_body_baseline_y

    opponent_attack = True

    if continuing_combo and opponent_combo_queue:
        opponent_attack_type = opponent_combo_queue.pop(0)
    else:
        opponent_difficulty_level = get_opponent_difficulty(now)
        level = opponent_difficulty_level
        opening = random.choices(
            ["LEFT", "RIGHT", "HEAD"],
            weights=[4, 4, 2 + level]
        )[0]

        # The sequence is chosen before the first attack.  This creates
        # recognizable patterns, but each hit still has its own telegraph.
        patterns = [("SINGLE", [])]
        if level >= 1:
            patterns += [
                ("ONE-TWO", ["RIGHT" if opening == "LEFT" else "LEFT"]),
                ("BODY-HEAD", ["HEAD"]),
                ("ONE-TWO-HEAD", ["RIGHT" if opening == "LEFT" else "LEFT", "HEAD"]),
            ]
        if level >= 2:
            patterns += [
                ("DOUBLE", [opening]),
                ("SIDE-TO-SIDE", ["RIGHT" if opening == "LEFT" else "LEFT"]),
            ]
        if level >= 3:
            patterns += [
                ("THREE-PIECE", ["RIGHT" if opening == "LEFT" else "LEFT", "HEAD"]),
                ("HEAD-SIDES", ["LEFT", "RIGHT"]),
            ]

        opponent_pattern_name, opponent_combo_queue = random.choice(patterns)
        opponent_attack_type = opening

    # Avoid an identical opening on separate exchanges where possible.
    if not continuing_combo and opponent_attack_type == last_opponent_attack_type:
        alternatives = [attack for attack in ["LEFT", "RIGHT", "HEAD"]
                        if attack != opponent_attack_type]
        opponent_attack_type = random.choice(alternatives)
    last_opponent_attack_type = opponent_attack_type
    opponent_combo_count = len(opponent_combo_queue) + 1

    opponent_attack_start = now
    # Compare the player's body with this exact pre-attack position, rather
    # than with one noisy webcam frame.
    attack_body_baseline_x = body_center_x
    attack_body_baseline_y = body_center_y

def process_opponent_attack(now):
    global opponent_attack
    global next_attack_time
    global player_health
    global blocked
    global combo
    global dodges
    global score
    global opponent_combo_count
    global opponent_combo_queue
    global opponent_pattern_name
    global screen_shake

    if not opponent_attack:
        return

    elapsed = now - opponent_attack_start

    # The warning is long enough to let a webcam user get into position.
    if elapsed < attack_telegraph_for(opponent_difficulty_level):
        return

    # Block has priority and protects every punch type.
    if block_active:
        blocked += 1
        score += 6
        set_message("BLOCKED!", 0.70)
    else:
        move_x = body_center_x - attack_body_baseline_x
        move_y = body_center_y - attack_body_baseline_y

        if opponent_attack_type == "LEFT":
            dodged = move_x > DODGE_DISTANCE
            dodge_label = "DODGE RIGHT"
        elif opponent_attack_type == "RIGHT":
            dodged = move_x < -DODGE_DISTANCE
            dodge_label = "DODGE LEFT"
        else:
            dodged = move_y > DUCK_DISTANCE
            dodge_label = "DUCK"

        if dodged:
            dodges += 1
            score += 8
            set_message(f"{dodge_label}!", 0.70)
        else:
            damage = OPPONENT_DAMAGE + opponent_difficulty_level
            player_health = max(0, player_health - damage)
            combo = 0
            set_message("HIT TAKEN!", 0.70)
            play_sound(hit_sound)

    opponent_combo_count = len(opponent_combo_queue)

    # Short sequences make the opponent meaningful without becoming
    # overwhelming; every attack remains separately defendable.
    if opponent_combo_queue and player_health > 0:
        opponent_attack = False
        next_attack_time = now + random.uniform(0.46, 0.72)
    else:
        opponent_attack = False
        opponent_pattern_name = "SINGLE"
        next_attack_time = now + attack_delay_for(opponent_difficulty_level)



def draw_live_camera_pip(game_img, camera_img):
    """Draw a small mirrored live-camera PIP over the game."""
    if camera_img is None or camera_img.size == 0:
        return

    pip_w = 300
    pip_h = 169
    margin = 18

    cam = cv2.resize(
        camera_img,
        (pip_w, pip_h),
        interpolation=cv2.INTER_AREA
    )

    # Camera is already mirrored before MediaPipe processing.
    # Add a dark backing and a clean border.
    x1 = WIDTH - pip_w - margin
    y1 = 125
    x2 = x1 + pip_w
    y2 = y1 + pip_h

    cv2.rectangle(
        game_img,
        (x1 - 5, y1 - 5),
        (x2 + 5, y2 + 5),
        (8, 10, 16),
        -1
    )

    game_img[y1:y2, x1:x2] = cam

    cv2.rectangle(
        game_img,
        (x1, y1),
        (x2, y2),
        (255, 255, 255),
        3
    )

    # Live indicator
    cv2.circle(
        game_img,
        (x1 + 17, y1 + 20),
        6,
        (0, 0, 255),
        -1
    )

    cv2.putText(
        game_img,
        "LIVE CAMERA",
        (x1 + 32, y1 + 27),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.48,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )


# ============================================================
# MAIN MEDIAPIPE LOOP
# ============================================================

reset_game()

with mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    model_complexity=1,
    min_detection_confidence=0.55,
    min_tracking_confidence=0.55
) as hands, mp_pose.Pose(
    static_image_mode=False,
    model_complexity=0,
    enable_segmentation=False,
    min_detection_confidence=0.50,
    min_tracking_confidence=0.50
) as pose:

    while True:

        now = time.time()

        # ----------------------------------------------------
        # CAMERA
        # ----------------------------------------------------

        ret, frame = cap.read()

        if not ret:
            print(
                "ERROR: Camera frame could not be read."
            )
            break

        # Mirror camera for natural movement.
        frame = cv2.flip(
            frame,
            1
        )
        camera_display_frame = frame.copy()

        camera_h, camera_w = frame.shape[:2]

        # ----------------------------------------------------
        # MEDIAPIPE
        # ----------------------------------------------------

        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        rgb.flags.writeable = False

        results = hands.process(
            rgb
        )
        pose_results = pose.process(rgb)

        rgb.flags.writeable = True

        # ----------------------------------------------------
        # TRACKED HAND DATA FOR THIS FRAME
        # ----------------------------------------------------

        new_left = None
        new_right = None

        new_left_fist = False
        new_right_fist = False

        # MediaPipe handedness is used for stable physical hand identity.
        # The camera frame is flipped before processing, which gives MediaPipe
        # the mirrored/selfie orientation it expects. Therefore:
        #   MediaPipe Left  -> user's physical LEFT hand
        #   MediaPipe Right -> user's physical RIGHT hand
        if results.multi_hand_landmarks:

            for hand_index, hand_landmarks in enumerate(
                results.multi_hand_landmarks
            ):

                wrist = (
                    hand_landmarks.landmark[0]
                )

                raw_x = (
                    wrist.x *
                    camera_w
                )

                raw_y = (
                    wrist.y *
                    camera_h
                )

                game_x = int(
                    raw_x /
                    camera_w *
                    WIDTH
                )

                game_y = int(
                    raw_y /
                    camera_h *
                    HEIGHT
                )

                game_x = max(
                    55,
                    min(
                        WIDTH - 55,
                        game_x
                    )
                )

                game_y = max(
                    245,
                    min(
                        HEIGHT - 55,
                        game_y
                    )
                )

                fist = is_fist(
                    hand_landmarks
                )

                physical_hand = None

                if (
                    results.multi_handedness
                    and
                    hand_index < len(
                        results.multi_handedness
                    )
                ):
                    mp_label = (
                        results.multi_handedness[hand_index]
                        .classification[0]
                        .label
                    )

                    physical_hand = (
                        "LEFT"
                        if mp_label == "Left"
                        else "RIGHT"
                    )

                # If handedness is temporarily unavailable, fall back to
                # the mirrored screen position for this frame.
                if physical_hand is None:
                    physical_hand = (
                        "LEFT"
                        if game_x < WIDTH // 2
                        else "RIGHT"
                    )

                if physical_hand == "LEFT":

                    if (
                        new_left is None
                        or
                        abs(game_x - last_left_x)
                        <
                        abs(game_x - last_right_x)
                    ):
                        new_left = (
                            game_x,
                            game_y
                        )
                        new_left_fist = fist

                else:

                    if (
                        new_right is None
                        or
                        abs(game_x - last_right_x)
                        <
                        abs(game_x - last_left_x)
                    ):
                        new_right = (
                            game_x,
                            game_y
                        )
                        new_right_fist = fist

        # ----------------------------------------------------
        # RESPONSIVE POSITION UPDATE
        # ----------------------------------------------------
        frame_dt = max(0.008, min(0.08, now - last_frame_time))
        last_frame_time = now

        if new_left is not None:
            old_left = left_hand_pos

            left_hand_pos = lerp(
                left_hand_pos,
                new_left,
                POSITION_ALPHA
            )

            last_left_x = left_hand_pos[0]

            if old_left is not None:
                # Use the newly detected hand position for velocity so
                # fast punches are not hidden by visual smoothing.
                left_speed = (
                    distance(new_left, old_left)
                    / frame_dt
                )
            else:
                left_speed = 0.0

            left_prev_pos = old_left

        else:
            left_speed *= 0.55
            left_prev_pos = None

        if new_right is not None:
            old_right = right_hand_pos

            right_hand_pos = lerp(
                right_hand_pos,
                new_right,
                POSITION_ALPHA
            )

            last_right_x = right_hand_pos[0]

            if old_right is not None:
                # Use raw detected movement for punch responsiveness.
                right_speed = (
                    distance(new_right, old_right)
                    / frame_dt
                )
            else:
                right_speed = 0.0

            right_prev_pos = old_right

        else:
            right_speed *= 0.55
            right_prev_pos = None

        # ----------------------------------------------------
        # FIST STATE
        # ----------------------------------------------------

        left_fist_now = (
            new_left_fist
            if new_left is not None
            else False
        )

        right_fist_now = (
            new_right_fist
            if new_right is not None
            else False
        )

        # Rearm only after a clear recoil.  Keeping a fist closed while its
        # landmark jitters can therefore never count as a stream of punches.
        if not left_punch_armed and can_rearm_punch(
            left_hand_pos, left_punch_origin, left_punch_direction
        ):
            left_punch_armed = True

        if not right_punch_armed and can_rearm_punch(
            right_hand_pos, right_punch_origin, right_punch_direction
        ):
            right_punch_armed = True

        # ----------------------------------------------------
        # GAME SCREEN
        # ----------------------------------------------------

        screen = np.zeros(
            (
                HEIGHT,
                WIDTH,
                3
            ),
            dtype=np.uint8
        )

        draw_background(
            screen
        )

        # ----------------------------------------------------
        # BODY / DEFENCE TRACKING
        # ----------------------------------------------------

        shoulders_visible = False
        if pose_results.pose_landmarks:
            pose_lm = pose_results.pose_landmarks.landmark
            left_shoulder = pose_lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = pose_lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
            if left_shoulder.visibility > 0.45 and right_shoulder.visibility > 0.45:
                current_body_x = (left_shoulder.x + right_shoulder.x) / 2
                current_body_y = (left_shoulder.y + right_shoulder.y) / 2
                shoulders_visible = True
        
        # If only the hands are in frame, keep the game playable; pose is
        # still preferred whenever shoulders can be seen.
        if not shoulders_visible and left_hand_pos is not None and right_hand_pos is not None:
            current_body_x = (left_hand_pos[0] + right_hand_pos[0]) / (2 * WIDTH)
            current_body_y = (left_hand_pos[1] + right_hand_pos[1]) / (2 * HEIGHT)

        if shoulders_visible or (left_hand_pos is not None and right_hand_pos is not None):
            body_dx = current_body_x - body_center_x
            body_dy = current_body_y - body_center_y
            previous_body_x = body_center_x
            previous_body_y = body_center_y
            body_center_x = current_body_x
            body_center_y = current_body_y
            # Idle baseline is slow-moving, which filters ordinary webcam
            # jitter without swallowing a deliberate dodge during a warning.
            if not opponent_attack:
                body_baseline_x = body_baseline_x * 0.94 + body_center_x * 0.06
                body_baseline_y = body_baseline_y * 0.94 + body_center_y * 0.06

        # Both fists close to the shoulder/head area, held for a moment.
        guard_candidate = False
        if left_hand_pos is not None and right_hand_pos is not None and left_fist_now and right_fist_now:
            hands_close = distance(left_hand_pos, right_hand_pos) < WIDTH * 0.42
            if shoulders_visible:
                head_y = body_center_y * HEIGHT - 95
                near_head = left_hand_pos[1] < head_y + 150 and right_hand_pos[1] < head_y + 150
            else:
                near_head = left_hand_pos[1] < HEIGHT * 0.62 and right_hand_pos[1] < HEIGHT * 0.62
            guard_candidate = hands_close and near_head

        if guard_candidate:
            if block_started is None:
                block_started = now
            block_active = now - block_started >= BLOCK_HOLD_TIME
        else:
            block_started = None
            block_active = False

        # ----------------------------------------------------
        # ROUND BREAK
        # ----------------------------------------------------

        if game_state == ROUND_BREAK:
            elapsed_break = now - round_break_start
            draw_text_center(screen, f"ROUND {round_number}", 375, 2.0, 5, (255, 220, 80))
            draw_text_center(screen, "GET READY!", 435, 1.15, 4, (255, 255, 255))
            draw_text_center(screen, f"YOU {player_round_wins}  -  {opponent_round_wins} OPPONENT", 495, 0.70, 2)
            if elapsed_break > ROUND_BREAK_TIME:
                start_next_round(now)

        # ----------------------------------------------------
        # COUNTDOWN
        # ----------------------------------------------------

        if game_state == COUNTDOWN:

            elapsed = (
                now -
                countdown_start
            )

            number = 3 - int(elapsed)

            if 1 <= number <= 3:

                if number != int(
                    max(
                        0,
                        3 -
                        int(
                            elapsed -
                            0.03
                        )
                    )
                ):
                    pass

                # Play only when crossing each second.
                countdown_index = 3 - number

                if not hasattr(
                    reset_game,
                    "_last_countdown"
                ):
                    reset_game._last_countdown = -1

                if (
                    countdown_index !=
                    reset_game._last_countdown
                ):
                    play_sound(
                        countdown_sound
                    )
                    reset_game._last_countdown = (
                        countdown_index
                    )

                draw_text_center(
                    screen,
                    str(number),
                    425,
                    4.0,
                    8,
                    (255, 255, 255)
                )

            else:

                draw_text_center(
                    screen,
                    f"FIGHT!  •  ROUND {round_number}",
                    425,
                    2.2,
                    6,
                    (0, 255, 80)
                )

                if elapsed > 3.7:

                    game_state = PLAYING
                    game_start_time = now

                    next_attack_time = (
                        now +
                        random.uniform(
                            1.3,
                            2.2
                        )
                    )

                    play_sound(
                        fight_sound
                    )

        # ----------------------------------------------------
        # PLAYING
        # ----------------------------------------------------

        if game_state == PLAYING:

            # ================================================
            # RIGHT PUNCH
            # ================================================

            right_moved = (
                new_right is not None
                and
                right_speed > PUNCH_SPEED
                and
                (right_prev_pos is None or distance(new_right, right_prev_pos) >= PUNCH_MIN_TRAVEL)
            )

            # A punch is a closed fist moving quickly.
            # We intentionally do not require a specific direction,
            # because webcams can reverse depth/direction depending
            # on the user's position.
            if (
                right_fist_now
                and
                right_moved
                and
                right_punch_armed
                and
                now -
                right_last_punch >
                PUNCH_COOLDOWN
            ):

                right_last_punch = now
                right_punch_effect = now
                right_punch_armed = False
                right_punch_origin = right_hand_pos
                motion_x = right_hand_pos[0] - right_prev_pos[0]
                motion_y = right_hand_pos[1] - right_prev_pos[1]
                motion_length = max(1.0, math.hypot(motion_x, motion_y))
                right_punch_direction = (
                    motion_x / motion_length,
                    motion_y / motion_length
                )

                play_sound(
                    punch_sound
                )

                register_player_hit(
                    "RIGHT",
                    right_hand_pos,
                    now
                )

            # ================================================
            # LEFT PUNCH
            # ================================================

            left_moved = (
                new_left is not None
                and
                left_speed > PUNCH_SPEED
                and
                (left_prev_pos is None or distance(new_left, left_prev_pos) >= PUNCH_MIN_TRAVEL)
            )

            if (
                left_fist_now
                and
                left_moved
                and
                left_punch_armed
                and
                now -
                left_last_punch >
                PUNCH_COOLDOWN
            ):

                left_last_punch = now
                left_punch_effect = now
                left_punch_armed = False
                left_punch_origin = left_hand_pos
                motion_x = left_hand_pos[0] - left_prev_pos[0]
                motion_y = left_hand_pos[1] - left_prev_pos[1]
                motion_length = max(1.0, math.hypot(motion_x, motion_y))
                left_punch_direction = (
                    motion_x / motion_length,
                    motion_y / motion_length
                )

                play_sound(
                    punch_sound
                )

                register_player_hit(
                    "LEFT",
                    left_hand_pos,
                    now
                )

            # ================================================
            # GUARD CHANGES
            # ================================================

            # Guard changes faster as the round progresses.
            guard_interval = max(
                0.75,
                GUARD_CHANGE_TIME -
                (
                    1.0 -
                    opponent_health /
                    MAX_HEALTH
                ) * 0.45
            )

            if (
                now -
                last_guard_change >
                guard_interval
            ):

                old_guard = guard_zone

                choices = [z for z in guard_zones if z != old_guard]

                # At higher difficulty the AI learns what the player has been
                # targeting, but it still makes mistakes so the game stays fair.
                adaptive = opponent_difficulty_level >= 1 and bool(player_target_history)
                if adaptive and random.random() < (0.45 + 0.12 * opponent_difficulty_level):
                    counts = {z: player_target_history.count(z) for z in guard_zones}
                    best_targets = [z for z in choices if counts[z] == max(counts[c] for c in choices)]
                    guard_zone = random.choice(best_targets)
                else:
                    guard_zone = random.choice(choices)

                last_guard_change = now

            # ================================================
            # OPPONENT ATTACK
            # ================================================

            if (
                not opponent_attack
                and
                now >= next_attack_time
            ):

                start_opponent_attack(
                    now,
                    continuing_combo=bool(opponent_combo_queue)
                )

            process_opponent_attack(
                now
            )

            # ================================================
            # WIN / LOSE
            # ================================================

            if opponent_health <= 0:

                opponent_health = 0
                player_round_wins += 1
                play_sound(ko_sound)
                if player_round_wins >= ROUNDS_TO_WIN:
                    game_state = WIN
                elif round_number < TOTAL_ROUNDS:
                    round_number += 1
                    round_break_start = now
                    game_state = ROUND_BREAK
                else:
                    game_state = WIN

            elif player_health <= 0:

                player_health = 0
                opponent_round_wins += 1
                play_sound(ko_sound)
                if opponent_round_wins >= ROUNDS_TO_WIN:
                    game_state = LOSE
                elif round_number < TOTAL_ROUNDS:
                    round_number += 1
                    round_break_start = now
                    game_state = ROUND_BREAK
                else:
                    game_state = LOSE

        # ----------------------------------------------------
        # TIMER
        # ----------------------------------------------------

        if game_start_time is None:

            time_left = ROUND_TIME

        else:

            time_left = max(
                0,
                ROUND_TIME -
                (
                    now -
                    game_start_time
                )
            )

        if (
            game_state == PLAYING
            and
            time_left <= 0
        ):

            finish_round(now)
            play_sound(ko_sound)

        # ----------------------------------------------------
        # DRAW OPPONENT
        # ----------------------------------------------------

        draw_opponent(
            screen
        )

        # ----------------------------------------------------
        # DRAW PLAYER GLOVES
        # ----------------------------------------------------

        draw_glove(
            screen,
            left_hand_pos,
            left_fist_now,
            now -
            left_punch_effect <
            0.14
        )

        draw_glove(
            screen,
            right_hand_pos,
            right_fist_now,
            now -
            right_punch_effect <
            0.14
        )

        # ----------------------------------------------------
        # IMPACT
        # ----------------------------------------------------

        if impact_active:
            draw_impact(
                screen,
                now
            )

        # ----------------------------------------------------
        # HUD
        # ----------------------------------------------------

        draw_hud(
            screen,
            time_left
        )

        # ----------------------------------------------------
        # HAND STATUS
        # ----------------------------------------------------

        left_status = (
            "FIST"
            if left_fist_now
            else
            "OPEN"
        )

        right_status = (
            "FIST"
            if right_fist_now
            else
            "OPEN"
        )

        cv2.putText(
            screen,
            f"LEFT HAND: {left_status}",
            (35, 225),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.52,
            (210, 225, 255),
            2,
            cv2.LINE_AA
        )

        cv2.putText(
            screen,
            f"RIGHT HAND: {right_status}",
            (35, 260),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.52,
            (210, 225, 255),
            2,
            cv2.LINE_AA
        )

        if block_active:
            defence_status = "BLOCK READY"
            defence_color = (0, 255, 120)
        elif block_started is not None:
            defence_status = "HOLD GUARD..."
            defence_color = (0, 230, 255)
        elif shoulders_visible:
            defence_status = "BODY TRACKING: ON"
            defence_color = (170, 255, 170)
        else:
            defence_status = "BODY TRACKING: SHOW SHOULDERS"
            defence_color = (0, 210, 255)

        cv2.putText(
            screen,
            defence_status,
            (35, 295),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            defence_color,
            2,
            cv2.LINE_AA
        )

        # Instructions
        cv2.putText(
            screen,
            "PUNCH: FIST + FAST MOVE | BLOCK: BOTH FISTS BY FACE | LEFT/RIGHT: MOVE BODY | HEAD: DUCK",
            (WIDTH // 2 - 455, HEIGHT - 22),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.40,
            (220, 220, 220),
            1,
            cv2.LINE_AA
        )

        # ----------------------------------------------------
        # MESSAGE
        # ----------------------------------------------------

        if now < message_until:

            if (
                "BLOCKED" in message
            ):
                msg_color = (
                    0,
                    230,
                    255
                )

            elif (
                "DODGED" in message
            ):
                msg_color = (
                    0,
                    255,
                    255
                )

            elif (
                "TAKEN" in message
            ):
                msg_color = (
                    0,
                    60,
                    255
                )

            else:
                msg_color = (
                    0,
                    255,
                    80
                )

            draw_text_center(
                screen,
                message,
                230,
                1.15,
                4,
                msg_color
            )

        # ----------------------------------------------------
        # FLASH
        # ----------------------------------------------------

        if now < flash_until:

            flash = np.full_like(
                screen,
                255
            )

            screen = cv2.addWeighted(
                screen,
                0.80,
                flash,
                0.20,
                0
            )

        # ----------------------------------------------------
        # WIN SCREEN
        # ----------------------------------------------------

        if game_state == WIN:

            overlay = screen.copy()

            cv2.rectangle(
                overlay,
                (0, 0),
                (WIDTH, HEIGHT),
                (0, 120, 0),
                -1
            )

            screen = cv2.addWeighted(
                overlay,
                0.30,
                screen,
                0.70,
                0
            )

            draw_text_center(
                screen,
                "YOU WIN!",
                390,
                2.7,
                7,
                (0, 255, 80)
            )

            draw_text_center(
                screen,
                f"ROUNDS: {player_round_wins} - {opponent_round_wins}",
                455,
                0.9,
                3
            )

            draw_text_center(
                screen,
                f"BEST COMBO: x{best_combo}",
                495,
                0.65,
                2
            )

            draw_text_center(
                screen,
                "PRESS R TO PLAY AGAIN",
                545,
                0.65,
                2
            )

            draw_text_center(
                screen,
                "PRESS Q TO QUIT",
                580,
                0.55,
                2
            )

        # ----------------------------------------------------
        # LOSE SCREEN
        # ----------------------------------------------------

        elif game_state == LOSE:

            overlay = screen.copy()

            cv2.rectangle(
                overlay,
                (0, 0),
                (WIDTH, HEIGHT),
                (0, 0, 120),
                -1
            )

            screen = cv2.addWeighted(
                overlay,
                0.30,
                screen,
                0.70,
                0
            )

            draw_text_center(
                screen,
                "YOU LOSE",
                390,
                2.7,
                7,
                (0, 50, 255)
            )

            draw_text_center(
                screen,
                f"ROUNDS: {player_round_wins} - {opponent_round_wins}",
                455,
                0.9,
                3
            )

            draw_text_center(
                screen,
                f"BEST COMBO: x{best_combo}",
                495,
                0.65,
                2
            )

            draw_text_center(
                screen,
                "PRESS R TO PLAY AGAIN",
                545,
                0.65,
                2
            )

            draw_text_center(
                screen,
                "PRESS Q TO QUIT",
                580,
                0.55,
                2
            )

        # Screen shake disabled for a stable camera/game view.

        # ----------------------------------------------------
        # ARCADE MENU / PAUSE OVERLAYS
        # ----------------------------------------------------

        if game_state == MENU:
            overlay = screen.copy()
            cv2.rectangle(overlay, (0, 0), (WIDTH, HEIGHT), (5, 8, 18), -1)
            screen = cv2.addWeighted(overlay, 0.82, screen, 0.18, 0)
            draw_text_center(screen, "AIR BOXING VS", 205, 2.0, 6, (255, 255, 255))
            draw_text_center(screen, "ARCADE CHAMPIONSHIP", 255, 0.85, 3, (0, 220, 255))
            cv2.rectangle(screen, (360, 300), (920, 385), (20, 35, 75), -1)
            cv2.rectangle(screen, (360, 300), (920, 385), (0, 230, 255), 3)
            draw_text_center(screen, "PRESS ENTER OR S TO START", 355, 0.80, 3, (255, 255, 255))
            draw_text_center(screen, "3 ROUNDS  •  60 SEC EACH  •  FIRST TO 2 ROUNDS", 430, 0.58, 2)
            draw_text_center(screen, "PUNCH: FIST + FAST MOVE     BLOCK: BOTH FISTS BY FACE", 475, 0.50, 2)
            draw_text_center(screen, "DODGE: MOVE LEFT/RIGHT     DUCK: LOWER YOUR BODY", 510, 0.50, 2)
            draw_text_center(screen, "P: PAUSE     Q: QUIT", 560, 0.60, 2, (180, 220, 255))

        elif game_state == PAUSED:
            overlay = screen.copy()
            cv2.rectangle(overlay, (0, 0), (WIDTH, HEIGHT), (10, 15, 30), -1)
            screen = cv2.addWeighted(overlay, 0.72, screen, 0.28, 0)
            draw_text_center(screen, "PAUSED", 320, 2.4, 7, (255, 220, 80))
            draw_text_center(screen, "PRESS P TO RESUME", 390, 0.85, 3)
            draw_text_center(screen, "Q TO QUIT", 435, 0.62, 2)

        # ----------------------------------------------------
        # CONTROLS
        # ----------------------------------------------------

        cv2.putText(
            screen,
            "Q - QUIT",
            (
                WIDTH - 135,
                HEIGHT - 22
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            (220, 220, 220),
            2,
            cv2.LINE_AA
        )

        # ----------------------------------------------------
        # LIVE CAMERA PIP
        # ----------------------------------------------------
        # The frame is the same mirrored camera frame used for
        # MediaPipe, so what you see matches your hand controls.
        draw_live_camera_pip(
            screen,
            camera_display_frame
        )

        # ----------------------------------------------------
        # DISPLAY
        # ----------------------------------------------------

        cv2.imshow(
            WINDOW_NAME,
            screen
        )

        key = (
            cv2.waitKey(1) &
            0xFF
        )

        if key == ord("q"):
            break

        if key in (13, ord("s")) and game_state == MENU:
            start_match()
            if hasattr(reset_game, "_last_countdown"):
                reset_game._last_countdown = -1

        if key == ord("p") and game_state in (PLAYING, PAUSED):
            toggle_pause(now)

        if key == ord("r") and game_state in (WIN, LOSE):
            reset_game()

            if hasattr(
                reset_game,
                "_last_countdown"
            ):
                reset_game._last_countdown = -1


# ============================================================
# CLEANUP
# ============================================================

cap.release()
cv2.destroyAllWindows()

try:
    pygame.quit()
except Exception:
    pass

print()
print("======================================")
print("          AIR BOXING VS")
print("======================================")
print("Score       :", score)
print("Hits        :", hits)
print("Blocked     :", blocked)
print("Dodges      :", dodges)
print("Best Combo  :", best_combo)
print("Audio       :", "ON" if SOUND_OK else "OFF")
print("======================================")
