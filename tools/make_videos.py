#!/usr/bin/env python3
"""Render my portfolio's project walkthrough videos from captured app screens.

Each video moves real screenshots through the app's navigation (taps or clicks,
page transitions, scrolling, and zooms) with a caption for every step.

Run from the portfolio folder:

    python3 tools/make_videos.py            # every project
    python3 tools/make_videos.py hydro ml   # selected projects
    python3 tools/make_videos.py --js       # only print the app.js entries

Needs a Mac with Python 3 (Pillow, NumPy) and ffmpeg built with libx264 and
VideoToolbox. Writes assets/videos/<id>.mp4 (H.264), <id>.hevc.mp4 (HEVC, for
Safari) and <id>.jpg (poster), then prints each project's `video` entry for
app.js. If you change a step's timing or text, paste the printed entry over
the old one so the step buttons stay in sync.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "assets" / "projects"
OUT = ROOT / "assets" / "videos"
FONT_FILE = ROOT / "assets" / "instrument-sans.ttf"

W, H, FPS = 1600, 900, 30
BG = (21, 27, 24)
TEXT = (239, 238, 229)
MUTED = (175, 186, 176)
ACCENT = (190, 216, 194)
LINE = (73, 87, 75)
INK = (38, 58, 47)
PAPER = (251, 251, 247)

PANEL_X, PANEL_W = 96, 420
MEDIA_CENTER = (1060, 450)
FULL = (0.0, 0.0, 1.0, 1.0)

# Seconds each kind of screen change takes.
TRANSITIONS = {
    "none": 0.0,
    "fade": 0.45,
    "tab": 0.3,
    "push": 0.5,
    "pop": 0.5,
    "sheet": 0.5,
    "dialog": 0.4,
    "scroll": 0.75,
    "stitch": 0.95,
    "xfade": 0.75,
}


# ---------------------------------------------------------------- helpers


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def ease(x):
    x = clamp(x)
    return 4 * x**3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


_fonts = {}


def font(size, weight=400):
    key = (size, weight)
    if key not in _fonts:
        f = ImageFont.truetype(str(FONT_FILE), size)
        f.set_variation_by_axes([100, weight])
        _fonts[key] = f
    return _fonts[key]


def wrap(text, f, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if line and f.getlength(trial) > width:
            lines.append(line)
            line = word
        else:
            line = trial
    return lines + ([line] if line else [])


def tracked(draw, xy, text, f, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += f.getlength(ch) + tracking


def shot(name):
    return Image.open(SHOTS / name).convert("RGB")


def fade_alpha(img, k):
    """Scale an RGBA image's opacity by k."""
    if k >= 0.999:
        return img
    a = np.asarray(img).copy()
    a[..., 3] = (a[..., 3] * k).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def rounded_mask(size, radius, scale=3, corners=None):
    w, h = size
    m = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (0, 0, w * scale - 1, h * scale - 1),
        radius=radius * scale,
        fill=255,
        corners=corners,
    )
    return m.resize(size, Image.LANCZOS)


def soft_shadow(size, radius, pad=90, drop=20, blur=34, strength=150):
    w, h = size
    s = Image.new("L", (w + 2 * pad, h + 2 * pad), 0)
    ImageDraw.Draw(s).rounded_rectangle(
        (pad, pad + drop, pad + w, pad + h + drop), radius=radius, fill=strength
    )
    return s.filter(ImageFilter.GaussianBlur(blur)), pad


