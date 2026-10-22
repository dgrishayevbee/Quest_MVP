"""Собирает артборд «Квесты главы 1» для канваса из rules.json и zone-*.json."""
import json, sys, os, html
# Считает не этот скрипт, а движок: сначала npm run check, он пишет build/report-zone-1.json
rules = json.load(open(sys.argv[1]))
zone = json.load(open(sys.argv[2]))
zone2 = json.load(open(sys.argv[3]))
out = sys.argv[4]
report = json.load(open(os.path.join(os.path.dirname(__file__), "..", "build", "report-" + zone["id"] + ".json")))
vals = {r["id"]: r for r in report["rows"]}
log, prev = [], 1
for st in report["steps"]:
    log.append((st["id"], st["xp"], st["level"], [f'ур. {st["level"]}'] if st["level"] > prev else [], ""))
    prev = st["level"]
class _H: pass
hero = _H(); hero.xp = report["final"]["xp"]; hero.level = report["final"]["level"]
chain_gold = report["final"]["chainGold"]
lvl_after = {qid: (xp, lvl, ev) for qid, xp, lvl, ev, _ in log}

INK = "#221C15"; MUTED = "#665D50"; LINE = "#D6CDBC"; BG = "#F5F1E8"
KC = {  # kind: (label, bg, border, text)
    "study":    ("Изучение",   "#E2EBF5", "#5C88BE", "#2C5A8F"),
    "practice": ("Тренировка", "#FBF1DC", "#C9952F", "#7A4F0A"),
    "battle":   ("Бой",        "#F6E0DA", "#B4523E", "#8E2B1E"),
    "work":     ("Работа",     "#EFEBE3", "#A89F90", "#5B5347"),
}
TYPE = {"main": "основной", "side": "побочный", "prep": "подготовка"}
STATUS = {"done": ("сдан", "#E6EEDC", "#6F9150", "#3A6229"),
          "prog": ("в работе", "#F3E1B5", "#B07E1E", "#6E460A"),
          "open": ("доступен", "#FBF1DC", "#C9952F", "#7A4F0A"),
          "locked": ("закрыт", "#F5F1E8", "#A89F90", MUTED)}
MONO = "font-family: 'JetBrains Mono', monospace"
e = html.escape

def chip(text, bg, bd, fg, dashed=False):
    st = "dashed" if dashed else "solid"
    return f'<span style="display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; background: {bg}; border: 1.5px {st} {bd}; color: {fg}; font-size: 12px; font-weight: 600; white-space: nowrap">{text}</span>'

H = 0
parts = []

# ---------- header
parts.append(f'''<div style="display: flex; flex-direction: column; gap: 8px">
<span style="{MONO}; font-size: 12px; letter-spacing: 0.14em; color: {MUTED}; font-weight: 700">ГЛАВА 1 · НА УТВЕРЖДЕНИЕ</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 40px; line-height: 48px">Квесты и задачи главы 1</span>
<span style="font-size: 16px; line-height: 24px; color: {MUTED}; max-width: 980px">Цель главы: {e(zone["goal"].lower())}. XP и золото не назначаются вручную — их считает калькулятор из вида и часов каждой задачи.</span>
</div>''')
H += 150

# ---------- method
mcards = []
for k, (lab, bg, bd, fg) in KC.items():
    r = rules["kinds"][k]
    mcards.append(f'''<div style="background: {bg}; border: 1.5px solid {bd}; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; min-width: 0">
<span style="{MONO}; font-size: 11px; letter-spacing: 0.1em; font-weight: 700; color: {fg}">{lab.upper()}</span>
<span style="{MONO}; font-size: 20px; font-weight: 700; color: {INK}">{r["xp_per_hour"]} XP · {r["gold_per_hour"]} зол.</span>
<span style="font-size: 12px; color: {MUTED}">за час задачи</span>
<span style="font-size: 13px; line-height: 18px; color: {INK}">{e(r["hint"])}</span>
</div>''')
mcards.append(f'''<div style="background: #FFFFFF; border: 1px solid {LINE}; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; min-width: 0">
<span style="{MONO}; font-size: 11px; letter-spacing: 0.1em; font-weight: 700; color: {MUTED}">ПРАВИЛА РАСЧЁТА</span>
<span style="font-size: 13px; line-height: 19px">XP квеста = сумма (ставка вида × часы), округление до 10. Золото — до 5.</span>
<span style="font-size: 13px; line-height: 19px">С ур. 4 повышение требует <b>испытания</b>: сданной Тренировки или Боя.</span>
<span style="font-size: 13px; line-height: 19px">Часы фиксируются в репо до взятия квеста.</span>
</div>''')
parts.append(f'''<div style="display: flex; flex-direction: column; gap: 12px">
<span style="{MONO}; font-size: 12px; letter-spacing: 0.14em; color: {MUTED}; font-weight: 700">МЕТОД</span>
<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px">{"".join(mcards)}</div>
</div>''')
H += 260

