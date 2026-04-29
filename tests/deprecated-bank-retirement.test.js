const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const productionHtmlRoots = [
  repoRoot,
  path.join(repoRoot, 'topics')
];

test('production HTML does not reference retired JS question banks', () => {
  const offenders = findFiles(productionHtmlRoots, file => file.endsWith('.html'))
    .filter(file => /assets\/question-banks\/[^"')\s]+\.js/.test(read(file)))
    .map(relative);

  assert.deepEqual(offenders, []);
});

test('runtime question loader has no bankFile fallback path', () => {
  const loader = read(path.join(repoRoot, 'assets', 'question-loader.js'));

  assert.doesNotMatch(loader, /\bbankFile\b/);
  assert.doesNotMatch(loader, /question-banks/);
});

test('package write scripts do not produce legacy JS question banks', () => {
  const pkg = JSON.parse(read(path.join(repoRoot, 'package.json')));
  const writeScripts = Object.entries(pkg.scripts || {})
    .filter(([name, command]) => /write|normalize|manifest|chunks|questions|json/.test(`${name} ${command}`));
  const offenders = writeScripts
    .filter(([name, command]) => {
      return /assets\/question-banks/.test(command) ||
        (/question-banks/.test(command) && /--write/.test(command) && !/^json:write$/.test(name));
    })
    .map(([name]) => name);

  assert.deepEqual(offenders, []);
});

test('live runtime assets no longer include deprecated JS question banks', () => {
  const bankDir = path.join(repoRoot, 'assets', 'question-banks');
  const bankFiles = fs.existsSync(bankDir)
    ? fs.readdirSync(bankDir).filter(file => file.endsWith('.js'))
    : [];

  assert.deepEqual(bankFiles, []);

  const fixtureBanks = findFiles([path.join(repoRoot, 'tests', 'fixtures')], file => {
    return file.includes(`${path.sep}legacy-bank-conversion${path.sep}`) && file.endsWith('.js');
  });
  assert.ok(fixtureBanks.length > 0, 'expected fixture-based legacy conversion coverage to remain');
});

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function relative(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function findFiles(roots, predicate) {
  const files = [];
  roots.forEach(root => {
    if (!fs.existsSync(root)) return;
    walk(root, files, predicate);
  });
  return Array.from(new Set(files)).sort();
}

function walk(current, files, predicate) {
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    const name = path.basename(current);
    if (name === 'node_modules' || name === '.git') return;
    fs.readdirSync(current).forEach(entry => walk(path.join(current, entry), files, predicate));
    return;
  }
  if (predicate(current)) files.push(current);
}
