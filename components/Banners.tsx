'use client';
// Баннеры над доской и картой: сундук готов, вещь выпала, пул пуст, испытание, страж пропускает.
import { C, ZONE } from '@/lib/content';
import { useGame } from './GameProvider';

export function Banners() {
  const { D, open } = useGame();
  return (
    <>
      {ZONE.chains.map(ch => {
        const c = D.chains[ch.id];
        if (c.chest === 'ready') return <div key={ch.id} className="banner"><p><b>Сундук готов.</b> Цепочка «{ch.title}» пройдена.</p><button className="btn small" type="button" onClick={() => open({ chest: ch.id })}>Открыть сундук</button></div>;
        if (c.chest === 'opened') return <div key={ch.id} className="banner"><p><b>Из сундука выпало:</b> {C.pool.find(p => p.id === c.rec!.item)?.title}. 7 дней, чтобы купить.</p><button className="btn small" type="button" onClick={() => open({ chest: ch.id })}>Открыть</button></div>;
        if (c.chest === 'empty_pool') return <div key={ch.id} className="banner"><p>Цепочка «{ch.title}» пройдена, но в пуле меньше 3 вещей. Пополни список желаний.</p></div>;
        return null;
      })}
      {D.hero.blocked && <div className="banner alarm"><p><b>Испытание уровня {D.hero.level + 1}.</b> Опыта хватает. Чтобы подняться, сдай квест с тренировкой или боем.</p></div>}
      {D.bossOpen && <div className="banner"><p><b>Страж пропускает.</b> Ворота в главу 2 открыты: скопируй статус во вкладке «Персонаж» и пришли Claude.</p></div>}
    </>
  );
}
