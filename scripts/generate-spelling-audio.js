const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');
const wordListPath = path.join(repoRoot, 'assets', 'spelling-word-list.js');
const outputDir = path.join(repoRoot, 'assets', 'audio', 'spelling');
const manifestPath = path.join(repoRoot, 'assets', 'spelling-audio-manifest.js');
const voice = process.env.SPELLING_AUDIO_VOICE || 'Sandy (English (US))';

const pronunciationPrompts = {
  bureau: 'byoo roh',
  colonel: 'kernel',
  quay: 'key',
  snarled: 'snarld'
};

function loadWordBank() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(wordListPath, 'utf8'), context, { filename: wordListPath });
  return context.window.SPELLING_WORD_BANK;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout || result.status}`);
  }
}

function quoteJs(value) {
  return JSON.stringify(value);
}

function main() {
  const bank = loadWordBank();
  if (!bank || !Array.isArray(bank.questions)) {
    throw new Error('Could not load SPELLING_WORD_BANK.questions');
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const entries = new Map();
  for (const question of bank.questions) {
    const word = String(question.word || '').trim();
    if (!word) continue;
    const key = slugify(word);
    if (entries.has(key)) continue;
    const prompt = pronunciationPrompts[key] || word;
    const basename = `${key}.wav`;
    const aiffPath = path.join(outputDir, `${key}.aiff`);
    const wavPath = path.join(outputDir, basename);
    run('say', ['-v', voice, '-o', aiffPath, prompt]);
    run('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', aiffPath, wavPath]);
    fs.rmSync(aiffPath, { force: true });
    entries.set(key, {
      word,
      src: `../../assets/audio/spelling/${basename}`,
      voice,
      prompt
    });
  }

  const manifest = [
    '(function () {',
    '  "use strict";',
    '  window.SPELLING_AUDIO_MANIFEST = {',
    `    generatedAt: ${quoteJs(new Date().toISOString())},`,
    `    voice: ${quoteJs(voice)},`,
    '    format: "wav",',
    '    entries: {',
    Array.from(entries.entries())
      .map(([key, entry]) => `      ${quoteJs(key)}: ${JSON.stringify(entry)}`)
      .join(',\n'),
    '    }',
    '  };',
    '})();',
    ''
  ].join('\n');
  fs.writeFileSync(manifestPath, manifest);
  console.log(`Generated ${entries.size} spelling audio files with ${voice}.`);
}

main();
