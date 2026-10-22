// Загрузка контента из папки content/ (только для Node: CLI, тесты, бэкенд).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Content } from '../src/engine.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

export function loadContent(zone = 'zone-1'): Content {
  return {
    rules: J('content/rules.json'),
    zone: J(`content/zones/${zone}.json`),
    pool: J('content/rewards/pool.json').items,
    shop: J('content/rewards/shop.json').items,
  };
}
export const loadJson = J;
