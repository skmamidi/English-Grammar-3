const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadSpellingLabTestApi() {
  const context = {
    window: {
      SPELLING_WORD_BANK: { title: 'Sound/Symbol Spelling Lab', topic: 'Sound/Symbol Correspondences', questions: [] },
      SPELLING_AUDIO_MANIFEST: {
        entries: {
          snarl: {
            src: '../../assets/audio/spelling/snarl.wav',
            normalSrc: '../../assets/audio/spelling/snarl.wav',
            slowSrc: '../../assets/audio/spelling/snarl-slow.wav'
          }
        }
      },
      GrammarQuestProgress: null,
      location: { pathname: '/topics/sound-symbols/index.html', href: 'http://127.0.0.1/topics/sound-symbols/index.html' },
      addEventListener() {},
      clearTimeout() {},
      setTimeout() {
        return 0;
      }
    },
    document: {
      addEventListener() {},
      getElementById() {
        return null;
      },
      createElement() {
        return { textContent: '', innerHTML: '' };
      },
      querySelectorAll() {
        return [];
      }
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      vendor: 'Apple Computer, Inc.',
      platform: 'MacIntel',
      maxTouchPoints: 0
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) {
      this.text = text;
    },
    console
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.navigator = context.navigator;
  context.window.localStorage = context.localStorage;
  context.window.SpeechSynthesisUtterance = context.SpeechSynthesisUtterance;
  context.window.speechSynthesis = {
    cancel() {},
    speak() {},
    getVoices() {
      return [];
    },
    addEventListener() {}
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets', 'spelling-trainer.js'), 'utf8'),
    context,
    { filename: 'assets/spelling-trainer.js' }
  );
  return context.window.GrammarQuestSpellingLabTestApi;
}

function loadWordBankAndAudioManifest() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets', 'spelling-word-list.js'), 'utf8'),
    context,
    { filename: 'assets/spelling-word-list.js' }
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets', 'spelling-audio-manifest.js'), 'utf8'),
    context,
    { filename: 'assets/spelling-audio-manifest.js' }
  );
  return {
    bank: context.window.SPELLING_WORD_BANK,
    manifest: context.window.SPELLING_AUDIO_MANIFEST
  };
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getWavDurationSeconds(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${filePath} should be a RIFF file`);
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${filePath} should be a WAVE file`);
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

test('word playback uses two clean utterances with a natural Safari repeat gap', () => {
  const api = loadSpellingLabTestApi();
  const plan = api.createWordPlaybackPlanForTest('brilliant');

  assert.deepEqual(Array.from(plan.texts), ['brilliant', 'brilliant']);
  assert.equal(plan.gapMs, 620);
  assert.ok(plan.gapMs >= 500, 'repeat gap should not collapse into a single glued utterance');
  assert.ok(plan.texts.every(text => !/^listen\b/i.test(text)), 'word audio should not say listen before the word');
  assert.ok(plan.texts.every(text => !/\.\s+\S+\./.test(text)), 'word audio should not combine both repeats into one utterance');
});

test('word playback prefers generated audio assets when a manifest entry exists', () => {
  const api = loadSpellingLabTestApi();
  const entry = api.getSpellingAudioEntryForTest({ word: 'snarl' });

  assert.equal(entry.src, '../../assets/audio/spelling/snarl.wav');
  assert.equal(entry.normalSrc, '../../assets/audio/spelling/snarl.wav');
  assert.equal(entry.slowSrc, '../../assets/audio/spelling/snarl-slow.wav');
});

test('Safari speech voice preference avoids novelty voices and prefers modern US voices', () => {
  const api = loadSpellingLabTestApi();
  const selected = api.getPreferredSafariSpeechVoiceForTest([
    { name: 'Fred', voiceURI: 'com.apple.speech.synthesis.voice.Fred', lang: 'en-US', localService: true, default: true },
    { name: 'Samantha', voiceURI: 'com.apple.speech.synthesis.voice.samantha', lang: 'en-US', localService: true, default: false },
    { name: 'Sandy (English (US))', voiceURI: 'com.apple.voice.compact.en-US.Sandy', lang: 'en-US', localService: true, default: false }
  ]);

  assert.equal(selected.name, 'Sandy (English (US))');
  assert.equal(api.isNoveltySpeechVoiceForTest('fred'), true);
});

