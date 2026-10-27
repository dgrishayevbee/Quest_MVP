// Контент из репо: читается при сборке, на сайте не меняется.
import rules from '@/content/rules.json';
import zone1 from '@/content/zones/zone-1.json';
import zone2 from '@/content/zones/zone-2.json';
import pool from '@/content/rewards/pool.json';
import shop from '@/content/rewards/shop.json';
import seed from '@/content/seed.json';
import { chapterPath, type Content, type GameEvent } from '@/engine/src/engine';

export const C = { rules, zone: zone1, pool: pool.items, shop: shop.items } as unknown as Content;
export const ZONE2 = zone2 as { id: string; title: string; min_level: number };
export const SEED = seed as GameEvent[];

export const RULES = C.rules, ZONE = C.zone, QUESTS = ZONE.quests, KIND = RULES.kinds;
export const QBY = Object.fromEntries(QUESTS.map(q => [q.id, q]));
export const CHAIN_OF: Record<string, (typeof ZONE.chains)[number]> = {};
for (const ch of ZONE.chains) for (const id of ch.quests) CHAIN_OF[id] = ch;

// Порядок прохождения главы для полоски «Путь главы» и подсказки «Что дальше».
export const PATH = chapterPath(C);