def background(tint):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = MEDIA_CENTER
    r = np.sqrt(((x - cx) / 950) ** 2 + ((y - cy) / 720) ** 2)
    glow = np.clip(1 - r, 0, 1) ** 2
    base = np.array(BG, np.float32)
    img = base + (np.array(tint, np.float32) - base) * glow[..., None]
    img += np.random.default_rng(7).uniform(-0.9, 0.9, (H, W))[..., None]
    return Image.fromarray(np.clip(img + 0.5, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- devices


class Phone:
    """A minimal phone body; screens are shown at its screen size."""

    kind = "phone"

    def __init__(self, aspect, height=748, center=(1050, 450), inset=0):
        bezel = 12
        self.inset = inset
        self.sh = height
        self.sw = round(height / aspect)
        fw, fh = self.sw + 2 * bezel, self.sh + 2 * bezel
        self.x0 = round(center[0] - fw / 2)
        self.y0 = round(center[1] - fh / 2)
        self.sx, self.sy = self.x0 + bezel, self.y0 + bezel
        s = 3
        body = Image.new("RGBA", (fw * s, fh * s), (0, 0, 0, 0))
        d = ImageDraw.Draw(body)
        d.rounded_rectangle(
            (0, 0, fw * s - 1, fh * s - 1),
            radius=52 * s,
            fill=(11, 15, 13, 255),
            outline=(70, 84, 75, 255),
            width=2 * s,
        )
        d.rounded_rectangle(
            (4 * s, 4 * s, (fw - 4) * s - 1, (fh - 4) * s - 1),
            radius=48 * s,
            outline=(28, 35, 31, 255),
            width=s,
        )
        self.body = body.resize((fw, fh), Image.LANCZOS)
        self.mask = rounded_mask((self.sw, self.sh), 40)
        self.shadow, pad = soft_shadow((fw, fh), 52)
        self.shadow_at = (self.x0 - pad, self.y0 - pad)
        self.ref = (self.sw, self.sh)
        self._cache = {}

    def screen(self, name):
        if name not in self._cache:
            img = shot(name)
            if self.inset:
                k = self.inset
                img = img.crop((k, k, img.width - k, img.height - k))
            self._cache[name] = img.resize(self.ref, Image.LANCZOS)
        return self._cache[name]

    def view(self, content, cam):
        return content

    def place(self, canvas, view):
        canvas.paste((0, 0, 0), self.shadow_at, self.shadow)
        canvas.paste(self.body, (self.x0, self.y0), self.body)
        canvas.paste(view, (self.sx, self.sy), self.mask)

    def point(self, fx, fy, cam=FULL):
        return self.sx + fx * self.sw, self.sy + fy * self.sh


class Window:
    """A desktop window (optionally with a title bar) or a plain card.

    Content is composed at `ref` size, then cropped by the camera and scaled
    into the viewport, so zooms stay sharp.
    """

    kind = "window"

    def __init__(
        self,
        ref,
        max_size=(1000, 770),
        center=MEDIA_CENTER,
        bar=None,
        title="",
        radius=12,
        fill=(236, 236, 232),
    ):
        self.ref = ref
        rw, rh = ref
        tb = 38 if bar else 0
        scale = min(max_size[0] / rw, (max_size[1] - tb) / rh)
        self.vw, self.vh = round(rw * scale), round(rh * scale)
        fw, fh = self.vw, self.vh + tb
        self.x0 = round(center[0] - fw / 2)
        self.y0 = round(center[1] - fh / 2)
        self.vx, self.vy = self.x0, self.y0 + tb
        s = 3
        frame = Image.new("RGBA", (fw * s, fh * s), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        bar_fill = (38, 40, 39) if bar == "dark" else fill
        d.rounded_rectangle(
            (0, 0, fw * s - 1, fh * s - 1), radius=radius * s, fill=bar_fill + (255,)
        )
        if bar:
            for i, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
                cx, cy = (22 + i * 20) * s, tb * s // 2
                d.ellipse((cx - 6 * s, cy - 6 * s, cx + 6 * s, cy + 6 * s), fill=color)
        self.frame = frame.resize((fw, fh), Image.LANCZOS)
        if bar and title:
            fd = ImageDraw.Draw(self.frame)
            color = (196, 199, 196) if bar == "dark" else (92, 96, 92)
            fd.text((fw / 2, tb / 2 + 1), title, font=font(15, 500), fill=color, anchor="mm")
        corners = (False, False, True, True) if bar else None
        self.mask = rounded_mask((self.vw, self.vh), radius, corners=corners)
        edge = Image.new("RGBA", (fw * s, fh * s), (0, 0, 0, 0))
        ImageDraw.Draw(edge).rounded_rectangle(
            (0, 0, fw * s - 1, fh * s - 1),
            radius=radius * s,
            outline=(255, 255, 255, 40) if bar == "dark" else (0, 0, 0, 50),
            width=2 * s,
        )
        self.edge = edge.resize((fw, fh), Image.LANCZOS)
        self.shadow, pad = soft_shadow((fw, fh), radius, strength=170)
        self.shadow_at = (self.x0 - pad, self.y0 - pad)
        self._cache = {}

    def screen(self, name, crop=None):
        if name not in self._cache:
            img = shot(name)
            if crop:
                img = img.crop(crop)
            self._cache[name] = img.resize(self.ref, Image.LANCZOS)
        return self._cache[name]

    def view(self, content, cam):
        rw, rh = self.ref
        box = (cam[0] * rw, cam[1] * rh, cam[2] * rw, cam[3] * rh)
        return content.resize((self.vw, self.vh), Image.LANCZOS, box=box)

    def place(self, canvas, view):
        canvas.paste((0, 0, 0), self.shadow_at, self.shadow)
        canvas.paste(self.frame, (self.x0, self.y0), self.frame)
        canvas.paste(view, (self.vx, self.vy), self.mask)
        canvas.paste(self.edge, (self.x0, self.y0), self.edge)

    def point(self, fx, fy, cam=FULL):
        return (
            self.vx + (fx - cam[0]) / (cam[2] - cam[0]) * self.vw,
            self.vy + (fy - cam[1]) / (cam[3] - cam[1]) * self.vh,
        )


def focus_rect(cx, cy, zoom):
    """Camera rectangle (fractions) centred on cx, cy at the given zoom."""
    half = 0.5 / zoom
    x0 = clamp(cx - half, 0, 1 - 2 * half)
    y0 = clamp(cy - half, 0, 1 - 2 * half)
    return (x0, y0, x0 + 2 * half, y0 + 2 * half)


def lerp_rect(a, b, e):
    return tuple(p + (q - p) * e for p, q in zip(a, b))


# ---------------------------------------------------------------- transitions


def transition(kind, a, b, e, opt=None):
    w, h = a.size
    if kind in ("fade", "tab", "xfade"):
        return Image.blend(a, b, e)
    if kind in ("push", "pop"):
        black = Image.new("RGB", (w, h))
        frame = Image.new("RGB", (w, h))
        if kind == "push":
            frame.paste(Image.blend(a, black, 0.35 * e), (-round(0.3 * w * e), 0))
            frame.paste(b, (round(w * (1 - e)), 0))
        else:
            frame.paste(Image.blend(b, black, 0.35 * (1 - e)), (-round(0.3 * w * (1 - e)), 0))
            frame.paste(a, (round(w * e), 0))
        return frame
    if kind == "sheet":
        top = round(opt * h)
        frame = Image.blend(a, b, e)
        dimmed = Image.blend(a, Image.new("RGB", (w, h)), 0.4 * e)
        frame.paste(dimmed.crop((0, top, w, h)), (0, top))
        y = round(top + (1 - e) * (h - top))
        frame.paste(b.crop((0, top, w, top + h - y)), (0, y))
        return frame
    if kind == "dialog":
        x0, y0, x1, y1 = (round(v * s) for v, s in zip(opt, (w, h, w, h)))
        scale = 0.92 + 0.08 * e
        target = b.copy()
        target.paste(b.getpixel((max(0, x0 - 8), (y0 + y1) // 2)), (x0, y0, x1, y1))
        box = b.crop((x0, y0, x1, y1))
        bw, bh = round((x1 - x0) * scale), round((y1 - y0) * scale)
        target.paste(
            box.resize((bw, bh), Image.LANCZOS),
            (x0 + ((x1 - x0) - bw) // 2, y0 + ((y1 - y0) - bh) // 2),
        )
        return Image.blend(a, target, e)
    if kind == "scroll":
        top, bottom = round(opt[0] * h), round(opt[1] * h)
        frame = Image.blend(a, b, e)
        off = round(e * (bottom - top))
        frame.paste(a.crop((0, top + off, w, bottom)), (0, top))
        if off:
            frame.paste(b.crop((0, top, w, top + off)), (0, bottom - off))
        return frame
    if kind == "stitch":
        # One continuous scroll between two captures of the same page. `d` is
        # how far the second capture is scrolled past the first.
        top, bottom = round(opt["band"][0] * h), round(opt["band"][1] * h)
        dist = round(opt["d"] * h)
        s = round(e * dist)
        frame = a.copy()
        frame.paste(a.crop((0, top + s, w, bottom)), (0, top))
        if s:
            frame.paste(b.crop((0, bottom - dist, w, bottom - dist + s)), (0, bottom - s))
        return frame
    return b


# ---------------------------------------------------------------- overlays


def touch_sprite(dt, dot=True):
    """Touch indicator around a tap at dt seconds from the press (or None).

    Without `dot`, only the ripple is drawn (used for mouse clicks)."""
    if dt < -0.5 or dt > 0.55:
        return None
    s, r = 3, 72
    img = Image.new("RGBA", (2 * r * s, 2 * r * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = r * s
    if dt <= 0.05:
        a = ease_out((dt + 0.5) / 0.25)
        press = clamp((dt + 0.14) / 0.12)
        rad = (25 - 5 * press) * (1.15 - 0.15 * a)
    else:
        a = 1 - clamp((dt - 0.05) / 0.22)
        rad = 20
    if a > 0 and dot:
        rr = rad * s
        d.ellipse((c - rr - 2 * s, c - rr - 2 * s, c + rr + 2 * s, c + rr + 2 * s), fill=(0, 0, 0, int(70 * a)))
        d.ellipse((c - rr, c - rr, c + rr, c + rr), fill=(255, 255, 255, int(110 * a)), outline=(255, 255, 255, int(235 * a)), width=3 * s)
    if dt > -0.03:
        q = clamp((dt + 0.03) / 0.5)
        rr = (22 + 42 * ease_out(q)) * s
        al = 1 - q
        d.ellipse((c - rr - 2 * s, c - rr - 2 * s, c + rr + 2 * s, c + rr + 2 * s), outline=(0, 0, 0, int(80 * al)), width=2 * s)
        d.ellipse((c - rr, c - rr, c + rr, c + rr), outline=(255, 255, 255, int(220 * al)), width=3 * s)
    return img.resize((2 * r, 2 * r), Image.LANCZOS)


def cursor_sprite():
    s, k = 4, 1.45
    pts = [(0, 0), (0, 17.5), (4.2, 13.6), (7, 20.2), (10, 18.9), (7.3, 12.5), (12.6, 12.5)]
    pad = 10
    size = (int((14 * k + 2 * pad) * s), int((22 * k + 2 * pad) * s))
    poly = [((x * k + pad) * s, (y * k + pad) * s) for x, y in pts]
    shadow = Image.new("L", size, 0)
    ImageDraw.Draw(shadow).polygon([(x + 2 * s, y + 3 * s) for x, y in poly], fill=110)
    shadow = shadow.filter(ImageFilter.GaussianBlur(3 * s))
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    img.paste((0, 0, 0, 255), (0, 0), shadow)
    d = ImageDraw.Draw(img)
    d.polygon(poly, fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=int(1.6 * s))
    img = img.resize((size[0] // s, size[1] // s), Image.LANCZOS)
    return img, pad


CURSOR, CURSOR_PAD = None, 0


def draw_notes(view, notes, cam, alpha):
    """Annotation boxes, dashed lines, and labels in viewport coordinates."""
    vw, vh = view.size
    over = Image.new("RGBA", view.size, (0, 0, 0, 0))
    dim = Image.new("L", view.size, 0)
    dim_any = False
    d = ImageDraw.Draw(over)
    dd = ImageDraw.Draw(dim)

    def px(fx, fy):
        return ((fx - cam[0]) / (cam[2] - cam[0]) * vw, (fy - cam[1]) / (cam[3] - cam[1]) * vh)

    for note, k in notes:
        k *= alpha
        if k <= 0:
            continue
        x0, y0 = px(note["rect"][0], note["rect"][1])
        x1, y1 = px(note["rect"][2], note["rect"][3])
        if x1 < 0 or y1 < 0 or x0 > vw or y0 > vh:
            continue
        color = note.get("color", (214, 64, 52))
        if note.get("dim"):
            dim_any = True
            dd.rectangle((0, 0, vw, vh), fill=int(120 * k))
        if note["kind"] == "box":
            if note.get("dim"):
                for other, _ in notes:
                    if other.get("kind") == "box":
                        ox0, oy0 = px(other["rect"][0], other["rect"][1])
                        ox1, oy1 = px(other["rect"][2], other["rect"][3])
                        dd.rounded_rectangle((ox0 - 6, oy0 - 6, ox1 + 6, oy1 + 6), radius=8, fill=0)
            d.rounded_rectangle((x0 - 6, y0 - 6, x1 + 6, y1 + 6), radius=8, outline=color + (int(255 * k),), width=4)
        elif note["kind"] == "line":
            x = x0
            while x < x1:
                d.line((x, y0, min(x + 14, x1), y0), fill=color + (int(255 * k),), width=4)
                x += 22
        if note.get("label"):
            f = font(20, 600)
            tw = f.getlength(note["label"])
            lx, ly = note.get("label_at", "below"), None
            if lx == "above":
                bx, by = x0, y0 - 52
            elif lx == "right":
                bx, by = x1 + 14, (y0 + y1) / 2 - 18
            else:
                bx, by = x0, y1 + 14
            bx = clamp(bx, 8, vw - tw - 36)
            by = clamp(by, 8, vh - 46)
            d.rounded_rectangle((bx, by, bx + tw + 28, by + 38), radius=19, fill=color + (int(240 * k),))
            d.text((bx + 14, by + 19), note["label"], font=f, fill=(255, 255, 255, int(255 * k)), anchor="lm")
    if dim_any:
        view.paste((0, 0, 0), (0, 0), dim)
    view.paste(over, (0, 0), over)
    return view


# ---------------------------------------------------------------- video


def in_frame(point, rect, margin=0.04):
    """Whether a point (fractions) sits comfortably inside a camera rectangle."""
    x, y = point
    return rect[0] + margin <= x <= rect[2] - margin and rect[1] + margin <= y <= rect[3] - margin


def lerp_key(a, b, e):
    return tuple(p + (q - p) * e for p, q in zip(a, b))


def hevc_codecs(path):
    """The RFC 6381 codecs string for an HEVC Main file, e.g. hvc1.1.6.L120.90.

    Chrome only offers to play HEVC when a <source> names the full string."""
    level = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=level", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return f"hvc1.1.6.L{level}.90"


def S(content, title, text, **kw):
    return dict(content=content, title=title, text=text, **kw)


class Video:
    def __init__(self, vid, name, kicker, note, tint, steps, poster_step=1, eyebrow=None):
        self.id, self.name, self.kicker, self.note = vid, name, kicker, note
        self.eyebrow = eyebrow or name.upper()
        self.steps = steps
        self.poster_step = poster_step
        self.bg = background(tint)
        self.static = self.static_panel()
        self.panels = [self.step_panel(i) for i in range(len(steps))]
        self.schedule()

    # -- text panel

    def static_panel(self):
        img = self.bg.copy()
        d = ImageDraw.Draw(img)
        tracked(d, (PANEL_X, 100), self.eyebrow, font(17, 600), ACCENT, 2.2)
        d.text((PANEL_X, 128), self.kicker, font=font(18, 400), fill=MUTED, anchor="ls")
        d.text((PANEL_X, H - 72), self.note, font=font(16, 400), fill=MUTED, anchor="ls")
        return img

    def step_panel(self, i):
        step = self.steps[i]
        n = len(self.steps)
        f_num, f_of = font(58, 600), font(24, 500)
        f_title, f_text = font(44, 700), font(24, 400)
        title = wrap(step["title"], f_title, PANEL_W)
        text = wrap(step["text"], f_text, PANEL_W - 6)
        block = 58 + 30 + len(title) * 52 + 16 + len(text) * 36
        img = Image.new("RGBA", (PANEL_W + 40, block + 40), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        y = 56
        num = f"{i + 1:02d}"
        d.text((0, y), num, font=f_num, fill=ACCENT, anchor="ls")
        d.text((f_num.getlength(num) + 12, y), f"/ {n:02d}", font=f_of, fill=MUTED, anchor="ls")
        y += 30
        for line in title:
            y += 52
            d.text((0, y - 10), line, font=f_title, fill=TEXT, anchor="ls")
        y += 16
        for line in text:
            y += 36
            d.text((0, y - 6), line, font=f_text, fill=MUTED, anchor="ls")
        top = (H - block) // 2 - 4
        return img, top

    # -- timeline

    def schedule(self):
        t = 0.0
        cam = FULL
        cursor = (0.86, 0.9)
        self.cam_keys = [(0.0, FULL)]
        self.cursor_keys = [(0.0, cursor)]
        self.taps = []  # (time, step index, fx, fy)
        self.clicks = []
        for i, step in enumerate(self.steps):
            dev = step["dev"]
            enter = step.get("enter", "fade") if i else "none"
            step["enter"] = enter
            step["t_enter"] = t
            t += TRANSITIONS[enter]
            step["t_shown"] = t
            if dev.kind == "phone":
                for dt, fx, fy in step.get("taps", []):
                    self.taps.append((t + dt, i, fx, fy))
                t += step.get("hold", 3.3)
                if step.get("tap"):
                    self.taps.append((t - 0.12, i, *step["tap"]))
            else:
                # Camera rules: move only to frame what the caption is about,
                # pan between details on the same screen, and pull back to the
                # whole window only when the screen changes (during the
                # transition) or a click lands outside the frame.
                if enter == "xfade" or (i and self.steps[i - 1]["dev"] is not dev):
                    cursor = step.get("cursor_from", (0.86, 0.9))
                    self.cursor_keys.append((t, cursor))
                    self.cam_keys += [(step["t_enter"], cam), (t, FULL)]
                    cam = FULL
                elif enter != "none" and cam != FULL:
                    self.cam_keys += [(step["t_enter"], cam), (step["t_enter"] + 0.8, FULL)]
                    cam = FULL
                    t = max(t, step["t_enter"] + 0.8)
                foci = step.get("focus", [])
                for f in foci:
                    rect = focus_rect(*f)
                    self.cam_keys += [(t, cam), (t + 1.1, rect)]
                    cam = rect
                    t += 1.1 + step.get("dwell", 2.3)
                if not foci:
                    t += step.get("dwell", 2.4)
                target = step.get("click") or step.get("hover")
                if target and not in_frame(target, cam):
                    self.cam_keys += [(t, cam), (t + 0.8, FULL)]
                    cam = FULL
                    t += 0.8
                if target:
                    self.cursor_keys.append((t, cursor))
                    t += 0.85
                    cursor = target
                    self.cursor_keys.append((t, cursor))
                    if step.get("click"):
                        t += 0.25
                        self.clicks.append((t, i, *cursor))
                        t += 0.12
                    else:
                        t += 0.9
            step["t_end"] = t
        self.duration = t + 0.6
        self.cam_keys.append((self.duration + 1, cam))

    def at(self, keys, t):
        if t <= keys[0][0]:
            return keys[0][1]
        for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
            if t0 <= t <= t1:
                if t1 == t0:
                    return v1
                e = ease((t - t0) / (t1 - t0))
                if len(v0) in (3, 4):
                    return lerp_key(v0, v1, e)
                return (v0[0] + (v1[0] - v0[0]) * e, v0[1] + (v1[1] - v0[1]) * e)
        return keys[-1][1]

    # -- rendering

    def content(self, step, t):
        c = step["content"]
        if callable(c):
            return c(t - step["t_shown"])
        return step["dev"].screen(c, step.get("crop")) if step["dev"].kind == "window" else step["dev"].screen(c)

    def media(self, canvas, i, t):
        step = self.steps[i]
        dev = step["dev"]
        cam = self.at(self.cam_keys, t) if dev.kind == "window" else FULL
        p = (t - step["t_enter"]) / max(1e-6, step["t_shown"] - step["t_enter"])
        if step["enter"] != "none" and p < 1 and i:
            prev = self.steps[i - 1]
            a = self.content(prev, prev["t_end"])
            b = self.content(step, step["t_shown"])
            if prev["dev"] is dev and step["enter"] != "xfade":
                frame = transition(step["enter"], a, b, ease(p), step.get("opt"))
                view = dev.view(frame, cam)
                self.note_layer(view, i, t, cam)
                dev.place(canvas, view)
                return dev, cam
            under = canvas.copy()
            pdev = prev["dev"]
            pcam = self.at(self.cam_keys, prev["t_end"]) if pdev.kind == "window" else FULL
            pdev.place(under, pdev.view(a, pcam))
            dev.place(canvas, dev.view(b, cam))
            canvas.paste(Image.blend(under, canvas, ease(p)))
            return None, cam
        view = dev.view(self.content(step, t), cam)
        self.note_layer(view, i, t, cam)
        dev.place(canvas, view)
        return dev, cam

    def note_layer(self, view, i, t, cam):
        step = self.steps[i]
        notes = []
        for note in step.get("notes", []):
            start = step["t_shown"] + note.get("at", 0.0)
            end = note.get("until")
            k = ease_out((t - start) / 0.35)
            if end is not None:
                k *= 1 - ease((t - (step["t_shown"] + end)) / 0.3)
            notes.append((note, k))
        if not notes:
            return
        out = 1 - ease((t - (step["t_end"] - 0.35)) / 0.35)
        draw_notes(view, notes, cam, out)

    def panel(self, canvas, i, t):
        step = self.steps[i]
        # The old caption leaves before the new one arrives, so they never overlap.
        out = ease((t - step["t_enter"]) / 0.28) if i else 1.0
        e = ease((t - step["t_enter"] - 0.2) / 0.4) if i else 1.0
        if i and out < 1:
            img, top = self.panels[i - 1]
            faded = fade_alpha(img, 1 - out)
            canvas.paste(faded, (PANEL_X, round(top - 16 * out)), faded)
        img, top = self.panels[i]
        if e > 0:
            faded = fade_alpha(img, e)
            canvas.paste(faded, (PANEL_X, round(top + 16 * (1 - e))), faded)
        # Progress segments.
        n = len(self.steps)
        gap = 6
        seg = (PANEL_W - gap * (n - 1)) / n
        y = H - 122
        d = ImageDraw.Draw(canvas)
        for k in range(n):
            x0 = PANEL_X + k * (seg + gap)
            d.rounded_rectangle((x0, y, x0 + seg, y + 4), radius=2, fill=LINE)
            if k < i:
                fill = 1.0
            elif k == i:
                span = step["t_end"] - step["t_enter"]
                fill = clamp((t - step["t_enter"]) / span) if span else 1.0
            else:
                fill = 0.0
            if fill > 0:
                d.rounded_rectangle((x0, y, x0 + max(4, seg * fill), y + 4), radius=2, fill=ACCENT)

    def frame(self, t):
        i = 0
        for k, step in enumerate(self.steps):
            if t >= step["t_enter"]:
                i = k
        canvas = self.static.copy()
        dev, cam = self.media(canvas, i, t)
        if dev is not None and dev.kind == "phone":
            for tp, k, fx, fy in self.taps:
                sprite = touch_sprite(t - tp)
                if sprite is not None and k in (i, i - 1):
                    x, y = self.steps[k]["dev"].point(fx, fy)
                    canvas.paste(sprite, (round(x - sprite.width / 2), round(y - sprite.height / 2)), sprite)
        if dev is not None and dev.kind == "window" and self.steps[i].get("cursor", True):
            fx, fy = self.at(self.cursor_keys, t)
            x, y = dev.point(fx, fy, cam)
            inside = dev.vx <= x <= dev.vx + dev.vw - 4 and dev.vy <= y <= dev.vy + dev.vh - 4
            for tc, k, cx, cy in self.clicks:
                sprite = touch_sprite(t - tc, dot=False)
                if sprite is not None:
                    canvas.paste(sprite, (round(x - sprite.width / 2), round(y - sprite.height / 2)), sprite)
            press = any(-0.12 < t - tc < 0.08 for tc, *_ in self.clicks)
            if not inside:
                press = None
            sprite = CURSOR if not press else CURSOR.resize((round(CURSOR.width * 0.9), round(CURSOR.height * 0.9)), Image.LANCZOS)
            pad = CURSOR_PAD * (0.9 if press else 1)
            if press is not None:
                canvas.paste(sprite, (round(x - pad), round(y - pad)), sprite)
        self.panel(canvas, i, t)
        k = min(ease(t / 0.45), ease((self.duration - t) / 0.5))
        if k < 1:
            canvas = Image.blend(self.bg, canvas, k)
        return canvas

    def render(self):
        OUT.mkdir(parents=True, exist_ok=True)
        path = OUT / f"{self.id}.mp4"
        # Two encodes in one pass: HEVC, which Safari needs (Safari 27 plays
        # H.264 without drawing a picture), and H.264 for browsers without HEVC.
        common = ["-vf", "scale=out_color_matrix=bt709:out_range=tv", "-pix_fmt", "yuv420p",
                  "-g", str(FPS * 3), "-movflags", "+faststart", "-an"]
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
            *common, "-c:v", "libx264", "-preset", "slow", "-crf", "21", str(path),
            *common, "-c:v", "hevc_videotoolbox", "-q:v", "65", "-tag:v", "hvc1",
            str(OUT / f"{self.id}.hevc.mp4"),
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        frames = int(self.duration * FPS)
        for n in range(frames):
            proc.stdin.write(self.frame(n / FPS).tobytes())
        proc.stdin.close()
        if proc.wait():
            raise SystemExit(f"ffmpeg failed for {self.id}")
        poster = self.steps[self.poster_step]
        self.frame(poster["t_shown"] + getattr(self, "poster_offset", 0.6)).save(OUT / f"{self.id}.jpg", quality=84, optimize=True)
        return path

    def js(self):
        """The `video` entry for this project in app.js."""
        q = lambda text: '"' + text.replace('"', '\\"') + '"'
        out = [
            "    video: {",
            f'      src: "assets/videos/{self.id}.mp4",',
            f'      hevc: "assets/videos/{self.id}.hevc.mp4",',
            f'      hevcCodecs: "{hevc_codecs(OUT / f"{self.id}.hevc.mp4")}",',
            f'      poster: "assets/videos/{self.id}.jpg",',
            f"      duration: {int(self.duration * FPS) / FPS:.1f},",
            "      chapters: [",
        ]
        for step in self.steps:
            out.append("        {")
            out.append(f"          time: {round(step['t_shown'], 1):g},")
            out.append(f"          title: {q(step['title'])},")
            line = f"          caption: {q(step['text'])},"
            out += [line] if len(line) <= 80 else ["          caption:", f"            {q(step['text'])},"]
            screen = step.get("screen") or step["content"]
            if isinstance(screen, str):
                out.append(f'          screen: "assets/projects/{screen}",')
            out.append("        },")
        out += ["      ],", "    },"]
        return "\n".join(out)


class Recording(Video):
    """A real screen recording, framed like the other videos.

    `folder` holds the browser's frames (frames/, frames.json) and events.json:
    the pointer moves, clicks, camera zooms and captions logged while the app
    was driven (see tools/recordings/*/record.spec.ts). A headless browser
    draws no pointer, so the pointer and click ripples are drawn here.
    """

    def __init__(self, vid, name, kicker, note, tint, folder, window, poster_chapter=0, max_zoom=1.6, eyebrow=None, screens=(), camera=None):
        """`camera`, if given, replaces the zooms logged during recording:
        (chapter index, seconds into the chapter, viewport rect or None, seconds to move)."""
        folder = Path(folder)
        self.camera = camera
        events = json.loads((folder / "events.json").read_text())
        frames = json.loads((folder / "frames.json").read_text())
        t0 = next(e["t"] for e in events if e["type"] == "start")
        self.folder = folder
        self.events = [dict(e, t=e["t"] - t0) for e in events]
        self.frame_times = [f["t"] - t0 for f in frames]
        self.frame_files = [f["file"] for f in frames]
        self.end = next(e["t"] for e in self.events if e["type"] == "end")
        self.window = window
        self.size = Image.open(folder / "frames" / self.frame_files[0]).size
        self.max_zoom = max_zoom
        self._image = (None, None)
        chapters = [e for e in self.events if e["type"] == "chapter"]
        steps = [S(screen, c["title"], c["text"], dev=window, at=c["t"]) for c, screen in zip(chapters, list(screens) + [None] * len(chapters))]
        super().__init__(vid, name, kicker, note, tint, steps, poster_step=poster_chapter, eyebrow=eyebrow)
        self.poster_offset = 2.5

    def fit(self, rect):
        if rect is None:
            return FULL
        x0, y0, x1, y1 = rect
        zoom = min(1 / (x1 - x0), 1 / (y1 - y0), self.max_zoom)
        return focus_rect((x0 + x1) / 2, (y0 + y1) / 2, zoom)

    def schedule(self):
        for i, step in enumerate(self.steps):
            step["enter"] = "none"
            step["t_enter"] = step["at"]
            step["t_shown"] = step["at"] + (0.4 if i else 0)
            step["t_end"] = self.steps[i + 1]["at"] if i + 1 < len(self.steps) else self.end
        self.duration = self.end + 0.8
        cam = FULL
        self.cam_keys = [(0.0, FULL)]
        if self.camera is not None:
            zooms = [dict(t=self.steps[c]["at"] + off, rect=rect, ms=ms) for c, off, rect, ms in self.camera]
        else:
            zooms = [e for e in self.events if e["type"] == "zoom"]
        for e in zooms:
            rect = self.fit(e["rect"])
            self.cam_keys += [(e["t"], cam), (e["t"] + e["ms"], rect)]
            cam = rect
        self.cam_keys.append((self.duration + 1, cam))
        self.moves = [e for e in self.events if e["type"] == "move"]
        self.rec_clicks = [e for e in self.events if e["type"] == "click"]

    def screen_image(self, t):
        index = 0
        for k, ft in enumerate(self.frame_times):
            if ft <= t:
                index = k
        if self._image[0] != index:
            img = Image.open(self.folder / "frames" / self.frame_files[index]).convert("RGB")
            self._image = (index, img.resize(self.window.ref, Image.LANCZOS) if img.size != self.window.ref else img)
        return self._image[1]

    def pointer(self, t):
        rw, rh = self.window.ref
        pos = self.moves[0]["from"] if self.moves else {"x": rw * 0.86, "y": rh * 0.9}
        for m in self.moves:
            if m["t"] > t:
                break
            e = ease((t - m["t"]) / m["ms"]) if m["ms"] else 1.0
            a, b = m["from"], m["to"]
            pos = {"x": a["x"] + (b["x"] - a["x"]) * e, "y": a["y"] + (b["y"] - a["y"]) * e}
        return pos["x"] / rw, pos["y"] / rh

    def frame(self, t):
        i = 0
        for k, step in enumerate(self.steps):
            if t >= step["t_enter"]:
                i = k
        canvas = self.static.copy()
        dev = self.window
        cam = self.at(self.cam_keys, t)
        dev.place(canvas, dev.view(self.screen_image(t), cam))
        fx, fy = self.pointer(t)
        x, y = dev.point(fx, fy, cam)
        if dev.vx <= x <= dev.vx + dev.vw - 4 and dev.vy <= y <= dev.vy + dev.vh - 4:
            for c in self.rec_clicks:
                sprite = touch_sprite(t - c["t"] - 0.05, dot=False)
                if sprite is not None:
                    canvas.paste(sprite, (round(x - sprite.width / 2), round(y - sprite.height / 2)), sprite)
            press = any(-0.08 < t - c["t"] < 0.14 for c in self.rec_clicks)
            sprite = CURSOR if not press else CURSOR.resize((round(CURSOR.width * 0.9), round(CURSOR.height * 0.9)), Image.LANCZOS)
            pad = CURSOR_PAD * (0.9 if press else 1)
            canvas.paste(sprite, (round(x - pad), round(y - pad)), sprite)
        self.panel(canvas, i, t)
        k = min(ease(t / 0.45), ease((self.duration - t) / 0.5))
        if k < 1:
            canvas = Image.blend(self.bg, canvas, k)
        return canvas


class PhoneRecording(Recording):
    """A real recording of a phone app, shown in the phone body with touches."""

    def schedule(self):
        super().schedule()
        self.taps_rec = [e for e in self.events if e["type"] == "tap"]
        self.swipes = [e for e in self.events if e["type"] == "swipe"]


    def frame(self, t):
        i = 0
        for k, step in enumerate(self.steps):
            if t >= step["t_enter"]:
                i = k
        canvas = self.static.copy()
        phone = self.window
        phone.place(canvas, self.screen_image(t))
        sw, sh = self.size
        for e in self.taps_rec:
            sprite = touch_sprite(t - e["t"])
            if sprite is not None:
                x, y = phone.point(e["x"] / sw, e["y"] / sh)
                canvas.paste(sprite, (round(x - sprite.width / 2), round(y - sprite.height / 2)), sprite)
        for e in self.swipes:
            k = (t - e["t"]) / e["ms"]
            if -0.25 < k < 1.25:
                p = ease(k)
                a, b = e["from"], e["to"]
                x, y = phone.point((a["x"] + (b["x"] - a["x"]) * p) / sw, (a["y"] + (b["y"] - a["y"]) * p) / sh)
                sprite = fade_alpha(touch_sprite(-0.2), clamp(min(k + 0.25, 1.25 - k) * 4))
                canvas.paste(sprite, (round(x - sprite.width / 2), round(y - sprite.height / 2)), sprite)
        self.panel(canvas, i, t)
        k = min(ease(t / 0.45), ease((self.duration - t) / 0.5))
        if k < 1:
            canvas = Image.blend(self.bg, canvas, k)
        return canvas


# ---------------------------------------------------------------- projects


def hydro():
    # The captures carry a thin emulator border; trim it.
    phone = Phone(2390 / 1070, inset=5)
    steps = [
        S("hydro-splash.png", "Open the app", "The splash screen restores a saved session before the first screen.", hold=2.3),
        S("hydro-sign_up.png", "Create an account", "New users register with a name, email, and confirmed password.", tap=(0.73, 0.838)),
        S("hydro-sign_in.png", "Sign in", "Returning users sign in with their email and password.", enter="push", tap=(0.5, 0.641)),
        S("hydro-home_empty.png", "Start the day", "The dashboard compares today's intake with a personalised daily goal.", hold=3.0),
        S("hydro-log_sheet.png", "Log a drink", "Pick a drink type and an amount, then add it to the day.", enter="sheet", opt=0.505, tap=(0.5, 0.949)),
        S("hydro-achievement.png", "Unlock an achievement", "The first logged drink earns the First Sip badge.", enter="dialog", opt=(0.13, 0.3, 0.87, 0.7), tap=(0.5, 0.645), hold=2.8),
        S("hydro-dash.png", "Watch the ring fill", "Drinks count by how hydrating they are: 750 ml of water, juice, and coffee adds 613 ml.", hold=3.6),
        S("hydro-home_mix.png", "See today's mix", "Scrolling down shows each drink's share of the day.", enter="stitch", opt=dict(band=(127 / 2390, 2077 / 2390), d=1260 / 2390), tap=(0.5, 0.933)),
        S("hydro-stats_today.png", "Today by hour", "Statistics show when each drink was logged through the day.", enter="tab", tap=(0.5, 0.25)),
        S("hydro-stats_week.png", "Weekly statistics", "Compare the last seven days with the daily goal.", enter="tab", tap=(0.79, 0.25), hold=2.8),
        S("hydro-stats_month.png", "Monthly statistics", "Switch to 30 days to review a longer range.", enter="tab", tap=(0.81, 0.933), hold=2.8),
        S("hydro-settings.png", "Profile and goals", "Adjust the daily goal, body weight, and activity level.", enter="tab", hold=3.0),
        S("hydro-settings_reminders.png", "Reminders and theme", "Set reminder hours, quiet hours, and an environment theme.", enter="scroll", opt=(105 / 2390, 2101 / 2390), tap=(0.5, 0.778)),
        S("hydro-history.png", "Browse the history", "Each day lists its drinks, ready to edit or delete.", enter="push", tap=(0.74, 0.637)),
        S("hydro-edit_entry.png", "Edit an entry", "Correct a saved drink's amount, type, or time.", enter="sheet", opt=0.558, tap=(0.5, 0.949), hold=3.0),
    ]
    for s in steps:
        s["dev"] = phone
    return Video("hydro-tracker", "Hydro-Tracker", "App walkthrough", "Captured app screens  ·  demo account", (28, 70, 66), steps, poster_step=6)


def bulk():
    # A real recording of the app's sample-data web build (tools/recordings/bulk).
    phone = Phone(844 / 390)
    screens = [f"bulk-live-{n:02d}.jpg" for n in range(1, 8)]
    return PhoneRecording(
        "bulk-buying", "Bulk Buying Companion", "Screen recording",
        "The real app on its built-in sample data  ·  no live backend",
        (24, 58, 54), ROOT / "tools" / "recordings" / "bulk", phone,
        poster_chapter=2, screens=screens,
    )


def openear():
    phone = Phone(932 / 430)
    steps = [
        S("openear-login.png", "Sign in", "The welcome screen keeps controls large and works with screen readers.", tap=(0.5, 0.67)),
        S("openear-home.png", "Choose an activity", "Large buttons lead to notes, quizzes, progress, and uploads.", tap=(0.45, 0.231)),
        S("openear-notes.png", "Listen to notes", "Pick a saved note and play it aloud with text-to-speech.", enter="push", taps=[(1.3, 0.87, 0.108)], tap=(0.063, 0.029), hold=3.4),
        S("openear-home.png", "Start a quiz", "Quizzes are built from the same saved notes.", enter="pop", tap=(0.45, 0.306), hold=2.2),
        S("openear-quiz-select.png", "Select quiz material", "The app checks which notes have enough content to quiz on.", enter="push", tap=(0.5, 0.126)),
        S("openear-quiz.png", "Answer a question", "Tap an answer, or say it with the voice-input button.", enter="push", taps=[(1.6, 0.5, 0.368)], hold=3.8),
    ]
    for s in steps:
        s["dev"] = phone
    return Video("openear", "OpenEar", "App walkthrough", "Captured app screens  ·  synthetic demo notes", (36, 58, 46), steps, poster_step=1)


def maistra():
    # A real screen recording of the web app (tools/recordings/maistra).
    window = Window((1440, 1000), bar="light", title="mAIstra  ·  Teacher workspace")
    screens = [
        "maistra-real-question-bank.png", "maistra-real-submissions.png", "maistra-real-details.png",
        "maistra-real-review-ocr.png", "maistra-real-program1-corrected.png", "maistra-real-program2-picker.png",
        "maistra-real-program2-saved.png", "maistra-real-grading.png",
    ]
    return Recording(
        "maistra", "mAIstra", "Screen recording",
        "My real test page and its OCR output  ·  graded live on our Judge0 server",
        (40, 46, 70), ROOT / "tools" / "recordings" / "maistra", window,
        poster_chapter=3, eyebrow="mAIstra", screens=screens,
        # Wide for navigation; frames only where text has to be read.
        camera=[
            (2, 0.8, [0.42, 0.33, 0.93, 0.66], 1.1),   # the question this paper is linked to
            (2, 3.0, None, 0.8),                       # back out as the cursor heads to Save
            (3, 0.8, [0.09, 0.27, 0.79, 0.76], 1.2),   # paper beside the OCR text
            (4, 0.0, [0.4, 0.38, 0.84, 0.69], 1.0),    # in on the code being corrected
            (5, 0.0, [0.38, 0.22, 0.9, 0.58], 0.9),    # program tabs and question picker
            (6, 3.9, None, 0.7),                       # back out for Continue to grading
            (7, 4.8, [0.1, 0.27, 0.7, 0.73], 1.0),     # Accepted, and what it printed
            (7, 7.8, None, 0.7),                       # back out for Submit Code
            (8, 5.9, [0.37, 0.53, 0.9, 0.85], 1.0),    # outputs, expected values, score
            (8, 9.3, None, 0.7),                       # back out for the Program 2 tab
            (9, 7.9, [0.37, 0.53, 0.9, 0.85], 1.0),    # the cube program's results
            (9, 11.3, None, 0.7),
            (10, 1.6, [0.1, 0.25, 0.4, 0.34], 1.0),    # both programs: 2/2 passed
        ],
    )


def meshunwarp():
    # Window captures of the real app processing my test papers.
    win = Window((1372, 870), radius=12)
    # Wide for the before/after shots; in only on the gate score and the text.
    steps = [
        S("meshunwarp-run-startup.jpg", "Open the desktop app", "My test papers are listed by problem type: crumpled, low ink, warped, wet, and more.", click=(0.06, 0.384), dwell=2.8),
        S("meshunwarp-run-selected.jpg", "Choose a paper", "A curved journal page loads into the input pane, with Clean Scan as the output mode.", click=(0.926, 0.956), dwell=2.4),
        S("meshunwarp-run-running.jpg", "Run the pipeline", "Preprocessing comes first, then a quality gate that scores the photo before the heavy work.", focus=[(0.42, 0.8, 1.6)], dwell=2.8,
          notes=[dict(kind="box", rect=(0.165, 0.935, 0.6, 0.977), at=1.5, color=(52, 168, 110))]),
        S("meshunwarp-run-clean-scan.jpg", "Get a clean scan", "DocTr's GeoTr flattens the page, and cleanup turns it into crisp black and white.", click=(0.077, 0.955), dwell=3.4),
        S("meshunwarp-run-ink-recovery.jpg", "Recover faint ink", "Ink Recovery keeps lighter strokes, for pages with faded or thin writing.", click=(0.047, 0.267), dwell=3.0),
        S("meshunwarp-run-flyer-running.jpg", "Try a harder page", "A creased, glossy flyer scores MEDIUM (67%) at the gate and moves on to dewarping.", focus=[(0.42, 0.8, 1.6)], dwell=2.8,
          notes=[dict(kind="box", rect=(0.225, 0.893, 0.455, 0.921), at=1.5, color=(52, 168, 110), label="Quality gate: MEDIUM 67%", label_at="above")]),
        S("meshunwarp-run-flyer-clean.jpg", "Clean the flyer", "The output is a high-contrast scan, ready for text recognition.", click=(0.953, 0.059), dwell=3.0),
        S("meshunwarp-run-flyer-text.jpg", "Read the text", "Apple Vision reads the cleaned page back as editable text, ready to save.", focus=[(0.7, 0.42, 1.45)], dwell=3.4),
    ]
    for s in steps:
        s["dev"] = win
    return Video("meshunwarp", "MeshUnwarp", "Desktop app, real run", "My test papers, run through the real pipeline", (34, 44, 58), steps, poster_step=6)


def fitsync():
    canvas = Window((1100, 785), bar="dark", title="FitSync  ·  Figma prototype map")
    phone = Phone(733 / 340, height=740)
    steps = [
        S("fitsync-connections.png", "Map the prototype", "Figma links connect the meal plan to its breakfast, lunch, and dinner screens.", dev=canvas, focus=[(0.55, 0.33, 1.6)], dwell=2.8, cursor=False),
        S("fitsync-meal-plan.png", "Plan meals", "Meal cards sit beside a water reminder and protein tracking.", dev=phone, enter="xfade", tap=(0.24, 0.47), hold=3.4),
        S("fitsync-breakfast.png", "Open a meal", "Each meal expands into ingredients, prep time, servings, and calories.", dev=phone, enter="push", hold=3.6),
        S("fitsync-cardio.png", "Track workouts", "The cardio screen pairs a progress ring with a performance chart.", dev=phone, enter="fade", hold=3.4),
    ]
    return Video("fitsync", "FitSync", "Figma prototype walkthrough", "Figma design screens  ·  not a shipped app", (58, 52, 38), steps, poster_step=1)


# Student Grade Prediction: charts from the notebook on a paper card.

ML_REF = (2000, 1250)
CHART_PLACEMENT = {}


def chart_card(name):
    img = shot(name)
    rw, rh = ML_REF
    scale = min((rw - 160) / img.width, (rh - 160) / img.height)
    w, h = round(img.width * scale), round(img.height * scale)
    card = Image.new("RGB", ML_REF, PAPER)
    x0, y0 = (rw - w) // 2, (rh - h) // 2
    card.paste(img.resize((w, h), Image.LANCZOS), (x0, y0))
    CHART_PLACEMENT[name] = (x0, y0, scale)
    return card


def chart_rect(name, x0, y0, x1, y1):
    """Fractions of the card for a rectangle given in the chart's own pixels."""
    ox, oy, s = CHART_PLACEMENT[name]
    rw, rh = ML_REF
    return ((ox + x0 * s) / rw, (oy + y0 * s) / rh, (ox + x1 * s) / rw, (oy + y1 * s) / rh)


COLUMNS = [
    ["gender", "race/ethnicity", "parental level of education", "lunch"],
    ["test preparation course", "math score", "reading score", "writing score"],
]
SCORES = {"math score", "reading score", "writing score"}


def dataset_card(strike, target):
    img = Image.new("RGB", ML_REF, PAPER)
    d = ImageDraw.Draw(img)
    rw, rh = ML_REF
    tracked(d, (120, 190), "STUDENTS PERFORMANCE DATASET", font(34, 600), (84, 100, 87), 3)
    d.text((112, 430), "1,000", font=font(220, 700), fill=INK, anchor="ls")
    d.text((120 + font(220, 700).getlength("1,000"), 430), "student records", font=font(60, 500), fill=(84, 100, 87), anchor="ls")
    d.text((120, 560), "8 columns", font=font(38, 600), fill=(84, 100, 87), anchor="ls")
    f = font(40, 500)
    y = 610
    for row in COLUMNS:
        x = 120
        for col in row:
            w = f.getlength(col) + 72
            score = col in SCORES
            fill, ink, edge = (238, 238, 229), INK, (183, 192, 176)
            if score and strike > 0:
                k = clamp(strike * 1.2)
                fill = tuple(round(a + (b - a) * k) for a, b in zip(fill, (247, 228, 224)))
                ink = tuple(round(a + (b - a) * k) for a, b in zip(ink, (160, 120, 112)))
                edge = tuple(round(a + (b - a) * k) for a, b in zip(edge, (222, 170, 160)))
            d.rounded_rectangle((x, y, x + w, y + 96), radius=48, fill=fill, outline=edge, width=3)
            d.text((x + 36, y + 49), col, font=f, fill=ink, anchor="lm")
            if score and strike > 0:
                d.line((x + 24, y + 49, x + 24 + (w - 48) * clamp(strike), y + 49), fill=(200, 64, 52), width=6)
            x += w + 26
        y += 126
    if target > 0:
        k = clamp(target)
        col = tuple(round(PAPER[j] + ((54, 95, 69)[j] - PAPER[j]) * k) for j in range(3))
        label = "Target  ·  pass = math score of 50 or more"
        w = font(40, 600).getlength(label) + 80
        d.rounded_rectangle((120, 930, 120 + w, 1030), radius=50, fill=col)
        d.text((160, 981), label, font=font(40, 600), fill=tuple(round(PAPER[j] + (255 - PAPER[j]) * k) for j in range(3)), anchor="lm")
    return img


def takeaway_card(t):
    img = Image.new("RGB", ML_REF, PAPER)
    d = ImageDraw.Draw(img)
    tiles = [
        ("87.5%", "accuracy for the neural network, the best of the three"),
        ("86.5%", "accuracy from always predicting Pass"),
        ("3 of 27", "failing students the best models found"),
    ]
    tw, th, gap = 540, 560, 50
    x = (ML_REF[0] - 3 * tw - 2 * gap) // 2
    for k, (big, small) in enumerate(tiles):
        e = ease_out((t - 0.3 - k * 0.45) / 0.6)
        if e <= 0:
            x += tw + gap
            continue
        y = 330 + round(40 * (1 - e))
        mix = lambda c: tuple(round(PAPER[j] + (c[j] - PAPER[j]) * e) for j in range(3))
        d.rounded_rectangle((x, y, x + tw, y + th), radius=28, fill=mix((238, 238, 229)), outline=mix((183, 192, 176)), width=3)
        color = (200, 64, 52) if k == 2 else INK
        d.text((x + 50, y + 200), big, font=font(130, 700), fill=mix(color), anchor="ls")
        ly = y + 290
        for line in wrap(small, font(42, 500), tw - 100):
            d.text((x + 50, ly), line, font=font(42, 500), fill=mix((84, 100, 87)), anchor="ls")
            ly += 58
        x += tw + gap
    return img


def ml():
    card = Window(ML_REF, max_size=(1000, 720), radius=18, fill=PAPER)
    comparison = chart_card("student-grade-model-comparison.png")
    confusion = chart_card("student-grade-confusion-matrices.png")
    heatmap = chart_card("student-grade-feature-ranking.png")
    cmp_name, cm_name, hm_name = (
        "student-grade-model-comparison.png",
        "student-grade-confusion-matrices.png",
        "student-grade-feature-ranking.png",
    )
    # Accuracy subplot: y axis runs from 60 (row 425) to 110 (row 70).
    def acc_y(v):
        return 425 - (v - 60) * 7.1

    acc = chart_rect(cmp_name, 66, 70, 331, 425)
    base = chart_rect(cmp_name, 70, acc_y(86.5), 327, acc_y(86.5))
    nn_bar = chart_rect(cmp_name, 160, acc_y(87.5) - 4, 236, 425)
    green = (54, 95, 69)
    fail_cells = [chart_rect(cm_name, x0, 69, x0 + 145, 173) for x0 in (53, 482, 910)]
    pass_row = chart_rect(hm_name, 208, 241, 664, 282)
    lunch_cell = chart_rect(hm_name, 436, 241, 512, 282)
    steps = [
        S(lambda t: dataset_card(0, 0), "Ask the question", "Can background information alone predict whether a student passes math?", dwell=3.4),
        S(lambda t: dataset_card(ease((t - 0.5) / 1.1), ease((t - 1.7) / 0.6)), "Remove the leaks", "Pass means a math score of 50 or more, so all three score columns were dropped.", enter="fade", dwell=4.2),
        S(lambda t: heatmap, "Check the features", "The five remaining features relate only weakly to passing; lunch is strongest, at 0.29.", screen=hm_name, dwell=3.8,
          notes=[dict(kind="box", rect=pass_row, at=0.8, dim=True, color=green, label="correlation with pass", label_at="below"),
                 dict(kind="box", rect=lunch_cell, at=1.9, color=(200, 64, 52), label="lunch  ·  0.29", label_at="above")]),
        S(lambda t: comparison, "Compare three models", "Naive Bayes, a neural network, and Random Forest, tested on a 20% hold-out split.", screen=cmp_name, focus=[(0.26, 0.5, 1.8)], dwell=4.0,
          notes=[dict(kind="line", rect=base, at=1.2, color=(200, 64, 52), label="baseline, always Pass: 86.5%", label_at="above"),
                 dict(kind="box", rect=nn_bar, at=2.3, color=green, label="neural network: 87.5%", label_at="below")]),
        S(lambda t: confusion, "Look past accuracy", "Every model predicts Pass for almost everyone: at most 3 of 27 failing students are found.", screen=cm_name, dwell=4.0,
          notes=[dict(kind="box", rect=r, at=1.0 + 0.35 * k, dim=k == 0, color=(200, 64, 52), label=lbl, label_at="below")
                 for k, (r, lbl) in enumerate(zip(fail_cells, ["2 of 27", "3 of 27", "3 of 27"]))]),
        S(takeaway_card, "Document the limits", "High accuracy hid a weak model, so the report states what the results cannot show.", dwell=4.4),
    ]
    for s in steps:
        s["dev"] = card
        s["cursor"] = False
    return Video("student-grade", "Student Grade Prediction", "Study walkthrough", "Charts from the evaluated notebook  ·  June–July 2026", (40, 52, 44), steps, poster_step=3)


PROJECTS = {
    "hydro": hydro,
    "bulk": bulk,
    "maistra": maistra,
    "openear": openear,
    "mesh": meshunwarp,
    "ml": ml,
    "fitsync": fitsync,
}


def main(names):
    global CURSOR, CURSOR_PAD
    CURSOR, CURSOR_PAD = cursor_sprite()
    for name in names or PROJECTS:
        video = PROJECTS[name]()
        debug = [a for a in sys.argv if a.startswith("--frames=")]
        if debug:
            # Preview stills: --frames=DIR [--at=1.5,7.2] (default: each step).
            folder = Path(debug[0].split("=", 1)[1])
            folder.mkdir(parents=True, exist_ok=True)
            times = [a.split("=", 1)[1] for a in sys.argv if a.startswith("--at=")]
            times = [float(x) for x in times[0].split(",")] if times else [s["t_shown"] + 0.6 for s in video.steps]
            for t in times:
                video.frame(t).save(folder / f"{video.id}-{t:05.1f}.png")
            print(video.id, f"{video.duration:.1f}s", [(round(s["t_enter"], 2), round(s["t_shown"], 2), round(s["t_end"], 2)) for s in video.steps])
            continue
        if "--js" not in sys.argv:
            path = video.render()
            print(f"\n{path.relative_to(ROOT)}  ({video.duration:.1f}s)")
        print(f"\n// {name}\n{video.js()}")


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if not a.startswith("--")])
