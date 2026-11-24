import dictionaryCases from './dictionary.test.mjs';
import isolationCases from './isolation.test.mjs';
import idempotencyCases from './idempotency.test.mjs';

const groups = [
  ['词典与正则', dictionaryCases],
  ['防误译隔离', isolationCases],
  ['幂等与回滚', idempotencyCases],
];

let failed = 0;
let passed = 0;
for (const [title, cases] of groups) {
  console.log('\n== ' + title + ' ==');
  for (const c of cases) {
    if (c.ok) {
      passed += 1;
      console.log('  OK   ' + c.name);
    } else {
      failed += 1;
      console.log('  FAIL ' + c.name);
      console.log('       ' + c.error);
    }
  }
}
console.log('\n通过 ' + passed + '，失败 ' + failed);
process.exit(failed ? 1 : 0);
