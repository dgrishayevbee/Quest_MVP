'use client';
// Шапка: бренд, вкладки, золото, слоты, уровень с полосой опыта до следующего.
import { usePathname, useRouter } from 'next/navigation';
import { xpForLevel } from '@/engine/src/engine';
import { RULES } from '@/lib/content';
import { fmt, pct } from '@/lib/ui';
import { useGame } from './GameProvider';

const TABS = [['board', 'Доска'], ['map', 'Карта'], ['hero', 'Персонаж']] as const;

export function Header() {
  const { D } = useGame();
  const router = useRouter(), path = usePathname();
  const h = D.hero, cur = xpForLevel(h.level), nxt = xpForLevel(h.level + 1);
  return (
    <header className="top">
      <div className="top-in gutter">
        <div className="brand"><span className="mark" aria-hidden="true"><span>П</span></span><div><b>Путь проводника</b><span className="eyebrow">Этап 1 · Зона I</span></div></div>
        <nav className="nav" role="tablist">
          {TABS.map(([v, label]) => (
            <button key={v} type="button" role="tab" id={'tab-' + v} aria-selected={path === '/' + v} onClick={() => router.push('/' + v)}>{label}</button>
          ))}
        </nav>
        <div className="stats">
          <span className="gold">Золото <b>{fmt(D.gold)}</b></span>
          <span className="slots-mini" aria-label="Слоты"><span>Слоты</span>{Array.from({ length: RULES.slots }, (_, n) => <i key={n} className={D.prog.length > n ? 'on' : ''} />)}</span>
          <span className="sep" aria-hidden="true" />
          <span className="lvlbox">
            <span className="lvl-mini" aria-hidden="true"><span>{h.level}</span></span>
            <span className="lv"><span>Уровень <b>{h.level}</b><span className="xpw"> · <b>{fmt(h.xp)}</b> / {fmt(nxt)} XP</span></span><span className="bar"><i style={{ width: pct((h.xp - cur) / (nxt - cur)) }} /></span></span>
          </span>
        </div>
      </div>
    </header>
  );
}
