/**
 * Grammar Quest Character Catalog
 * Original illustrated companion sets for quiz questions and feedback.
 */
(function () {
  'use strict';

  const characterSetStorageKey = 'grammarQuestCharacterSet';
  const characterNameStorageKey = 'grammarQuestCharacterNames';
  const petNameStorageKey = 'grammarQuestPetNames';
  const expressionPresets = {
    curious: { eyes: 'open', brows: 'lift', mouth: 'smile', cheeks: true, tilt: -1 },
    confident: { eyes: 'open', brows: 'calm', mouth: 'grin', cheeks: true, tilt: 0 },
    puzzled: { eyes: 'squint', brows: 'quirk', mouth: 'hmm', cheeks: false, tilt: -4 },
    coaching: { eyes: 'open', brows: 'soft', mouth: 'talk', cheeks: true, tilt: 1 },
    celebrate: { eyes: 'happy', brows: 'lift', mouth: 'bigSmile', cheeks: true, tilt: 0 },
    surprised: { eyes: 'wide', brows: 'high', mouth: 'oh', cheeks: true, tilt: -2 },
    delighted: { eyes: 'happy', brows: 'lift', mouth: 'bigSmile', cheeks: true, tilt: 2 },
    thinking: { eyes: 'side', brows: 'soft', mouth: 'line', cheeks: false, tilt: -2 },
    focused: { eyes: 'open', brows: 'focus', mouth: 'line', cheeks: false, tilt: 0 },
    worried: { eyes: 'wide', brows: 'worry', mouth: 'smallFrown', cheeks: false, tilt: -2 },
    brave: { eyes: 'open', brows: 'focus', mouth: 'grin', cheeks: true, tilt: 1 },
    gentle: { eyes: 'soft', brows: 'soft', mouth: 'softSmile', cheeks: true, tilt: 0 },
    excited: { eyes: 'happy', brows: 'high', mouth: 'openSmile', cheeks: true, tilt: 2 },
    amused: { eyes: 'wink', brows: 'calm', mouth: 'smirk', cheeks: true, tilt: 1 },
    determined: { eyes: 'open', brows: 'focus', mouth: 'firmSmile', cheeks: false, tilt: 0 },
    proud: { eyes: 'happy', brows: 'calm', mouth: 'grin', cheeks: true, tilt: 2 },
    unsure: { eyes: 'side', brows: 'worry', mouth: 'hmm', cheeks: false, tilt: -3 },
    amazed: { eyes: 'wide', brows: 'high', mouth: 'oh', cheeks: true, tilt: 1 },
    calm: { eyes: 'soft', brows: 'calm', mouth: 'softSmile', cheeks: true, tilt: 0 },
    silly: { eyes: 'wink', brows: 'quirk', mouth: 'smirk', cheeks: true, tilt: 3 },
    reading: { eyes: 'down', brows: 'soft', mouth: 'softSmile', cheeks: false, tilt: -1 },
    whispering: { eyes: 'side', brows: 'soft', mouth: 'smallTalk', cheeks: true, tilt: 0 },
    urgent: { eyes: 'wide', brows: 'focus', mouth: 'openTalk', cheeks: false, tilt: -1 },
    relieved: { eyes: 'happy', brows: 'soft', mouth: 'softSmile', cheeks: true, tilt: 0 }
  };

  const characterSets = [
    {
      id: 'clue-crew',
      name: 'The Clue Crew',
      tone: 'kid mystery notebook',
      palette: ['#2563eb', '#f97316', '#14b8a6'],
      characters: [
        {
          id: 'mina-mapwise',
          name: 'Mina Mapwise',
          role: 'sentence sleuth',
          pronouns: 'she/her',
          backstory: 'Mina keeps a pocket map of every story path she has solved. She spots clues by asking what each sentence is trying to do.',
          emotions: {
            curious: 'leans toward the clue board',
            confident: 'holds up a solved case card',
            puzzled: 'studies two almost-right clues',
            coaching: 'points to the deciding word',
            celebrate: 'marks the case solved'
          },
          accent: '#2563eb',
          secondary: '#f97316',
          skin: '#f6c7a7',
          hair: '#3f2b1f',
          outfit: '#1d4ed8',
          prop: 'map',
          pet: {
            id: 'pickle',
            name: 'Pickle',
            species: 'clue pup',
            color: '#f59e0b',
            accent: '#7c2d12',
            backstory: 'Pickle sniffs out hidden clue words and taps the right sentence with one paw.'
          }
        },
        {
          id: 'jo-pocket',
          name: 'Jo Pocket',
          role: 'detail collector',
          pronouns: 'they/them',
          backstory: 'Jo carries tiny envelopes for evidence: commas, capitals, word endings, and every sneaky exception.',
          emotions: {
            curious: 'sorts clues by pattern',
            confident: 'snaps the right clue into place',
            puzzled: 'checks the evidence twice',
            coaching: 'offers one clue at a time',
            celebrate: 'opens the victory envelope'
          },
          accent: '#14b8a6',
          secondary: '#facc15',
          skin: '#8f5f3e',
          hair: '#111827',
          outfit: '#0f766e',
          prop: 'envelope',
          pet: {
            id: 'button',
            name: 'Button',
            species: 'pocket hedgehog',
            color: '#a16207',
            accent: '#fef3c7',
            backstory: 'Button curls into a tiny comma shape whenever a sentence needs a pause.'
          }
        }
      ]
    },
    {
      id: 'sky-scrolls',
      name: 'Sky Scrolls',
      tone: 'bright dragon-adventure classroom',
      palette: ['#7c3aed', '#22c55e', '#f97316'],
      characters: [
        {
          id: 'ember-comma',
          name: 'Ember Comma',
          role: 'punctuation dragon',
          pronouns: 'she/her',
          backstory: 'Ember guards a warm cave of glowing punctuation marks. She believes every pause has a purpose.',
          emotions: {
            curious: 'tilts her horns at a clue',
            confident: 'fans her wings around the answer',
            puzzled: 'curls her tail into a question mark',
            coaching: 'breathes a small spark under the hint',
            celebrate: 'lights the scroll lanterns'
          },
          accent: '#ef4444',
          secondary: '#f97316',
          wing: '#fb923c',
          belly: '#fed7aa',
          prop: 'scroll',
          pet: {
            id: 'sparklet',
            name: 'Sparklet',
            species: 'ember moth',
            color: '#f97316',
            accent: '#fde68a',
            backstory: 'Sparklet glows brighter when a sentence has strong feeling.'
          }
        },
        {
          id: 'azure-quill',
          name: 'Azure Quill',
          role: 'vocabulary sky-dragon',
          pronouns: 'he/him',
          backstory: 'Azure collects rare words from cloud libraries and tests each one in a sentence before adding it to his hoard.',
          emotions: {
            curious: 'sniffs out a hidden meaning',
            confident: 'circles the best word',
            puzzled: 'balances two word choices',
            coaching: 'traces the context clue',
            celebrate: 'sends a word flare upward'
          },
          accent: '#2563eb',
          secondary: '#06b6d4',
          wing: '#38bdf8',
          belly: '#bfdbfe',
          prop: 'quill',
          pet: {
            id: 'cloudpip',
            name: 'Cloudpip',
            species: 'sky fish',
            color: '#38bdf8',
            accent: '#e0f2fe',
            backstory: 'Cloudpip floats beside tricky words and bubbles up context clues.'
          }
        }
      ]
    },
    {
      id: 'cipher-school',
      name: 'Cipher School',
      tone: 'student spy academy',
      palette: ['#111827', '#16a34a', '#f59e0b'],
      characters: [
        {
          id: 'dex-decoder',
          name: 'Dex Decoder',
          role: 'grammar gadgeteer',
          pronouns: 'he/him',
          backstory: 'Dex builds grammar gadgets out of old headphones, flash cards, and a very stubborn calculator.',
          emotions: {
            curious: 'scans the sentence for signals',
            confident: 'locks onto the rule',
            puzzled: 'runs a second scan',
            coaching: 'projects the next clue',
            celebrate: 'stamps the mission complete'
          },
          accent: '#16a34a',
          secondary: '#f59e0b',
          skin: '#c9865b',
          hair: '#1f2937',
          outfit: '#111827',
          prop: 'scanner',
          pet: {
            id: 'pixel',
            name: 'Pixel',
            species: 'code cat',
            color: '#111827',
            accent: '#22c55e',
            backstory: 'Pixel blinks green when the grammar signal is locked in.'
          }
        },
        {
          id: 'piper-prism',
          name: 'Piper Prism',
          role: 'reading-code analyst',
          pronouns: 'she/her',
          backstory: 'Piper turns reading passages into color-coded mission boards. Her favorite trick is proving an answer with text evidence.',
          emotions: {
            curious: 'splits the clue into colors',
            confident: 'matches proof to answer',
            puzzled: 'checks which clue belongs',
            coaching: 'slides the proof into view',
            celebrate: 'activates the prism badge'
          },
          accent: '#7c3aed',
          secondary: '#06b6d4',
          skin: '#9f6a4d',
          hair: '#4c1d95',
          outfit: '#312e81',
          prop: 'prism',
          pet: {
            id: 'glimmer',
            name: 'Glimmer',
            species: 'prism bunny',
            color: '#7c3aed',
            accent: '#67e8f9',
            backstory: 'Glimmer splits big reading clues into little colors that are easier to follow.'
          }
        }
      ]
    }
  ];

  const conceptMap = [
    { match: /punctuation|comma|apostrophe|quotation|period|colon|abbreviation/i, title: 'Punctuation Clue', icon: '?!' },
    { match: /capital|proper|title|holiday|place|sentence-beginning/i, title: 'Capital Clue', icon: 'Aa' },
    { match: /vocabulary|word|synonym|antonym|homophone|meaning|spelling|syllable|prefix|suffix/i, title: 'Word Clue', icon: 'W' },
    { match: /reading|inference|theme|evidence|author|main idea|story|compare|fact|opinion/i, title: 'Reading Clue', icon: 'R' },
    { match: /grammar|sentence|noun|verb|adjective|adverb|pronoun|tense|subject|predicate|clause/i, title: 'Grammar Clue', icon: 'G' }
  ];

  function getQuestionScene({ question, set, index = 0, mode = 'question', isCorrect = false }) {
    const source = [
      question && question.metadata && question.metadata.sourceSet,
      set && set.topic,
      set && set.title,
      question && question.question
    ].filter(Boolean).join(' ');
    const concept = conceptMap.find(item => item.match.test(source)) || { title: 'Quest Clue', icon: '*' };
    const selectedSet = getResolvedCharacterSet(source || 'quest', index);
    const character = selectedSet.characters[index % selectedSet.characters.length];
    const emotion = mode === 'feedback'
      ? (isCorrect ? 'celebrate' : 'coaching')
      : chooseQuestionEmotion(question, index);

    return {
      set: selectedSet,
      character,
      emotion,
      concept,
      prompt: buildPrompt(question, concept, mode, isCorrect),
      detail: buildDetail(question, mode, isCorrect)
    };
  }

  function chooseQuestionEmotion(question, index) {
    const text = (question && question.question) || '';
    if (/\?|which|choose|what/i.test(text)) return index % 2 ? 'puzzled' : 'curious';
    return 'confident';
  }

  function buildPrompt(question, concept, mode, isCorrect) {
    if (mode === 'feedback') {
      return isCorrect
        ? 'Case solved. The clue matches the rule.'
        : 'Try the clue path again. One detail will unlock it.';
    }
    const verb = concept.title === 'Reading Clue' ? 'prove' : 'test';
    return `${verb[0].toUpperCase()}${verb.slice(1)} the answer with the strongest ${concept.title.toLowerCase()}.`;
  }

  function buildDetail(question, mode, isCorrect) {
    if (mode === 'feedback') {
      return isCorrect
        ? 'Keep naming the rule before you move on.'
        : 'Compare each choice to the rule, then remove the choices that do not fit.';
    }
    const skills = question && question.metadata && Array.isArray(question.metadata.skills)
      ? question.metadata.skills.slice(0, 2).join(' + ')
      : '';
    if (skills) return `Mission focus: ${skills}.`;
    return 'Look for the clue that changes the meaning or job of the sentence.';
  }

  function renderSceneCard(options) {
    const scene = getQuestionScene(options || {});
    const characterName = getCharacterDisplayName(scene.character);
    const label = `${characterName}, ${scene.character.role}`;
    return `
      <section class="question-scene" aria-label="${escapeHtml(label)}">
        <div class="question-scene-art">
          ${renderCharacter(scene.character, scene.set, scene.emotion)}
          ${renderPet(scene.character.pet, 'curious')}
        </div>
        <div class="question-scene-copy">
          <div class="question-scene-meta">
            <span>${escapeHtml(scene.set.name)}</span>
            <span>${escapeHtml(characterName)}</span>
          </div>
          <div class="question-scene-title">
            <span class="question-scene-icon" aria-hidden="true">${escapeHtml(scene.concept.icon)}</span>
            <span>${escapeHtml(scene.concept.title)}</span>
          </div>
          <p>${escapeHtml(scene.prompt)}</p>
          <p class="question-scene-detail">${escapeHtml(scene.detail)}</p>
          <details class="character-backstory">
            <summary>Character note</summary>
            <p>${escapeHtml(scene.character.backstory)}</p>
          </details>
        </div>
      </section>
    `;
  }

  function renderCharacter(character, set, emotion) {
    if (set.id === 'sky-scrolls') return renderDragon(character, emotion);
    return renderStudent(character, emotion);
  }

  function getCharacterById(id) {
    for (const set of characterSets) {
      const character = set.characters.find(item => item.id === id);
      if (character) return { set, character };
    }
    return null;
  }

  function getCharacterForSlot(slot, fallbackId) {
    const selectedSet = getSelectedCharacterSet();
    if (selectedSet) {
      return {
        set: selectedSet,
        character: selectedSet.characters[Math.abs(slot || 0) % selectedSet.characters.length]
      };
    }
    const fallback = getCharacterById(fallbackId);
    if (fallback) return fallback;
    const autoSet = getResolvedCharacterSet(fallbackId || 'quest', slot || 0);
    return {
      set: autoSet,
      character: autoSet.characters[Math.abs(slot || 0) % autoSet.characters.length]
    };
  }

  function getResolvedCharacterSet(seed, index) {
    const selectedSet = getSelectedCharacterSet();
    if (selectedSet) return selectedSet;
    const setIndex = Math.abs(hashString(seed) + index) % characterSets.length;
    return characterSets[setIndex];
  }

  function getSelectedCharacterSetId() {
    let stored = 'auto';
    try {
      stored = window.localStorage.getItem(characterSetStorageKey) || 'auto';
    } catch (err) {
      stored = 'auto';
    }
    return stored === 'auto' || characterSets.some(set => set.id === stored) ? stored : 'auto';
  }

  function getSelectedCharacterSet() {
    const selectedId = getSelectedCharacterSetId();
    if (selectedId === 'auto') return null;
    return characterSets.find(set => set.id === selectedId) || null;
  }

  function setSelectedCharacterSetId(setId) {
    const normalized = setId === 'auto' || characterSets.some(set => set.id === setId) ? setId : 'auto';
    try {
      window.localStorage.setItem(characterSetStorageKey, normalized);
    } catch (err) {
      return normalized;
    }
    return normalized;
  }

  function getCustomizationMap(storageKey) {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey)) || {};
    } catch (err) {
      return {};
    }
  }

  function setCustomizationName(storageKey, id, value) {
    const map = getCustomizationMap(storageKey);
    const clean = String(value || '').trim();
    if (clean) map[id] = clean;
    else delete map[id];
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(map));
    } catch (err) {
      return;
    }
  }

  function getCharacterDisplayName(character) {
    if (!character) return '';
    return getCustomizationMap(characterNameStorageKey)[character.id] || character.name;
  }

  function getPetDisplayName(pet) {
    if (!pet) return '';
    return getCustomizationMap(petNameStorageKey)[pet.id] || pet.name;
  }

  function setCharacterDisplayName(characterId, value) {
    setCustomizationName(characterNameStorageKey, characterId, value);
  }

  function setPetDisplayName(petId, value) {
    setCustomizationName(petNameStorageKey, petId, value);
  }

  function resetCustomNames() {
    try {
      window.localStorage.removeItem(characterNameStorageKey);
      window.localStorage.removeItem(petNameStorageKey);
    } catch (err) {
      return;
    }
  }

  function renderStudent(character, emotion) {
    const svgId = `${character.id}-${emotion}`;
    const expression = getExpression(emotion);
    const face = getStudentFace(expression);
    const label = getCharacterDisplayName(character) || character.name;
    const armLeft = emotion === 'celebrate' ? 'M57 119 C36 103 31 82 39 68' : 'M58 120 C40 126 31 139 28 155';
    const armRight = emotion === 'coaching' ? 'M102 120 C121 111 134 101 146 87' : 'M101 120 C119 130 128 142 132 157';
    return `
      <svg class="character-svg" viewBox="0 0 180 190" role="img" aria-label="${escapeHtml(label)} ${escapeHtml(emotion)} illustration">
        <defs>
          <linearGradient id="${svgId}-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${character.accent}" stop-opacity="0.2" />
            <stop offset="1" stop-color="${character.secondary}" stop-opacity="0.22" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="95" r="82" fill="url(#${svgId}-bg)" />
        <path d="${armLeft}" fill="none" stroke="${character.skin}" stroke-width="13" stroke-linecap="round" />
        <path d="${armRight}" fill="none" stroke="${character.skin}" stroke-width="13" stroke-linecap="round" />
        <path d="M55 122 C62 104 95 101 105 122 L114 171 L45 171 Z" fill="${character.outfit}" />
        <path d="M59 126 L99 126 L94 152 L66 152 Z" fill="${character.accent}" opacity="0.34" />
        <circle cx="80" cy="71" r="36" fill="${character.skin}" />
        <path d="M45 70 C45 38 66 22 91 30 C115 38 123 60 113 77 C101 57 77 48 49 67 Z" fill="${character.hair}" />
        ${face}
        ${renderStudentProp(character)}
      </svg>
    `;
  }

  function getExpression(emotion) {
    return expressionPresets[emotion] || expressionPresets.curious;
  }

  function getStudentFace(expression) {
    const eyeMap = {
      open: '<circle cx="68" cy="73" r="4" fill="#111827" /><circle cx="92" cy="73" r="4" fill="#111827" />',
      wide: '<circle cx="68" cy="73" r="6" fill="#ffffff" /><circle cx="92" cy="73" r="6" fill="#ffffff" /><circle cx="68" cy="73" r="3" fill="#111827" /><circle cx="92" cy="73" r="3" fill="#111827" />',
      happy: '<path d="M63 73 Q68 68 73 73" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" /><path d="M87 73 Q92 68 97 73" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" />',
      squint: '<path d="M63 73 H73" stroke="#111827" stroke-width="4" stroke-linecap="round" /><path d="M87 73 H97" stroke="#111827" stroke-width="4" stroke-linecap="round" />',
      side: '<circle cx="68" cy="73" r="5" fill="#ffffff" /><circle cx="92" cy="73" r="5" fill="#ffffff" /><circle cx="70" cy="73" r="3" fill="#111827" /><circle cx="94" cy="73" r="3" fill="#111827" />',
      soft: '<path d="M63 72 Q68 75 73 72" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" /><path d="M87 72 Q92 75 97 72" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" />',
      wink: '<path d="M62 72 H73" stroke="#111827" stroke-width="4" stroke-linecap="round" /><circle cx="92" cy="73" r="4" fill="#111827" />',
      down: '<path d="M63 73 Q68 77 73 73" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" /><path d="M87 73 Q92 77 97 73" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" />'
    };
    const browMap = {
      lift: ['M62 61 L73 58', 'M87 58 L99 61'],
      calm: ['M62 61 H74', 'M87 61 H99'],
      quirk: ['M62 59 L73 63', 'M87 63 L99 59'],
      soft: ['M62 62 Q68 59 74 62', 'M87 62 Q93 59 99 62'],
      high: ['M62 56 L74 55', 'M87 55 L99 56'],
      focus: ['M62 59 L74 62', 'M87 62 L99 59'],
      worry: ['M62 64 L74 58', 'M87 58 L99 64']
    };
    const mouthMap = {
      smile: 'M69 84 Q80 94 92 84',
      grin: 'M67 84 Q80 98 94 84',
      bigSmile: 'M66 82 Q80 102 96 82',
      hmm: 'M70 87 Q80 82 90 87',
      talk: 'M72 85 Q80 91 89 85',
      smallTalk: 'M73 86 Q80 89 87 86',
      openTalk: 'M72 84 Q80 96 89 84',
      line: 'M70 87 H91',
      smallFrown: 'M70 90 Q80 84 91 90',
      softSmile: 'M70 85 Q80 92 91 85',
      openSmile: 'M68 83 Q80 99 94 83',
      smirk: 'M70 86 Q80 94 91 88',
      firmSmile: 'M69 85 Q80 90 92 85',
      oh: 'M80 84 C88 84 88 96 80 96 C72 96 72 84 80 84'
    };
    const brows = browMap[expression.brows] || browMap.calm;
    const mouth = mouthMap[expression.mouth] || mouthMap.smile;
    const mouthFill = expression.mouth === 'oh' ? 'fill="#7c2d12"' : 'fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"';
    return `
      ${expression.cheeks ? '<circle cx="59" cy="82" r="4" fill="#ef4444" opacity="0.2" /><circle cx="101" cy="82" r="4" fill="#ef4444" opacity="0.2" />' : ''}
      ${eyeMap[expression.eyes] || eyeMap.open}
      <path d="${brows[0]}" stroke="#111827" stroke-width="3" stroke-linecap="round" />
      <path d="${brows[1]}" stroke="#111827" stroke-width="3" stroke-linecap="round" />
      <path d="${mouth}" ${mouthFill} />
    `;
  }

  function renderStudentProp(character) {
    if (character.prop === 'map') {
      return '<path d="M118 74 L156 62 L153 111 L116 123 Z" fill="#fef3c7" stroke="#92400e" stroke-width="4" /><path d="M127 76 C134 84 133 98 145 105" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" /><circle cx="145" cy="86" r="4" fill="#ef4444" />';
    }
    if (character.prop === 'envelope') {
      return '<path d="M116 85 L158 85 L158 116 L116 116 Z" fill="#fef9c3" stroke="#a16207" stroke-width="4" /><path d="M117 87 L137 103 L157 87" fill="none" stroke="#a16207" stroke-width="3" />';
    }
    if (character.prop === 'scanner') {
      return '<rect x="119" y="78" width="38" height="52" rx="8" fill="#111827" stroke="#16a34a" stroke-width="4" /><circle cx="138" cy="101" r="10" fill="#22c55e" opacity="0.82" /><path d="M128 101 L148 101 M138 91 L138 111" stroke="#dcfce7" stroke-width="3" />';
    }
    return '<path d="M122 76 L159 98 L122 120 L101 98 Z" fill="#ede9fe" stroke="#7c3aed" stroke-width="4" /><path d="M122 76 L122 120 M101 98 L159 98" stroke="#06b6d4" stroke-width="3" opacity="0.8" />';
  }

  function renderDragon(character, emotion) {
    const svgId = `${character.id}-${emotion}`;
    const expression = getExpression(emotion);
    const face = getDragonFace(expression);
    const tail = emotion === 'puzzled' ? 'M43 137 C18 143 16 113 36 116' : 'M44 139 C18 153 10 130 29 119';
    const label = getCharacterDisplayName(character) || character.name;
    return `
      <svg class="character-svg" viewBox="0 0 190 190" role="img" aria-label="${escapeHtml(label)} ${escapeHtml(emotion)} illustration">
        <defs>
          <linearGradient id="${svgId}-scale" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${character.accent}" />
            <stop offset="1" stop-color="${character.secondary}" />
          </linearGradient>
        </defs>
        <circle cx="95" cy="95" r="82" fill="${character.wing}" opacity="0.16" />
        <path d="${tail}" fill="none" stroke="${character.accent}" stroke-width="16" stroke-linecap="round" />
        <path d="M50 122 C40 83 77 49 117 66 C150 80 154 128 127 153 C102 176 62 160 50 122 Z" fill="url(#${svgId}-scale)" />
        <path d="M82 113 C94 126 111 124 121 111 L119 153 L78 153 Z" fill="${character.belly}" opacity="0.86" />
        <path d="M52 109 C19 85 28 54 67 72" fill="${character.wing}" stroke="${character.accent}" stroke-width="5" />
        <path d="M126 106 C170 77 164 47 124 70" fill="${character.wing}" stroke="${character.accent}" stroke-width="5" />
        <path d="M73 49 L64 24 L88 43 Z" fill="${character.secondary}" />
        <path d="M111 51 L128 29 L124 58 Z" fill="${character.secondary}" />
        ${face}
        ${renderDragonProp(character)}
      </svg>
    `;
  }

  function getDragonFace(expression) {
    const eyeMap = {
      open: '<path d="M67 76 L78 76" stroke="#111827" stroke-width="5" stroke-linecap="round" /><path d="M104 76 L115 76" stroke="#111827" stroke-width="5" stroke-linecap="round" />',
      wide: '<circle cx="73" cy="76" r="7" fill="#ffffff" /><circle cx="109" cy="76" r="7" fill="#ffffff" /><circle cx="73" cy="76" r="3" fill="#111827" /><circle cx="109" cy="76" r="3" fill="#111827" />',
      happy: '<path d="M66 76 Q73 70 80 76" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" /><path d="M102 76 Q109 70 116 76" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" />',
      squint: '<path d="M67 76 Q72 72 78 76" stroke="#111827" stroke-width="5" stroke-linecap="round" fill="none" /><path d="M104 76 Q109 72 115 76" stroke="#111827" stroke-width="5" stroke-linecap="round" fill="none" />',
      side: '<circle cx="73" cy="76" r="6" fill="#ffffff" /><circle cx="109" cy="76" r="6" fill="#ffffff" /><circle cx="76" cy="76" r="3" fill="#111827" /><circle cx="112" cy="76" r="3" fill="#111827" />',
      soft: '<path d="M67 75 Q73 79 79 75" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" /><path d="M103 75 Q109 79 116 75" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" />',
      wink: '<path d="M66 76 H80" stroke="#111827" stroke-width="5" stroke-linecap="round" /><path d="M104 76 L115 76" stroke="#111827" stroke-width="5" stroke-linecap="round" />',
      down: '<path d="M67 77 Q73 81 79 77" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" /><path d="M103 77 Q109 81 116 77" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" />'
    };
    const mouthMap = {
      smile: 'M75 98 Q91 104 106 98',
      grin: 'M72 96 Q91 110 110 96',
      bigSmile: 'M70 96 Q91 116 112 96',
      hmm: 'M76 101 Q91 95 106 101',
      talk: 'M78 98 Q91 107 104 98',
      smallTalk: 'M80 99 Q91 104 102 99',
      openTalk: 'M78 97 Q91 113 104 97',
      line: 'M78 101 H105',
      smallFrown: 'M76 104 Q91 96 106 104',
      softSmile: 'M76 98 Q91 106 106 98',
      openSmile: 'M74 96 Q91 114 108 96',
      smirk: 'M76 99 Q91 108 106 101',
      firmSmile: 'M76 98 Q91 103 106 98',
      oh: 'M91 96 C101 96 101 111 91 111 C81 111 81 96 91 96'
    };
    const mouth = mouthMap[expression.mouth] || mouthMap.smile;
    const mouthFill = expression.mouth === 'oh' ? 'fill="#7f1d1d"' : 'fill="none" stroke="#7f1d1d" stroke-width="5" stroke-linecap="round"';
    return `
      ${expression.cheeks ? '<circle cx="61" cy="88" r="6" fill="#fecaca" opacity="0.22" /><circle cx="119" cy="88" r="6" fill="#fecaca" opacity="0.22" />' : ''}
      ${eyeMap[expression.eyes] || eyeMap.open}
      <path d="${mouth}" ${mouthFill} />
    `;
  }

  function renderPet(pet, mood) {
    if (!pet) return '';
    const label = getPetDisplayName(pet) || pet.name;
    const bounce = mood === 'celebrate' || mood === 'excited' ? 'M36 82 Q50 66 64 82' : 'M36 78 Q50 72 64 78';
    return `
      <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(label)} ${escapeHtml(pet.species)}">
        <circle cx="50" cy="54" r="36" fill="${pet.color}" opacity="0.22" />
        <ellipse cx="50" cy="58" rx="27" ry="22" fill="${pet.color}" />
        <circle cx="36" cy="40" r="10" fill="${pet.color}" />
        <circle cx="64" cy="40" r="10" fill="${pet.color}" />
        <circle cx="41" cy="56" r="3" fill="#111827" />
        <circle cx="59" cy="56" r="3" fill="#111827" />
        <path d="${bounce}" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" />
        <path d="M50 64 Q48 67 45 64 M50 64 Q52 67 55 64" fill="none" stroke="${pet.accent}" stroke-width="3" stroke-linecap="round" />
        <path d="M24 67 C8 74 14 90 33 84" fill="none" stroke="${pet.accent}" stroke-width="7" stroke-linecap="round" />
      </svg>
    `;
  }

  function renderDragonProp(character) {
    if (character.prop === 'quill') {
      return '<path d="M132 116 C157 97 166 78 162 58 C146 64 131 81 119 110 Z" fill="#e0f2fe" stroke="#075985" stroke-width="4" /><path d="M122 111 L162 61" stroke="#075985" stroke-width="3" />';
    }
    return '<path d="M122 117 L164 117 C171 117 171 145 164 145 L122 145 Z" fill="#fef3c7" stroke="#92400e" stroke-width="4" /><path d="M130 127 L156 127 M130 136 L149 136" stroke="#92400e" stroke-width="3" stroke-linecap="round" />';
  }

  function hashString(value) {
    return String(value).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.GrammarQuestCharacters = {
    sets: characterSets,
    getSelectedCharacterSetId,
    getSelectedCharacterSet,
    setSelectedCharacterSetId,
    getCharacterById,
    getCharacterForSlot,
    getCharacterDisplayName,
    getPetDisplayName,
    setCharacterDisplayName,
    setPetDisplayName,
    resetCustomNames,
    expressionPresets,
    expressionNames: Object.keys(expressionPresets),
    getQuestionScene,
    renderCharacter,
    renderPet,
    renderSceneCard
  };
})();
