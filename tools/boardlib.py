import os, sys


INK = "#221C15"; MUTED = "#665D50"; LINE = "#D6CDBC"; BG = "#F5F1E8"; CARD = "#FFFFFF"; ARROW = "#8A7F6E"
K = {
    "plain":  ("#FFFFFF", f"1px solid {LINE}", MUTED),
    "gold":   ("#FBF1DC", "1.5px solid #C9952F", "#7A4F0A"),
    "goldf":  ("#F3E1B5", "2px solid #B07E1E", "#6E460A"),
    "moss":   ("#E6EEDC", "1.5px solid #6F9150", "#3A6229"),
    "seal":   ("#F6E0DA", "1.5px solid #B4523E", "#8E2B1E"),
    "blue":   ("#E2EBF5", "1.5px solid #5C88BE", "#2C5A8F"),
    "purple": ("#EEE6F8", "1.5px solid #9A78D0", "#5E3C9C"),
    "lock":   ("#F5F1E8", "1.5px dashed #A89F90", MUTED),
    "fog":    ("#E9E3D7", "2px dashed #A89F90", MUTED),
}

class Board:
    def __init__(self, title, w, h):
        self.title, self.w, self.ht = title, w, h
        self.bands, self.arrows, self.cards, self.labels = [], [], [], []
        self.mid = 0

    # ---------- elements
    def band(self, l, t, w, h, fill, border):
        self.bands.append(f'<div style="position: absolute; left: {l}px; top: {t}px; width: {w}px; height: {h}px; box-sizing: border-box; background: {fill}; border: {border}; border-radius: 14px"></div>')

    def card(self, l, t, w, h, tag, title, body="", kind="plain", size=14, center=False):
        bg, border, tagc = K[kind]
        parts = []
        if tag:
            parts.append(f'<span style="font-family: \'JetBrains Mono\', monospace; font-size: 11px; line-height: 16px; letter-spacing: 0.1em; color: {tagc}; font-weight: 700">{tag}</span><br>')
        if title:
            parts.append(f'<b style="font-family: \'Philosopher\', serif; font-size: 18px; line-height: 26px; color: {INK}">{title}</b>')
        if body:
            parts.append(f'<br><span style="color: {MUTED}">{body}</span>' if title else f'<span style="color: {MUTED}">{body}</span>')
        align = "align-items: center; justify-content: center; text-align: center" if center else "align-items: flex-start; justify-content: flex-start; text-align: left"
        self.cards.append(f'<div style="position: absolute; left: {l}px; top: {t}px; width: {w}px; height: {h}px; box-sizing: border-box; padding: 14px 16px; display: flex; {align}; background: {bg}; border: {border}; border-radius: 10px; font-size: {size}px; line-height: 20px; color: {INK}"><span>{"".join(parts)}</span></div>')

    def diamond(self, l, t, w, h, text, fill="#EBD9AE"):
        self.cards.append(f'<div style="position: absolute; left: {l}px; top: {t}px; width: {w}px; height: {h}px; box-sizing: border-box; padding: 0 70px; display: flex; align-items: center; justify-content: center; text-align: center; background: {fill}; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); font-size: 14px; line-height: 19px; font-weight: 600; color: {INK}">{text}</div>')

    def label(self, l, t, w, text, color=MUTED, size=13, align="center", weight=400, lh=16):
        self.labels.append(f'<div style="position: absolute; left: {l}px; top: {t}px; width: {w}px; text-align: {align}; font-size: {size}px; line-height: {lh}px; font-weight: {weight}; color: {color}">{text}</div>')

    def raw(self, html):
        self.labels.append(html)

    def _svg(self, l, t, w, h, d, head, color, dashed, sw=2):
        dash = "; stroke-dasharray: 6 6" if dashed else ""
        defs = mk = ""
        if head:
            self.mid += 1
            mid = f"dc-arrow-head-filled-{self.mid}"
            defs = f'<defs><marker id="{mid}" orient="auto" markerWidth="5" markerHeight="5" refX="2" refY="2" overflow="visible"><path d="M0 0 L4 2 L0 4 Z" fill="{color}" stroke="none" style="stroke: none; fill: {color}; fill: context-stroke"/></marker></defs>'
            mk = f' marker-end="url(#{mid})"'
        self.arrows.append(f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" preserveAspectRatio="none" style="position: absolute; left: {l}px; top: {t}px; width: {w}px; height: {h}px; overflow: visible; fill: none; stroke: {color}; stroke-width: {sw}; stroke-linecap: round; stroke-linejoin: round{dash}">{defs}<path d="{d}"{mk}></path></svg>')

    def h(self, x1, x2, y, head=True, color=ARROW, dashed=False):
        """horizontal from tail x1 to tip x2"""
        l = min(x1, x2); n = abs(x2 - x1); hh = 4 if head else 0
        d = f"M 0 4 L {n-hh} 4" if x2 > x1 else f"M {n} 4 L {hh} 4"
        self._svg(l, y - 4, n, 8, d, head, color, dashed)

    def v(self, x, y1, y2, head=True, color=ARROW, dashed=False):
        t = min(y1, y2); n = abs(y2 - y1); hh = 4 if head else 0
        d = f"M 4 0 L 4 {n-hh}" if y2 > y1 else f"M 4 {n} L 4 {hh}"
        self._svg(x - 4, t, 8, n, d, head, color, dashed)

    def heading(self, title, sub):
        self.raw(f'<div style="position: absolute; left: 64px; top: 56px; font-family: \'Philosopher\', serif; font-weight: 700; font-size: 40px; line-height: 48px; color: {INK}">{title}</div>')
        self.raw(f'<div style="position: absolute; left: 64px; top: 112px; width: {self.w-128}px; font-size: 16px; line-height: 24px; color: {MUTED}">{sub}</div>')

    def section(self, l, t, text, w=600):
        self.raw(f'<div style="position: absolute; left: {l}px; top: {t}px; width: {w}px; font-family: \'JetBrains Mono\', monospace; font-size: 12px; line-height: 16px; letter-spacing: 0.14em; font-weight: 700; color: {MUTED}">{text}</div>')

    def render(self):
        body = "\n".join(self.bands + self.arrows + self.cards + self.labels)
        return f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>{self.title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Philosopher:wght@400;700&amp;family=Golos+Text:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500;700&amp;display=swap">
<style>
body{{margin:0}}
a{{color:#7A4F0A}}a:hover{{color:#4E3206}}
</style>
</helmet>
<div style="position: relative; width: {self.w}px; height: {self.ht}px; box-sizing: border-box; background: {BG}; font-family: 'Golos Text', system-ui, sans-serif; color: {INK}; overflow: hidden">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{self.w},"height":{self.ht}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''

def save(name, b):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(b.render())
    print(name, b.w, b.ht)

GOLD = "#B07E1E"; BLUE = "#5C88BE"

