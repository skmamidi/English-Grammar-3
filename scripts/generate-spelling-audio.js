const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const wordListPath = path.join(repoRoot, 'assets', 'spelling-word-list.js');
const outputDir = path.join(repoRoot, 'assets', 'audio', 'spelling');
const manifestPath = path.join(repoRoot, 'assets', 'spelling-audio-manifest.js');
const envPath = path.join(repoRoot, '.env.local');

const model = process.env.SPELLING_AUDIO_MODEL || 'gpt-4o-mini-tts';
const voice = process.env.SPELLING_AUDIO_VOICE || 'marin';
const format = 'wav';
const minValidBytes = 8192;
const concurrency = Number.parseInt(process.env.SPELLING_AUDIO_CONCURRENCY || '3', 10);
const limit = Number.parseInt(process.env.SPELLING_AUDIO_LIMIT || '0', 10);
const onlyWord = normalizeKey(process.env.SPELLING_AUDIO_WORD || '');
const force = process.argv.includes('--force') || process.env.SPELLING_AUDIO_FORCE === '1';
const variant = String(process.env.SPELLING_AUDIO_VARIANT || 'all').toLowerCase();
const normalSpeed = Number.parseFloat(process.env.SPELLING_AUDIO_NORMAL_SPEED || '1');
const slowSpeed = Number.parseFloat(process.env.SPELLING_AUDIO_SLOW_SPEED || '0.62');
const minSlowRatio = Number.parseFloat(process.env.SPELLING_AUDIO_MIN_SLOW_RATIO || '1.18');
const fallbackSlowSpeeds = String(process.env.SPELLING_AUDIO_FALLBACK_SLOW_SPEEDS || '0.45,0.32,0.25')
  .split(',')
  .map(value => Number.parseFloat(value.trim()))
  .filter(Number.isFinite);

const pronunciationOverrides = {
  bureau: { pronunciation: 'byoo roh', ipa: '/BYOO-roh/ or /ˈbjʊroʊ/' },
  colonel: { pronunciation: 'kernel', ipa: '/KER-nuhl/ or /ˈkɝnəl/' },
  quay: { pronunciation: 'key', ipa: '/kee/ or /kiː/' },
  snarl: { pronunciation: 'snarl', ipa: '/snarl/ with the ar sound in car' },
  snarled: { pronunciation: 'snarld', ipa: '/snarld/ with the ar sound in car' }
};

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

