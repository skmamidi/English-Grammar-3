/**
 * Grammar Quest Character Catalog
 * Original illustrated companion sets for quiz questions and feedback.
 */
(function () {
  'use strict';

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
          prop: 'map'
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
          prop: 'envelope'
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
          prop: 'scroll'
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
          prop: 'quill'
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
          prop: 'scanner'
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
          prop: 'prism'
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
    const setIndex = Math.abs(hashString(source || 'quest') + index) % characterSets.length;
    const selectedSet = characterSets[setIndex];
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
    const label = `${scene.character.name}, ${scene.character.role}`;
    return `
      <section class="question-scene" aria-label="${escapeHtml(label)}">
        <div class="question-scene-art">
          ${renderCharacter(scene.character, scene.set, scene.emotion)}
        </div>
        <div class="question-scene-copy">
          <div class="question-scene-meta">
            <span>${escapeHtml(scene.set.name)}</span>
            <span>${escapeHtml(scene.character.name)}</span>
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

  function renderStudent(character, emotion) {
    const svgId = `${character.id}-${emotion}`;
    const eyebrowTilt = emotion === 'puzzled' ? 'rotate(-9 76 64)' : 'rotate(0 76 64)';
    const smile = emotion === 'puzzled' ? 'M70 86 Q80 81 90 86' : 'M69 84 Q80 94 92 84';
    const armLeft = emotion === 'celebrate' ? 'M57 119 C36 103 31 82 39 68' : 'M58 120 C40 126 31 139 28 155';
    const armRight = emotion === 'coaching' ? 'M102 120 C121 111 134 101 146 87' : 'M101 120 C119 130 128 142 132 157';
    return `
      <svg class="character-svg" viewBox="0 0 180 190" role="img" aria-label="${escapeHtml(character.name)} ${escapeHtml(emotion)} illustration">
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
        <circle cx="68" cy="73" r="4" fill="#111827" />
        <circle cx="92" cy="73" r="4" fill="#111827" />
        <path d="${smile}" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round" />
        <path d="M62 62 L73 60" stroke="#111827" stroke-width="3" stroke-linecap="round" transform="${eyebrowTilt}" />
        <path d="M87 60 L99 62" stroke="#111827" stroke-width="3" stroke-linecap="round" />
        ${renderStudentProp(character)}
      </svg>
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
    const eye = emotion === 'puzzled' ? 'M67 76 Q72 72 78 76' : 'M67 76 L78 76';
    const mouth = emotion === 'celebrate' ? 'M70 98 Q91 113 111 96' : 'M75 98 Q91 104 106 98';
    const tail = emotion === 'puzzled' ? 'M43 137 C18 143 16 113 36 116' : 'M44 139 C18 153 10 130 29 119';
    return `
      <svg class="character-svg" viewBox="0 0 190 190" role="img" aria-label="${escapeHtml(character.name)} ${escapeHtml(emotion)} illustration">
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
        <path d="${eye}" stroke="#111827" stroke-width="5" stroke-linecap="round" />
        <path d="M104 76 L115 76" stroke="#111827" stroke-width="5" stroke-linecap="round" />
        <path d="${mouth}" fill="none" stroke="#7f1d1d" stroke-width="5" stroke-linecap="round" />
        ${renderDragonProp(character)}
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
    getQuestionScene,
    renderCharacter,
    renderSceneCard
  };
})();
