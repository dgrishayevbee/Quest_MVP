'use client';
// Кнопки экранов → намерения для движка и тексты тостов, как в прототипе.
import { C, QBY, QUESTS, ZONE } from '@/lib/content';
import { fmt } from '@/lib/ui';
import { useGame } from './GameProvider';

export function useActions() {
  const { D, act, toast, close } = useGame();
  return {
    take(id: string) {
      if (act({ t: 'quest_taken', q: id })) { close(); toast(`«${QBY[id].title}» в журнале`); }
    },
    drop(id: string) {
      if (act({ t: 'quest_dropped', q: id })) { close(); toast('Квест отложен, слот свободен'); }
    },
    reopen(id: string) {
      if (act({ t: 'quest_reopened', q: id })) toast('Квест снова в работе');
    },
    submit(id: string, note: string, links: string): boolean {
      if (!note) { toast('Напиши, что сделал, хотя бы одним предложением'); return false; }
      const r = act({ t: 'quest_submitted', q: id, note, links });
      if (!r) return false;
      const { before, after } = r, v = after.values[id];
      const msg = [`Квест сдан · +${v.xp} XP · +${v.gold} зол.`];
      if (after.hero.level > before.hero.level) msg.push(`уровень ${after.hero.level}!`);
      if (after.hero.blocked && !before.hero.blocked) msg.push('нужно испытание');
      const opened = QUESTS.filter(x => before.status[x.id] === 'locked' && after.status[x.id] === 'open').map(x => '«' + x.title + '»');
      if (opened.length) msg.push('печать снята: ' + opened.join(', '));
      for (const c of ZONE.chains) if (!before.chains[c.id].complete && after.chains[c.id].complete) msg.push('сундук готов');
      if (!before.bossOpen && after.bossOpen) msg.push('страж пропускает');
      close(); toast(msg.join(' · '));
      return true;
    },
    roll(chain: string) { act({ t: 'chest_opened', chain }); },
    receive(chain: string, photo: string) {
      if (act({ t: 'chest_received', chain, photo })) { close(); toast('Вещь на полке трофеев'); }
    },
    swap(chain: string) {
      const r = act({ t: 'chest_swapped', chain });
      if (r) toast(`+${fmt(r.after.chains[chain].rec!.gold!)} золота`);
    },
    buy(item: string) {
      if (act({ t: 'shop_bought', item })) toast(`Куплено: ${C.shop.find(x => x.id === item)?.title}`);
    },
    full: D.prog.length >= C.rules.slots,
  };
}
