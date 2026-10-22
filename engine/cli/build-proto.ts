// npm run build:proto — собирает прототип: шаблон + контент + движок (типы снимаются встроенным Node).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { loadContent, loadJson, ROOT } from '../node/load.ts';

const src = readFileSync(join(ROOT, 'engine/src/engine.ts'), 'utf8');
const js = stripTypeScriptTypes(src).replace(/^export\s+(?=(function|const|let)\b)/gm, '').replace(/^export\s+(type|interface)\b.*$/gm, '');
const c = loadContent('zone-1');
const data = { content: c, zone2: loadJson('content/zones/zone-2.json'), seed: loadJson('content/seed.json') };
const tpl = readFileSync(join(ROOT, 'proto/template.html'), 'utf8');
const out = tpl.replace('/*DATA*/', JSON.stringify(data)).replace('/*ENGINE*/', js);
const dst = process.argv[2] || join(ROOT, 'proto/put-provodnika.html');
writeFileSync(dst, out);
console.log(dst, out.length);
