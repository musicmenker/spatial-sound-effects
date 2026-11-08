import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const studio=readFileSync(new URL('../src/ui/studio.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('Meyda was removed from runtime dependencies and imports',()=>{
  assert.equal(Object.hasOwn(pkg.dependencies,'meyda'),false);
  assert.equal(pkg.dependencies['fourier-transform'],'2.5.1');
  assert.doesNotMatch(studio,/from ['"]meyda['"]/);
  assert.match(studio,/spectralCentroidHz/);
});
test('third party notices and UI credits match actual analysis dependency',()=>{
  const credits=readFileSync(new URL('../THIRD_PARTY.md',import.meta.url),'utf8');
  assert.match(credits,/fourier-transform/);
  assert.ok(!credits.includes('| meyda |'));
  assert.match(html,/fourier-transform/);
});
