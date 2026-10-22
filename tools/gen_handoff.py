"""Собирает артборды страницы «Передача в MVP»: токены, плашки и состояния, потоки данных, экраны и данные."""
import json, os, sys, html
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from boardlib import Board, K, INK, MUTED, LINE, BG
OUT = sys.argv[1]
e = html.escape
tokens = json.load(open(os.path.join(ROOT, "design/tokens.json")))
TOK_CSS = open(os.path.join(ROOT, "design/tokens.css")).read()
COMP_CSS = open(os.path.join(ROOT, "design/components.css")).read()
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&amp;family=Golos+Text:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500;700&amp;display=swap">'

def page(title, w, h, body, css=""):
    return f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
body{{margin:0}}
a{{color:#F0CB73}}a:hover{{color:#FFE09A}}
{css}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''

def save(name, txt):
    open(os.path.join(OUT, name), "w").write(txt); print(name)

DARK = "#100C08"; PANEL = "#1A140E"; TXT = "#F1E6CC"; MUT = "#A99272"; LN = "#3E3122"
MONO = "font-family: 'JetBrains Mono', monospace"

# ============ 1. Токены
sw = []
for g, cols in tokens["color"].items():
    cells = "".join(f'<div style="display: flex; flex-direction: column; gap: 4px; min-width: 0"><span style="height: 52px; border-radius: 6px; background: {v}; border: 1px solid #3E3122"></span><span style="font-size: 12px; color: {TXT}">--{e(k)}</span><span style="{MONO}; font-size: 11px; color: {MUT}">{e(v)}</span></div>' for k, v in cols.items())
    sw.append(f'<section style="background: {PANEL}; border: 1px solid {LN}; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px"><span style="font-family: \'Philosopher\', serif; font-weight: 700; font-size: 19px; color: {TXT}">{e(g)}</span><div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px">{cells}</div></section>')
types = f'''<section style="background: {PANEL}; border: 1px solid {LN}; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px">
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 19px; color: {TXT}">Шрифты и шкала</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 27px; color: {TXT}">Освоить вопросы Mom Test · 27</span>
<span style="font-size: 12px; color: {MUT}">Philosopher 700 — названия квестов, заголовки, доска (23), заказ (20), раздел (19)</span>
<span style="font-family: 'Philosopher', serif; font-style: italic; font-size: 16px; color: #D9C293">Прочитать книгу и переписать 5 своих вопросов о будущем в вопросы о прошлом</span>
<span style="font-size: 12px; color: {MUT}">Philosopher курсив — «что сделать», надписи на карте, летопись</span>
<span style="font-size: 15px; color: {TXT}">Golos Text 15 — задачи, интерфейс, кнопки. 13 — подсказки.</span>
<span style="{MONO}; font-size: 14px; color: {TXT}">+180 XP · +10 зол. · СЛОТ I · 140 / 300</span>
<span style="font-size: 12px; color: {MUT}">JetBrains Mono — числа, метки, эйбрау 10,5 с разрядкой 0,12em</span>
</section>'''
body = f'<div style="width: 1440px; min-height: 1500px; box-sizing: border-box; background: {DARK}; color: {TXT}; font-family: \'Golos Text\', system-ui, sans-serif; padding: 56px 64px; display: flex; flex-direction: column; gap: 18px"><span style="{MONO}; font-size: 11px; letter-spacing: 0.14em; color: {MUT}">ПЕРЕДАЧА В MVP · 1</span><span style="font-family: \'Philosopher\', serif; font-weight: 700; font-size: 40px">Токены «Путь проводника»</span><span style="font-size: 15px; color: {MUT}; max-width: 900px">Файлы: design/tokens.css и design/tokens.json. Золото — действие и награда, сургуч — срочно и босс, мох — пройдено, пергамент — то, что читаешь и отмечаешь.</span>{"".join(sw)}{types}</div>'
save("HandoffTokens.dc.html", page("Токены", 1440, 1500, body))

# ============ 2. Плашки и состояния (живые стили прототипа)
def cap(t, sub):
    return f'<div style="display: flex; flex-direction: column; gap: 2px; margin: 6px 0 2px"><span style="font-family: \'Philosopher\', serif; font-weight: 700; font-size: 22px; color: {TXT}">{t}</span><span style="{MONO}; font-size: 11.5px; color: {MUT}">{sub}</span></div>'
def tag(t):
    return f'<span style="{MONO}; font-size: 10.5px; letter-spacing: 0.1em; color: #F0CB73; display: block; margin-bottom: 6px">{t}</span>'
note_open = '''<article class="note"><span class="pin"></span><span class="ribbon {rc}">{rt}</span><h3>{title}</h3><span class="brief">{brief}</span>{flags}<div class="foot"><span class="x">+{xp} XP</span><span class="g">+{g} зол.</span></div><div class="acts"><button class="btn rust small" type="button" {dis}>Снять заказ</button><button class="btn pghost small" type="button" style="color:var(--pmuted)">Подробнее</button></div></article>'''
orders = "".join([
    note_open.format(rc="r-main", rt="ОСНОВНОЙ", title="Сформулировать мечту-результат", brief="Одна фраза на нишу: что собственник получит, его словами и в тенге", flags="", xp=110, g=20, dis=""),
    note_open.format(rc="r-side", rt="ПОБОЧНЫЙ", title="Посчитать часы в неделю", brief="Честное число часов, дни для квестов и база эксперимента", flags='<span class="flag deadline">Срочно · до главы 2</span>', xp=0, g=5, dis=""),
    note_open.format(rc="r-prep", rt="ПОДГОТОВКА", title="Освоить вопросы Mom Test", brief="Прочитать книгу и переписать 5 своих вопросов о будущем в вопросы о прошлом", flags="", xp=180, g=10, dis=""),
    note_open.format(rc="r-main", rt="ОСНОВНОЙ", title="Собрать гайд интервью", brief="Гайд на 30–40 минут и одно тренировочное интервью со знакомым", flags='<span class="flag chain">Цепочка «Голос» · большой сундук</span>', xp=90, g=20, dis="disabled"),
])
seals = ('<button type="button" class="note sealed"><span class="pin"></span><span class="q">Собрать гайд интервью</span><span class="waxseal">II</span><span class="cond">Печать снимется, когда сдашь «Освоить вопросы Mom Test» и «Освоить интервью Мёсты»</span></button>'
         '<button type="button" class="note sealed"><span class="pin"></span><span class="q">Стек решений</span><span class="waxseal lvl">ур. 6</span><span class="cond">Печать снимется, когда достигни ур. 6</span></button>'
         '<button type="button" class="note wanted"><span class="pin"></span><span class="w">РАЗЫСКИВАЕТСЯ</span><h3 style="font-size:17px">Страж перевала</h3><span class="cond" style="font-size:12.5px;color:#4A3A26">Пропустит в главу 2 «Проверка» с 4 ключами и на ур. 5</span><div class="keys"><span class="ok">1.7</span><span>1.8</span><span>Ф.2</span><span class="ok">Ф.3</span></div></button>')
jslot = lambda ready: f'''<div class="jslot"><div class="row"><span>СЛОТ I · {"МОЖНО СДАТЬ" if ready else "В РАБОТЕ"}</span><span class="ticks"><i class="on"></i><i class="{"on" if ready else ""}"></i><i class="{"on" if ready else ""}"></i><i class="{"on" if ready else ""}"></i></span></div><h3>Найти фразу против найма</h3><ul class="ptasks"><li><label class="done"><input type="checkbox" checked>Найти главного конкурента — это найм</label></li><li><label class="{"done" if ready else "next"}"><input type="checkbox" {"checked" if ready else ""}>Три варианта «кто я» без слова «консультант»</label></li><li><label class="{"done" if ready else ""}"><input type="checkbox" {"checked" if ready else ""}>2–3 рабочих названия направления</label></li></ul><span class="win">Победа: есть одна фраза, с которой ты представляешься</span>{'<button class="btn rust" type="button">Сдать квест</button>' if ready else '<button class="btn pghost" type="button" disabled>Сдать квест · отметь все задачи</button>'}</div>'''
journal = f'<div class="journal"><div class="jh"><b>Журнал</b><span class="mono" style="font-size:12px;color:#C9A97A">2 / 2 слота</span></div>{jslot(False)}{jslot(True)}<div class="jempty"><span class="eyebrow" style="color:#C9A97A">Слот II</span><b>Свободен</b><span>Сними заказ с доски</span></div></div>'
sheet = lambda kick, title, inner: f'<div class="sheet" style="width:100%"><span class="pin"></span><button class="x" type="button">×</button><span class="kicker">{kick}</span><h2>{title}</h2>{inner}</div>'
sheet_prog = sheet("Подготовка · в работе", "Освоить вопросы Mom Test", '<p class="brief">Прочитать книгу и переписать 5 своих вопросов о будущем в вопросы о прошлом</p><ul class="ptasks"><li><label class="done"><input type="checkbox" checked>Прочитать The Mom Test (Роб Фицпатрик)</label></li><li><label class="next"><input type="checkbox">Выписать правила хороших и плохих вопросов на одну страницу</label></li><li><label><input type="checkbox">Переписать 5 вопросов вида «купили бы вы» в вопросы о прошлом</label></li></ul><p class="wintext"><b>Победа:</b> на одной странице правила хороших вопросов, и 5 своих вопросов переписаны по ним.</p><div class="reward"><span class="x2">+180 XP</span><span class="g2">+10 золота</span></div><details><summary>Как посчитана награда</summary></details><div class="acts"><button class="btn pghost" type="button" disabled>Сдать · отметь все задачи</button><button class="btn ghost small" type="button">Отложить</button></div>')
sheet_lock = sheet("Основной · под печатью", "Собрать гайд интервью", '<p class="brief">Гайд на 30–40 минут и одно тренировочное интервью со знакомым</p><div class="lock"><span class="waxseal">II</span><p>Печать снимется, когда сдашь «Освоить вопросы Mom Test» и «Освоить интервью Мёсты».</p></div><p class="wintext"><b>Победа:</b> гайд на 30–40 минут один раз опробован в живом разговоре.</p><div class="reward"><span class="x2">+90 XP</span><span class="g2">+20 золота</span><em>цепочка «Голос» → большой сундук</em></div>')
sheet_form = sheet("Основной · можно сдать", "Найти фразу против найма", '<p class="brief">Одно предложение, после которого ясно, зачем ты, если можно нанять РОПа</p><form style="display:flex;flex-direction:column;gap:10px"><label class="f">Что сделал — 1–3 предложения. Для тренировки: с кем и что вышло<textarea>Проверил три варианта на Айдосе. Зашёл второй: «беру следующий шаг роста и отвечаю за результат».</textarea></label><label class="f">Ссылки на результат (по желанию)<input type="text" value="docs: позиция v0"></label><div class="acts"><button class="btn rust" type="button">Сдать: +70 XP, +10 зол.</button><button class="btn ghost small" type="button">Отмена</button></div></form>')
def mk(cls, sym, label, sub="", locked=False):
    return f'<div style="position: relative; height: 120px; background: var(--island); border-radius: 10px; box-shadow: inset 0 0 30px rgba(122,84,38,.5)">{tag_light(cls)}<span class="mk {cls}" style="left:50%;top:44px"><span class="shield">{sym}</span></span><span class="mlabel{" locked" if locked else ""}" style="left:50%;top:72px">{label}{f"<small>{sub}</small>" if sub else ""}</span></div>'
def tag_light(t):
    return f'<span style="position:absolute;left:10px;top:8px;{MONO};font-size:10px;color:#7A5A2A">{t}</span>'
check = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4DDC8" stroke-width="3.2"><path d="M5 12l5 5 9-10"/></svg>'
markers = "".join([
    mk("open halo", "!", "Освоить формулу ценности", "можно взять"),
    mk("prog halo", "?", "Найти фразу против найма", "в работе · 1/4"),
    mk("ready halo", "?", "Освоить вопросы Mom Test", "можно сдать"),
    mk("done", check, "Просканировать рынок"),
    mk("locked", "?", "Собрать гайд интервью", "", True),
])
chestcell = lambda st, lbl: f'<div style="position: relative; height: 120px; background: var(--island); border-radius: 10px; box-shadow: inset 0 0 30px rgba(122,84,38,.5)">{tag_light(st)}<span class="chestmk{" ready" if st=="ready" else ""}" style="left:50%;top:46px"><span class="box" style="display:block"></span></span><span class="mlabel" style="left:50%;top:72px">Большой сундук<small>{lbl}</small></span></div>'
bosscell = lambda op: f'<div style="position: relative; height: 120px; background: #0B0806; border: 1px solid #3A2E1F; border-radius: 10px">{tag_light("open" if op else "closed")}<span class="bossmk{" open" if op else ""}" style="left:50%;top:50px"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="{"#B9D6A4" if op else "#E9A08E"}" stroke-width="2"><path d="{"M6 12l4 4 8-9" if op else "M7 7l10 10M17 7L7 17"}"/></svg></span><span style="position:absolute;left:0;right:0;top:86px;text-align:center;font-size:12px;color:#E8D2C0">Страж · {"пропускает" if op else "1/4 ключа"}</span></div>'
mapcells = markers + chestcell("locked", "осталось 1 из 2 квестов") + chestcell("ready", "готов — открыть!") + chestcell("opened", "вещь выпала") + bosscell(False) + bosscell(True)
banners = ('<div class="banner"><p><b>Сундук готов.</b> Цепочка «Голос» пройдена.</p><button class="btn small" type="button">Открыть сундук</button></div>'
           '<div class="banner alarm"><p><b>Испытание уровня 5.</b> Опыта хватает. Чтобы подняться, сдай квест с тренировкой или боем.</p></div>'
           '<div class="banner"><p><b>Страж пропускает.</b> Ворота в главу 2 открыты: скопируй статус во вкладке «Персонаж» и пришли Claude.</p></div>')
hero = ('<div class="hcol" style="flex:none">'
        '<div class="hslot"><span class="ic">4</span><div><small>Заказов сдано</small><b>квестов</b></div></div>'
        '<div class="hslot"><span class="ic gold">1</span><div><small>Наград получено</small><b>вещей и плюшек</b></div></div>'
        '<div class="hslot"><span class="ic empty"></span><div><small>Трофей</small><b style="color:#7E6A4A;font-family:var(--f-body);font-size:14px;font-weight:400">пустой слот</b></div></div></div>')
cards = ('<section class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Казна</h3><span class="mono" style="color:var(--gold-hi);font-size:20px;font-weight:700">45</span></div><div class="shoprow"><span>[заглушка] Маленькая плюшка</span><span class="mono" style="color:var(--gold-hi);font-size:13px">30</span><button class="btn small" type="button">Купить</button></div><div class="shoprow"><span>[заглушка] Средняя плюшка</span><span class="mono" style="color:var(--gold-hi);font-size:13px">60</span><button class="btn small" type="button" disabled>Купить</button></div></section>'
         '<section class="chron"><span class="eyebrow" style="color:#7A5A2A">Летопись · что сдано</span><div class="e"><b>Освоить вопросы Mom Test · +180 XP</b><p>Выписал 9 правил, переписал 5 вопросов. Главное: спрашивать про последний раз, а не про «а если бы».</p></div></section>'
         '<section class="card warm"><h3>До уровня 5</h3><span class="check ok"><i></i>Опыт: ещё 0 XP</span><span class="check"><i></i>Испытание: сдать квест с тренировкой или боем</span></section>')
buttons = '<div class="tools"><button class="btn" type="button">Основная</button><button class="btn rust" type="button">Снять заказ · Сдать</button><button class="btn moss" type="button">Получил</button><button class="btn ghost" type="button">Вторичная</button><button class="btn pghost" type="button" disabled>Недоступно</button><button class="btn small" type="button">Маленькая</button></div>'
grid = lambda n, inner, extra="": f'<div style="display: grid; grid-template-columns: repeat({n}, minmax(0, 1fr)); gap: 16px; align-items: start; {extra}">{inner}</div>'
H2 = 3150
body = f'''<div style="width: 1440px; min-height: {H2}px; box-sizing: border-box; background: {DARK}; color: {TXT}; font-family: 'Golos Text', system-ui, sans-serif; padding: 56px 64px; display: flex; flex-direction: column; gap: 18px">
<span style="{MONO}; font-size: 11px; letter-spacing: 0.14em; color: {MUT}">ПЕРЕДАЧА В MVP · 2</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 40px">Плашки и состояния</span>
<span style="font-size: 15px; color: {MUT}; max-width: 980px">Нарисовано теми же стилями, что прототип (design/components.css). Под каждым блоком — какое поле состояния движка его включает. Полная таблица — docs/handoff.md.</span>
{cap("Заказ на доске", "status = open · ribbon = quest.type · флаги: quest.deadline, цепочка · кнопка неактивна при prog.length = slots")}
<div class="board" style="grid-template-columns: repeat(4, minmax(0, 1fr))">{orders}</div>
{cap("Печать и «Разыскивается»", "status = locked · reasons.missing → римская цифра, reasons.needLevel → печать уровня · bossKeys[].ok")}
<div class="board" style="grid-template-columns: repeat(3, minmax(0, 1fr))">{seals}</div>
{cap("Журнал и слоты", "prog[] · status = prog / ready · qs[id].tasks · пустой слот при prog.length < slots")}
{grid(2, journal + '<div style="display:flex;flex-direction:column;gap:12px">' + banners + cap("Баннеры", "chains[].chest = ready · hero.blocked · bossOpen") + '</div>')}
{cap("Окно квеста", "в работе · под печатью · форма сдачи: заметка обязательна, ссылки по желанию → quest_submitted")}
{grid(3, sheet_prog + sheet_lock + sheet_form)}
{cap("Карта: метки, сундук, страж", "status → метка · chains[].chest: locked / ready / opened · bossOpen")}
{grid(5, mapcells)}
{cap("Персонаж: слоты, казна, летопись, до уровня", "seq.length · received · gold, shop · archive · hero.needTrial")}
{grid(4, hero + cards)}
{cap("Кнопки", "золото — главное действие экрана · ржавчина — действие с пергаментом · мох — получил · пунктир — недоступно")}
{buttons}
</div>'''
save("HandoffComponents.dc.html", page("Плашки и состояния", 1440, H2, body, TOK_CSS + COMP_CSS.replace("body{", ".x-body-unused{")))

# ============ 3. Потоки данных (схема)
b = Board("Потоки данных", 1440, 900)
b.heading("Потоки данных", "У каждого вида данных один дом. Контент — в репо, действия — в базе, всё остальное считает движок. Claude пишет контент и читает журнал событий.")
W, Hc = 240, 120
b.card(64, 200, W, Hc, "CLAUDE", "Пишет и калибрует", "Квесты, задачи, допуски, ставки. Читает журнал событий.", "purple", size=13)
b.card(400, 200, W, Hc, "РЕПО", "content/*.json", "Зоны, квесты, правила, награды. Проверка: npm run check.", "blue", size=13)
b.card(736, 200, W, Hc, "ДВИЖОК", "engine.ts", "Считает состояние и проверяет каждое действие.", "goldf", size=13)
b.card(1072, 200, W, Hc, "САЙТ", "Доска, карта, персонаж", "Рисует только то, что вернул движок.", "moss", size=13)
b.card(64, 460, W, Hc, "ПРОЕКТ CLAUDE.AI", "Файл пути", "Летопись глав и решения. Память между чатами.", "plain", size=13)
b.card(400, 460, W, Hc, "ДОКУМЕНТЫ", "Результаты квестов", "Claude Docs, Google Drive. В игре только ссылка.", "plain", size=13)
b.card(736, 460, W, Hc, "БАЗА", "events", "Только события с датой. Дописываются, не правятся.", "plain", size=13)
b.h(304, 399, 260, color="#5E3C9C"); b.label(316, 232, 72, "правит", color="#5E3C9C")
b.h(640, 735, 260, color="#2C5A8F"); b.label(652, 232, 72, "контент", color="#2C5A8F")
b.h(976, 1071, 260); b.label(984, 232, 80, "состояние")
b.v(1192, 320, 520, head=False, color="#B07E1E"); b.h(1192, 977, 520, color="#B07E1E"); b.label(1204, 412, 120, "действия", color="#7A4F0A", align="left")
b.v(856, 460, 321); b.label(868, 382, 72, "события", align="left")
b.h(640, 735, 520); b.label(652, 492, 72, "ссылки")
b.v(184, 320, 459, color="#5E3C9C"); b.label(196, 382, 96, "итоги глав", color="#5E3C9C", align="left")
b.v(856, 580, 660, head=False, color="#5E3C9C", dashed=True); b.h(856, 16, 660, head=False, color="#5E3C9C", dashed=True); b.v(16, 660, 260, head=False, color="#5E3C9C", dashed=True); b.h(16, 63, 260, color="#5E3C9C", dashed=True)
b.label(336, 672, 240, "экспорт журнала событий", color="#5E3C9C")
b.section(64, 716, "КАК ЖУРНАЛ ПОПАДАЕТ К CLAUDE")
b.card(64, 748, 384, 104, "СЕЙЧАС · ПРОТОТИП И MVP", "Кнопкой", "«Скопировать статус» или «Журнал событий (JSON)» → вставить в чат.", "goldf", size=13)
b.card(528, 748, 384, 104, "V2", "Адрес /api/export", "Токен только для чтения. Claude забирает журнал сам.", "plain", size=13)
b.card(992, 748, 384, 104, "V3", "MCP-сервер", "Claude читает события и предлагает правки контента пулл-реквестом.", "plain", size=13)
save("HandoffFlow.dc.html", b.render())

# ============ 4. Экраны и данные
screens = [
  ("Доска", "главный экран", ["Заказы: квесты со status = open", "Печати: status = locked и reasons", "Разыскивается: bossKeys, zone2.min_level", "Журнал: prog[] и задачи", "Баннеры: сундук, испытание, страж"], ["Снять заказ → quest_taken", "Галочка → task_set", "Сдать квест → окно с формой"]),
  ("Карта", "зона I", ["Метки: status и quest.map", "Пути: deps (чернила / карандаш), цепочка (красный)", "Сундук: chains[id].chest", "Страж: bossOpen", "Туман: zone-2 (тизер)"], ["Метка → окно квеста", "Сундук → окно сундука", "Страж → окно стража"]),
  ("Персонаж", "итоги и награды", ["Итоги: seq.length, tasksDone, battles, received", "Портрет: hero.level, hero.xp", "Трофеи: chains[].rec, shop", "Казна: gold, rewards/shop", "Летопись: archive", "До уровня: hero.needTrial, bossKeys"], ["Купить → shop_bought", "Скопировать статус / JSON", "Сбросить (только прототип)"]),
  ("Окно квеста", "поверх любого экрана", ["Название, brief, задачи, победа", "Награда: values.xp, values.gold", "Печать: reasons", "Как посчитано: values.parts"], ["Снять заказ → quest_taken", "Отложить → quest_dropped", "Сдать → quest_submitted (заметка обязательна)", "Вернуть → quest_reopened"]),
]
cols = []
for t, sub, shows, acts in screens:
    li = lambda xs: "".join(f'<li style="font-size: 13.5px; line-height: 20px">{e(x)}</li>' for x in xs)
    cols.append(f'''<section style="background: {PANEL}; border: 1px solid {LN}; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; min-width: 0">
<span style="{MONO}; font-size: 10.5px; letter-spacing: 0.12em; color: #F0CB73">{e(sub.upper())}</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 24px">{e(t)}</span>
<span style="{MONO}; font-size: 11px; color: {MUT}">ПОКАЗЫВАЕТ</span><ul style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px">{li(shows)}</ul>
<span style="{MONO}; font-size: 11px; color: {MUT}">ДЕЙСТВИЯ → СОБЫТИЯ</span><ul style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; color: #F0CB73">{li(acts)}</ul></section>''')
body = f'''<div style="width: 1440px; min-height: 860px; box-sizing: border-box; background: {DARK}; color: {TXT}; font-family: 'Golos Text', system-ui, sans-serif; padding: 56px 64px; display: flex; flex-direction: column; gap: 18px">
<span style="{MONO}; font-size: 11px; letter-spacing: 0.14em; color: {MUT}">ПЕРЕДАЧА В MVP · 4</span>
<span style="font-family: 'Philosopher', serif; font-weight: 700; font-size: 40px">Экраны и данные</span>
<span style="font-size: 15px; color: {MUT}; max-width: 980px">Каждый экран — набор плашек. Плашка читает поля состояния движка и шлёт одно событие. Сервер проверяет событие тем же движком (canApply) и возвращает новое состояние.</span>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: start">{"".join(cols)}</div>
<section style="background: #241A12; border: 1px solid #7A4A2A; border-radius: 12px; padding: 18px; display: flex; flex-wrap: wrap; gap: 10px 28px; font-size: 13.5px">
<b style="font-family: 'Philosopher', serif; font-size: 18px; width: 100%">API для MVP</b>
<span><span style="{MONO}; color: #F0CB73">GET /api/state</span> — derive(события, контент)</span>
<span><span style="{MONO}; color: #F0CB73">POST /api/events</span> — canApply → запись → новое состояние</span>
<span><span style="{MONO}; color: #F0CB73">GET /api/export</span> — журнал событий JSON (v2, с токеном)</span>
</section>
</div>'''
save("HandoffScreens.dc.html", page("Экраны и данные", 1440, 860, body))