# ---------- quests
chain_of = {}
for ch in zone["chains"]:
    for q in ch["quests"]:
        chain_of[q] = ch
rows = []
for q in zone["quests"]:
    v = vals[q["id"]]
    st = STATUS[q.get("status", "locked")]
    badges = [chip(st[0], st[1], st[2], st[3], dashed=q.get("status") == "locked"), chip(TYPE[q["type"]], "#FFFFFF", LINE, MUTED)]
    if q["id"] in chain_of:
        ch = chain_of[q["id"]]
        badges.append(chip(f'цепочка «{ch["title"]}»' + (" · сундук" if ch.get("chest") else ""), "#F6E3D9", "#D9A99A", "#8E2B1E"))
    if q.get("deadline"):
        badges.append(chip("до главы " + q["deadline"].split("-")[1], "#FFFFFF", "#B4523E", "#8E2B1E"))
    meta = []
    meta.append("зависит: " + (", ".join(q["deps"]) if q["deps"] else "—"))
    meta.append(f'допуск: ур. {q.get("min_level", 1)}')
    tasks = []
    for t in q["tasks"]:
        lab, bg, bd, fg = KC[t["kind"]]
        done = t.get("done") or q.get("status") == "done"
        opt = " · по желанию" if t.get("optional") else ""
        mark = "✓ " if done else ""
        tasks.append(f'''<div style="display: grid; grid-template-columns: 116px 52px minmax(0, 1fr); gap: 10px; align-items: start">
{chip(lab, bg, bd, fg)}
<span style="{MONO}; font-size: 13px; line-height: 24px; color: {INK}">{t["hours"]:g} ч</span>
<span style="font-size: 14px; line-height: 20px; padding-top: 2px; color: {MUTED if done else INK}">{mark}{e(t["text"])}{opt}</span>
</div>''')
    xp_after = lvl_after.get(q["id"])
    after = f'после: {xp_after[0]} XP · ур. {xp_after[1]}' if xp_after else ""
    trial = chip("испытание", "#FBF1DC", "#C9952F", "#7A4F0A") if v["trial"] else ""
    rows.append(f'''<div style="background: #FFFFFF; border: 1px solid {LINE}; border-radius: 12px; padding: 16px 18px; display: grid; grid-template-columns: 300px minmax(0, 1fr) 160px; gap: 20px; align-items: start">
<div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">
<span style="{MONO}; font-size: 12px; font-weight: 700; color: {MUTED}">{e(q["id"])}</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 21px; line-height: 26px">{e(q["title"])}</span>
<div style="display: flex; flex-wrap: wrap; gap: 6px">{"".join(badges)}</div>
<span style="font-size: 12.5px; line-height: 18px; color: {MUTED}">{e(" · ".join(meta))}</span>
<span style="font-size: 13px; line-height: 19px; color: {INK}"><b>Победа:</b> {e(q["win"])}</span>
</div>
<div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">{"".join(tasks)}</div>
<div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; text-align: right">
<span style="{MONO}; font-size: 24px; font-weight: 700; color: #3A6229">{v["xp"]} XP</span>
<span style="{MONO}; font-size: 16px; font-weight: 700; color: #7A4F0A">{v["gold"]} зол.</span>
<span style="{MONO}; font-size: 12px; color: {MUTED}">{v["hours"]:g} ч</span>
{trial}
<span style="font-size: 12px; color: {MUTED}">{after}</span>
</div>
</div>''')
    ntasks = len(q["tasks"])
    H += max(190, 40 + ntasks * 44) + 12