test('pronunciation profile retunes browser-hostile words such as bureau', () => {
  const api = loadSpellingLabTestApi();
  const profile = api.getPronunciationProfileForTest({ word: 'bureau', syllables: 'bu-reau', patterns: ['vowel-team'] });

  assert.equal(profile.speech, 'byoo roh');
  assert.deepEqual(Array.from(profile.slow), ['byoo', 'roh']);
});

test('retry queue includes only words missed on the first attempt', () => {
  const api = loadSpellingLabTestApi();
  const words = [
    { word: 'bureau', clue: 'An office.', sentence: 'The travel ____ shared maps.', patterns: ['vowel-team'], syllables: 'bu-reau', memory: 'Bureau ends with eau.' },
    { word: 'answer', clue: 'A reply.', sentence: 'Give an ____.', patterns: ['silent-letter'], syllables: 'an-swer', memory: 'Answer hides a quiet w.' },
    { word: 'through', clue: 'In one side and out the other.', sentence: 'Walk ____ the door.', patterns: ['ough'], syllables: 'through', memory: 'Through has ough.' }
  ];
  const retryWords = api.getRetryWordsFromResultsForTest([
    { id: 'spelling-bureau', word: 'bureau', correct: false },
    { id: 'spelling-answer', word: 'answer', correct: true },
    { id: 'spelling-through', word: 'through', correct: false, repaired: true }
  ], words);

  assert.deepEqual(retryWords.map(word => word.word), ['bureau', 'through']);
});

test('generated spelling audio manifest covers every spelling lab word', () => {
  const { bank, manifest } = loadWordBankAndAudioManifest();
  const words = Array.from(new Set(bank.questions.map(question => slugify(question.word)).filter(Boolean)));
  const missing = words.filter(key => !manifest.entries[key]);
  const missingFiles = words.filter(key => {
    const entry = manifest.entries[key];
    if (!entry || !entry.normalSrc || !entry.slowSrc) return false;
    return [entry.normalSrc, entry.slowSrc].some(src => {
      const localPath = path.join(__dirname, '..', src.replace('../../', ''));
      return !fs.existsSync(localPath);
    });
  });
  const silentFiles = words.filter(key => {
    const entry = manifest.entries[key];
    if (!entry || !entry.normalSrc || !entry.slowSrc) return false;
    return [entry.normalSrc, entry.slowSrc].some(src => {
      const localPath = path.join(__dirname, '..', src.replace('../../', ''));
      return fs.existsSync(localPath) && fs.statSync(localPath).size < 8192;
    });
  });
  const tooFastSlowFiles = words.filter(key => {
    const entry = manifest.entries[key];
    if (!entry || !entry.normalSrc || !entry.slowSrc) return false;
    const normalPath = path.join(__dirname, '..', entry.normalSrc.replace('../../', ''));
    const slowPath = path.join(__dirname, '..', entry.slowSrc.replace('../../', ''));
    if (!fs.existsSync(normalPath) || !fs.existsSync(slowPath)) return false;
    return getWavDurationSeconds(slowPath) < getWavDurationSeconds(normalPath) * 1.18;
  });

  assert.equal(missing.length, 0, `Missing audio manifest entries: ${missing.slice(0, 10).join(', ')}`);
  assert.equal(missingFiles.length, 0, `Missing audio files: ${missingFiles.slice(0, 10).join(', ')}`);
  assert.equal(silentFiles.length, 0, `Silent or invalid audio files: ${silentFiles.slice(0, 10).join(', ')}`);
  assert.equal(tooFastSlowFiles.length, 0, `Slow audio too close to normal speed: ${tooFastSlowFiles.slice(0, 10).join(', ')}`);
});
