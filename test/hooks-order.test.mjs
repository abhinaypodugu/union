// Guard against the "Rendered more hooks than during the previous render" crash, which
// has regressed twice (manage/queue + manage/announce, then app/issue.tsx): no screen may
// call a React hook after an early `return` in its component body.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const HOOK = /(?:^|[^\w.])(?:React\.)?use(?:State|Effect|LayoutEffect|Callback|Memo|Ref|Context|Reducer|Store|LocalSearchParams|SafeAreaInsets|Router|Fonts)\s*\(/;
const EARLY_RETURN = /^\s*if\s*\(.*\)\s*return\b/;

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : [];
  });
}

describe('rules of hooks', () => {
  it('no hook is called after an early return in any screen component', () => {
    const problems = [];
    for (const file of files(join(root, 'app'))) {
      const lines = readFileSync(file, 'utf8').split('\n');
      let inComponent = false;
      let returnedAt = 0;
      let base = -1; // indentation of the component body's own statements
      lines.forEach((line, i) => {
        if (/^export default function/.test(line)) { inComponent = true; returnedAt = 0; base = -1; return; }
        if (!inComponent) return;
        if (/^}/.test(line)) { inComponent = false; return; }
        if (!line.trim() || /^\s*\/\//.test(line)) return;
        // Nested functions (handlers, callbacks) are indented deeper and may return freely;
        // only statements at the component body's own indentation count.
        const depth = line.match(/^\s*/)[0].length;
        if (base < 0) base = depth;
        if (depth !== base) return;
        if (EARLY_RETURN.test(line)) returnedAt = returnedAt || i + 1;
        else if (returnedAt && HOOK.test(line)) problems.push(`${relative(root, file)}:${i + 1} hook after early return at line ${returnedAt}`);
      });
    }
    assert.deepEqual(problems, []);
  });
});