parts.append(f'''<div style="display: flex; flex-direction: column; gap: 12px">
<span style="{MONO}; font-size: 12px; letter-spacing: 0.14em; color: {MUTED}; font-weight: 700">КВЕСТЫ · В ПОРЯДКЕ ПРОХОЖДЕНИЯ</span>
{"".join(rows)}
</div>''')
H += 40

# ---------- totals and progression
tot_xp = sum(v["xp"] for v in vals.values()); tot_gold = sum(v["gold"] for v in vals.values()); tot_h = sum(v["hours"] for v in vals.values())
left_h = sum(vals[q["id"]]["hours"] for q in zone["quests"] if q.get("status") != "done")
steps = []
for qid, xp, lvl, ev, note in log:
    up = any(x.startswith("ур.") for x in ev)
    bg = "#E6EEDC" if up else "#FFFFFF"; bd = "#6F9150" if up else LINE
    steps.append(f'<div style="background: {bg}; border: 1.5px solid {bd}; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="{MONO}; font-size: 12px; font-weight: 700">{e(qid)}</span><span style="{MONO}; font-size: 12px; color: {MUTED}">{xp} XP</span><span style="font-size: 12px; font-weight: 600; color: {"#3A6229" if up else MUTED}">ур. {lvl}</span></div>')
parts.append(f'''<div style="display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px">
<div style="background: #FFFFFF; border: 1px solid {LINE}; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px">
<span style="{MONO}; font-size: 12px; letter-spacing: 0.14em; color: {MUTED}; font-weight: 700">ПРОХОЖДЕНИЕ · УРОВЕНЬ ПОСЛЕ КАЖДОГО КВЕСТА</span>
<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{"".join(steps)}</div>
<span style="font-size: 13px; color: {MUTED}">Зелёным — квест, после которого растёт уровень. Испытание на ур. 5 закрывается тренировками в Ф.3.</span>
</div>
<div style="background: #F3E1B5; border: 2px solid #B07E1E; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 8px">
<span style="{MONO}; font-size: 12px; letter-spacing: 0.14em; color: #6E460A; font-weight: 700">ИТОГ ГЛАВЫ 1</span>
<span style="{MONO}; font-size: 26px; font-weight: 700">{hero.xp} XP · ур. {hero.level}</span>
<span style="{MONO}; font-size: 16px; font-weight: 700; color: #7A4F0A">{tot_gold} + {chain_gold} за цепочку = {tot_gold + chain_gold} золота</span>
<span style="font-size: 13px; line-height: 19px">Всего {tot_h:g} ч, осталось около {left_h:g} ч.<br>Ключи босса: {", ".join(zone["boss"]["keys"])}.<br>Сундук: цепочка «Голос».</span>
</div>
</div>''')
H += 220

# ---------- zone 2 teaser
tz = "".join(f'<div style="display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 8px; font-size: 13.5px; line-height: 20px"><span style="{MONO}; font-size: 12px; color: {MUTED}; padding-top: 1px">{e(t["id"])}</span><span>{e(t["title"])}' + (f' <span style="color: {MUTED}">— {e(t["note"])}</span>' if t.get("note") else "") + '</span></div>' for t in zone2["teaser"])
parts.append(f'''<div style="background: #E9E3D7; border: 2px dashed #A89F90; border-radius: 12px; padding: 18px; display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px">
<div style="display: flex; flex-direction: column; gap: 8px">
<span style="{MONO}; font-size: 12px; letter-spacing: 0.14em; color: {MUTED}; font-weight: 700">ПОД ТУМАНОМ</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 22px">Глава 2 · {e(zone2["title"])}</span>
<span style="font-size: 13px; line-height: 19px">Допуск: ур. {zone2["min_level"]}. Цепочка «Интервью» — большой сундук. Босс «{e(zone2["boss"]["title"])}» — легендарный сундук.</span>
<span style="font-size: 13px; line-height: 19px; color: {MUTED}">Задачи распишем, когда откроются ворота.</span>
</div>
<div style="display: flex; flex-direction: column; gap: 6px">{tz}</div>
</div>''')
H += 300

H = int(H + 128)
doc = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Квесты главы 1</title>
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
<div style="width: 1440px; min-height: {H}px; box-sizing: border-box; background: {BG}; font-family: 'Golos Text', system-ui, sans-serif; color: {INK}; padding: 56px 64px 64px; display: flex; flex-direction: column; gap: 32px">
{"".join(parts)}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":{H}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''
open(out, "w").write(doc)
print(out, H)
