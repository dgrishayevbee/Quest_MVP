// npm run check — проверка контента и отчёт: награды квестов, прохождение по уровням, итоги.
// Пишет build/report.json (для листа на канвасе) и печатает отчёт в консоль. Код выхода 1 при ошибках.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { validate, simulate, questValue, xpForLevel } from '../src/engine.ts';
import { loadContent, ROOT } from '../node/load.ts';

const zoneId = process.argv[2] || 'zone-1';
const c = loadContent(zoneId);
const issues = validate(c);
const short: Record<string, string> = { study: 'И', practice: 'Т', battle: 'Б', work: 'Р' };
const rows = c.zone.quests.map(q => {
  const v = questValue(q, c.rules);
  return { id: q.id, title: q.title, tasks: q.tasks.map(t => short[t.kind] + String(t.hours).replace('.', ',') + (t.optional ? '*' : '')).join(' '), hours: v.hours, xp: v.xp, gold: v.gold, trial: v.trial, min_level: q.min_level || 1 };
});
const sim = simulate(c);
const f = sim.final;

const line = (s: string) => process.stdout.write(s + '\n');
line(`\n${c.zone.id} · ${c.zone.title}`);
line('─'.repeat(78));
for (const r of rows) line(`${r.id.padEnd(4)} ${r.title.slice(0, 34).padEnd(35)} ${r.tasks.padEnd(24)} ${String(r.xp).padStart(4)} XP ${String(r.gold).padStart(3)} зол. ур.${r.min_level}${r.trial ? ' исп.' : ''}`);
line('─'.repeat(78));
line('Прохождение: ' + sim.steps.map(s => `${s.id}→ур.${s.level}${s.blocked ? '(исп.)' : ''}`).join('  '));
line(`Итог: ${f.hero.xp} XP, уровень ${f.hero.level}, золото ${f.gold}, до ур. ${f.hero.level + 1}: ${xpForLevel(f.hero.level + 1) - f.hero.xp} XP`);
line(`Сундуки: ${Object.entries(f.chains).map(([k, v]) => `${k}=${v.chest}`).join(', ')} · страж: ${f.bossOpen ? 'пропускает' : 'закрыт'}`);
const errs = issues.filter(i => i.level === 'error'), warns = issues.filter(i => i.level === 'warn');
line(`\nОшибки: ${errs.length}`); errs.forEach(i => line(`  ✗ ${i.where}: ${i.msg}`));
line(`Предупреждения: ${warns.length}`); warns.forEach(i => line(`  ! ${i.where}: ${i.msg}`));
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build', `report-${zoneId}.json`), JSON.stringify({ zone: { id: c.zone.id, title: c.zone.title, goal: c.zone.goal, boss: c.zone.boss }, rows, steps: sim.steps, final: { xp: f.hero.xp, level: f.hero.level, gold: f.gold, chainGold: f.earned - f.seq.reduce((a, id) => a + f.values[id].gold, 0) }, issues }, null, 2));
process.exit(errs.length ? 1 : 0);