function loadWordBank() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(wordListPath, 'utf8'), context, { filename: wordListPath });
  return context.window.SPELLING_WORD_BANK;
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function quoteJs(value) {
  return JSON.stringify(value);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidAudioFile(filePath) {
  try {
    return fs.statSync(filePath).size >= minValidBytes;
  } catch {
    return false;
  }
}

function getWavDurationSeconds(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filePath} is not a WAV file`);
  }
  const sampleRate = buffer.readUInt32LE(24);
  const channels = buffer.readUInt16LE(22);
  const bitsPerSample = buffer.readUInt16LE(34);
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    let chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      if (chunkSize === 0xffffffff) chunkSize = buffer.length - (offset + 8);
      return chunkSize / bytesPerSecond;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  throw new Error(`${filePath} has no WAV data chunk`);
}

function getQuestionSyllables(question) {
  return String(question.syllables || question.word || '')
    .split(/[-\s]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function getPronunciationDetails(question) {
  const key = normalizeKey(question.word);
  const override = pronunciationOverrides[key] || {};
  const syllables = getQuestionSyllables(question);
  return {
    spoken: override.pronunciation || question.pronunciation || question.word,
    ipa: override.ipa || '',
    syllables
  };
}

function buildInstructions(question, mode) {
  const details = getPronunciationDetails(question);
  const syllableText = details.syllables.length > 1 ? details.syllables.join(' - ') : '';
  const pronunciationLine = details.ipa
    ? `Pronunciation target: ${details.spoken}; ${details.ipa}.`
    : `Pronunciation target: ${details.spoken}.`;
  const syllableLine = syllableText ? `Syllables: ${syllableText}.` : '';
  const slowDuration = details.syllables.length > 1
    ? `${Math.max(2.2, details.syllables.length * 0.85).toFixed(1)} to ${(Math.max(2.6, details.syllables.length * 1.05)).toFixed(1)} seconds`
    : '2.0 to 2.6 seconds';

  if (mode === 'slow') {
    return [
      'You are recording a spelling practice word for elementary students.',
      'Say only the target word once. Do not add labels, definitions, introductions, spelling, or extra words.',
      pronunciationLine,
      syllableLine,
      'Use clear General American English.',
      `Speak much slower than normal, taking about ${slowDuration} for the word.`,
      'Use phonics-teacher pacing: stretch the main vowel sound, keep consonants crisp, and clearly finish the final sound.',
      'If the word has multiple syllables, add a brief natural pause between syllables.',
      'Keep the pronunciation natural and warm, but make the slow version obviously slower than a normal pronunciation.'
    ].filter(Boolean).join(' ');
  }

  return [
    'You are recording a spelling practice word for elementary students.',
    'Say only the target word once. Do not add labels, definitions, introductions, spelling, or extra words.',
    pronunciationLine,
    syllableLine,
    'Use clear General American English.',
    'Speak at a natural classroom pace with crisp consonants and clean vowel sounds.'
  ].filter(Boolean).join(' ');
}

function requestSpeech({ apiKey, input, instructions, speed }) {
  const payload = JSON.stringify({
    model,
    voice,
    input,
    instructions,
    response_format: format,
    speed
  });

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/speech',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks);
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body);
          return;
        }
        let message = body.toString('utf8');
        try {
          const parsed = JSON.parse(message);
          message = parsed.error && parsed.error.message || message;
        } catch {}
        const error = new Error(`OpenAI speech request failed (${response.statusCode}): ${message}`);
        error.statusCode = response.statusCode;
        reject(error);
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

async function writeSpeechFile({ apiKey, question, mode, filePath, forceFile, speedOverride }) {
  if (!forceFile && isValidAudioFile(filePath)) return 'skipped';

  const details = getPronunciationDetails(question);
  const input = details.spoken;
  const instructions = buildInstructions(question, mode);
  const speed = Number.isFinite(speedOverride) ? speedOverride : mode === 'slow' ? slowSpeed : normalSpeed;
  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const audio = await requestSpeech({ apiKey, input, instructions, speed });
      if (audio.length < minValidBytes) {
        throw new Error(`Generated ${audio.length} bytes, expected at least ${minValidBytes}`);
      }
      fs.writeFileSync(filePath, audio);
      return 'generated';
    } catch (error) {
      lastError = error;
      const retryable = !error.statusCode || error.statusCode === 429 || error.statusCode >= 500;
      if (!retryable || attempt === 4) break;
      await sleep(750 * attempt * attempt);
    }
  }

  throw lastError;
}

async function repairSlowVariantRatios({ apiKey, entriesByKey, questionsByKey }) {
  if (!minSlowRatio || !fallbackSlowSpeeds.length) return 0;

  let repairedCount = 0;
  for (const [key, entry] of entriesByKey.entries()) {
    const question = questionsByKey.get(key);
    const normalPath = path.join(repoRoot, entry.normalSrc.replace('../../', ''));
    const slowPath = path.join(repoRoot, entry.slowSrc.replace('../../', ''));
    const normalDuration = getWavDurationSeconds(normalPath);
    let slowDuration = getWavDurationSeconds(slowPath);
    if (slowDuration >= normalDuration * minSlowRatio) continue;

    for (const speed of fallbackSlowSpeeds) {
      await writeSpeechFile({
        apiKey,
        question,
        mode: 'slow',
        filePath: slowPath,
        forceFile: true,
        speedOverride: speed
      });
      slowDuration = getWavDurationSeconds(slowPath);
      entry.slowSpeed = speed;
      if (slowDuration >= normalDuration * minSlowRatio) {
        repairedCount += 1;
        console.log(`${key}: repaired slow ratio at speed ${speed}`);
        break;
      }
    }

    if (slowDuration < normalDuration * minSlowRatio) {
      throw new Error(`${key} slow audio is still too close to normal speed (${slowDuration.toFixed(2)}s vs ${normalDuration.toFixed(2)}s).`);
    }
  }
  return repairedCount;
}

async function runQueue(items, workerCount, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.max(1, workerCount) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Add it to .env.local or the shell environment.');
  }

  const bank = loadWordBank();
  if (!bank || !Array.isArray(bank.questions)) {
    throw new Error('Could not load SPELLING_WORD_BANK.questions');
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const uniqueQuestions = [];
  const seen = new Set();
  for (const question of bank.questions) {
    const word = String(question.word || '').trim();
    const key = normalizeKey(word);
    if (!key || seen.has(key)) continue;
    if (onlyWord && key !== onlyWord) continue;
    seen.add(key);
    uniqueQuestions.push({ ...question, word, key });
  }
  const selectedQuestions = limit > 0 ? uniqueQuestions.slice(0, limit) : uniqueQuestions;
  const entries = new Map();
  const questionsByKey = new Map();
  let generatedCount = 0;
  let skippedCount = 0;
  const generateNormal = variant === 'all' || variant === 'normal';
  const generateSlow = variant === 'all' || variant === 'slow';

  if (!['all', 'normal', 'slow'].includes(variant)) {
    throw new Error('SPELLING_AUDIO_VARIANT must be all, normal, or slow.');
  }

  await runQueue(selectedQuestions, concurrency, async question => {
    questionsByKey.set(question.key, question);
    const normalName = `${question.key}.wav`;
    const slowName = `${question.key}-slow.wav`;
    const normalPath = path.join(outputDir, normalName);
    const slowPath = path.join(outputDir, slowName);
    const normalResult = await writeSpeechFile({
      apiKey,
      question,
      mode: 'normal',
      filePath: normalPath,
      forceFile: force && generateNormal
    });
    const slowResult = await writeSpeechFile({
      apiKey,
      question,
      mode: 'slow',
      filePath: slowPath,
      forceFile: force && generateSlow
    });
    generatedCount += Number(normalResult === 'generated') + Number(slowResult === 'generated');
    skippedCount += Number(normalResult === 'skipped') + Number(slowResult === 'skipped');
    const details = getPronunciationDetails(question);
    entries.set(question.key, {
      word: question.word,
      src: `../../assets/audio/spelling/${normalName}`,
      normalSrc: `../../assets/audio/spelling/${normalName}`,
      slowSrc: `../../assets/audio/spelling/${slowName}`,
      model,
      voice,
      format,
      normalSpeed,
      slowSpeed,
      prompt: details.spoken,
      syllables: details.syllables
    });
    console.log(`${question.key}: ${normalResult}/${slowResult}`);
  });

  const repairedCount = generateSlow
    ? await repairSlowVariantRatios({ apiKey, entriesByKey: entries, questionsByKey })
    : 0;

  const manifestEntries = Array.from(entries.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `      ${quoteJs(key)}: ${JSON.stringify(entry)}`)
    .join(',\n');
  const manifest = [
    '(function () {',
    '  "use strict";',
    '  window.SPELLING_AUDIO_MANIFEST = {',
    `    generatedAt: ${quoteJs(new Date().toISOString())},`,
    `    model: ${quoteJs(model)},`,
    `    voice: ${quoteJs(voice)},`,
    `    format: ${quoteJs(format)},`,
    '    variants: ["normal", "slow"],',
    '    entries: {',
    manifestEntries,
    '    }',
    '  };',
    '})();',
    ''
  ].join('\n');
  fs.writeFileSync(manifestPath, manifest);
  console.log(`Generated manifest for ${entries.size} spelling words with ${model}/${voice}.`);
  console.log(`Audio files generated: ${generatedCount}; skipped: ${skippedCount}.`);
  if (repairedCount) console.log(`Slow variants repaired for teaching-speed contrast: ${repairedCount}.`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
