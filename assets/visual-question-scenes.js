/**
 * Grammar Quest visual question scenes.
 * Adds illustrated dialogue/context scenes to whichever question bank is loaded.
 */
(function () {
  'use strict';

  const actorCycle = [
    ['mina-mapwise', 'jo-pocket'],
    ['ember-comma', 'azure-quill'],
    ['dex-decoder', 'piper-prism']
  ];

  const sentenceTypeScenes = {
    1: scene('The Library Return Case', 'library', 'Return desk', 'Mina reads the quiet sign, while Jo finds the sentence that gives an instruction.', [
      line('mina-mapwise', 'curious', 'One sentence only tells a fact about the library schedule.'),
      line('jo-pocket', 'coaching', 'Another sentence tells someone what to do, even with a calm period.')
    ], 'Which speech card is a command even though it ends with a period?', 'A command tells someone to do something.'),
    2: scene('Storm Watch Window', 'storm', 'Classroom window', 'Ember and Azure sort storm sentences by purpose, not by topic.', [
      line('ember-comma', 'puzzled', 'Every card mentions the storm, but only one shows strong feeling.'),
      line('azure-quill', 'coaching', 'Look for the sentence that sounds amazed, not just informative or asking.')
    ], 'Which speech card is exclamatory because it shows strong feeling?', 'Exclamations show strong feeling.'),
    3: scene('Late Bus Signal', 'bus', 'Bus stop board', 'Dex scans the bus board while Piper checks which line directly asks.', [
      line('dex-decoder', 'curious', 'Some sentences talk about the late bus. One asks directly.'),
      line('piper-prism', 'coaching', 'A direct question usually asks and ends with a question mark.')
    ], 'Which speech card is interrogative?', 'Interrogative sentences ask questions.'),
    4: scene('Question Word Trap', 'notebook', 'Mystery notebook', 'Mina spots a sentence with the word "question" that is still just giving information.', [
      line('mina-mapwise', 'confident', 'The word "question" can appear inside a statement.'),
      line('jo-pocket', 'puzzled', 'So I should judge the sentence job, not just one word.')
    ], 'Which speech card is declarative even though it contains the word "question"?', 'Declarative sentences give information.'),
    5: scene('Problem-Solving Help', 'classroom', 'Math table', 'Piper hears a student ask for an explanation with extra force.', [
      line('piper-prism', 'curious', 'The student says, "Please explain how you solved the problem!"'),
      line('dex-decoder', 'coaching', 'Even with excitement, the sentence tells someone to do something.')
    ], 'What type of sentence is the student using?', 'Imperative sentences give commands or requests.'),
    6: scene('Science Fair Switch', 'science', 'Science fair poster', 'Azure turns a plain announcement into a sentence that asks directly.', [
      line('azure-quill', 'curious', 'The poster starts as a plain announcement.'),
      line('ember-comma', 'coaching', 'To make it a direct question, the sentence must ask the reader.')
    ], 'Which revision turns the statement into a direct question?', 'A direct question asks for an answer.'),
    7: scene('Office Direction Puzzle', 'hallway', 'School hallway', 'Mina separates direct questions from a sentence that only wonders.', [
      line('mina-mapwise', 'puzzled', 'Some cards ask directly where the office is.'),
      line('jo-pocket', 'coaching', 'One card reports a wondering thought, so it ends with a period.')
    ], 'Which speech card asks indirectly, so it should end with a period?', 'Indirect questions are often statements.'),
    8: scene('Muddy Trail Report', 'trail', 'Rainy trail', 'Dex checks whether the punctuation matches the sentence purpose.', [
      line('dex-decoder', 'curious', 'The trail report should simply give information.'),
      line('piper-prism', 'coaching', 'A statement needs a period, not a question mark.')
    ], 'Which card is a declarative sentence with correct punctuation?', 'A declarative sentence states information.'),
    9: scene('Pencil Desk Mission', 'desk', 'Classroom desk', 'Jo looks for the sentence that quietly gives an action to the listener.', [
      line('jo-pocket', 'curious', 'The subject "you" can be invisible in a command.'),
      line('mina-mapwise', 'coaching', 'Find the card that tells someone to place the pencils.')
    ], 'Which speech card is a command with an understood subject "you"?', 'Commands often have an understood subject: you.'),
    10: scene('Practice Schedule Board', 'gym', 'Gym door', 'Piper filters out the sentence that does not directly ask.', [
      line('piper-prism', 'puzzled', 'Three cards ask about practice. One only tells what someone asked.'),
      line('dex-decoder', 'coaching', 'A reported question can be a statement.')
    ], 'Which speech card is NOT interrogative?', 'Not every sentence with a question idea is interrogative.'),
    11: scene('Careful Reader Badge', 'badge', 'Reading corner', 'Azure awards a reader badge with strong feeling.', [
      line('azure-quill', 'celebrate', '"What a careful reader you are!" sounds full of feeling.'),
      line('ember-comma', 'coaching', 'Name the sentence type that celebrates or reacts strongly.')
    ], 'Which sentence type best fits the badge sentence?', 'Exclamatory sentences show strong feeling.'),
    12: scene('Mascot Vote Board', 'mascot', 'Class vote board', 'Dex checks four sentences and their marks.', [
      line('dex-decoder', 'puzzled', 'Some punctuation marks do not match what the sentence is doing.'),
      line('piper-prism', 'coaching', 'Pick the card where purpose and punctuation agree.')
    ], 'Which speech card uses punctuation that matches its purpose?', 'Match the end mark to the sentence purpose.'),
    13: scene('Bell Match-Up', 'bell', 'School bell display', 'Mina pairs each bell sentence with its sentence type.', [
      line('mina-mapwise', 'curious', 'Same bell, different sentence jobs.'),
      line('jo-pocket', 'coaching', 'A command can be short: "Ring the bell."')
    ], 'Which pair correctly matches the sentence to its type?', 'Imperative means command.'),
    14: scene('Front Office Choice', 'office', 'Front office pass', 'Ember compares sentences about walking to the office.', [
      line('ember-comma', 'puzzled', 'Several cards tell someone to walk.'),
      line('azure-quill', 'coaching', 'One card gives advice as a statement instead of a command.')
    ], 'Which speech card is a statement, not a command?', 'Statements give information or ideas.'),
    15: scene('Falling Branch Alert', 'branch', 'Playground path', 'Dex hears one urgent warning that needs force.', [
      line('dex-decoder', 'puzzled', 'The branch is falling now. One card needs urgency.'),
      line('piper-prism', 'coaching', 'Choose the line that should sound like a warning.')
    ], 'Which speech card should end with an exclamation point because it is urgent?', 'Urgent warnings often use exclamation points.'),
    16: scene('Museum Sign Sort', 'museum', 'Museum entrance', 'Mina sorts museum cards by the end mark they need.', [
      line('mina-mapwise', 'curious', 'One card simply tells when the museum opens.'),
      line('jo-pocket', 'coaching', 'A plain statement should end with a period.')
    ], 'Which speech card should end with a period?', 'Statements usually end with periods.'),
    17: scene('Grand Canyon Postcard', 'postcard', 'Postcard wall', 'Azure reads an unfinished sentence from a travel postcard.', [
      line('azure-quill', 'curious', '"Have you ever seen the Grand Canyon" is missing its end mark.'),
      line('ember-comma', 'coaching', 'Listen to whether it asks, tells, commands, or exclaims.')
    ], 'After correct punctuation is added, what type is the postcard sentence?', 'A sentence that asks is a question.'),
    18: scene('Math Book Moment', 'classroom', 'Desk row', 'Piper hears a teacher direction before math starts.', [
      line('piper-prism', 'curious', '"Get out your math book" gives someone an action.'),
      line('dex-decoder', 'coaching', 'The listener is the understood "you."')
    ], 'After correct punctuation is added, what type is the math book sentence?', 'A direction is a command.'),
    19: scene('Car Warning', 'street', 'Crosswalk', 'Mina reacts to a sudden danger near the curb.', [
      line('mina-mapwise', 'puzzled', '"Look out for that car" is urgent.'),
      line('jo-pocket', 'coaching', 'The strongest feeling changes the force of the sentence.')
    ], 'After correct punctuation is added, what type is the car warning?', 'Urgent warnings can be exclamations.'),
    20: scene('Fifty-Cent Fact', 'shop', 'School store', 'Dex checks a sentence on the price board.', [
      line('dex-decoder', 'confident', '"Half of one dollar is fifty cents" gives information.'),
      line('piper-prism', 'coaching', 'No command, no question, no strong feeling: just a fact.')
    ], 'After correct punctuation is added, what type is the money sentence?', 'A fact sentence is a statement.'),
    21: scene('Volume Dial Command', 'studio', 'Announcement booth', 'Jo tests how force changes a command.', [
      line('jo-pocket', 'curious', '"Close the door." can be calm. "Close the door!" can be forceful.'),
      line('mina-mapwise', 'coaching', 'The type stays the same, but the end mark can change the force.')
    ], 'Which sentence type can sometimes end with either a period or an exclamation point?', 'Commands can be calm or forceful.'),
    22: scene('Oh No Moment', 'lab', 'Mini science lab', 'Ember watches a tiny experiment spill and reacts.', [
      line('ember-comma', 'puzzled', 'The reaction starts with "Oh, no" but needs a complete exclamation.'),
      line('azure-quill', 'coaching', 'Use the end mark that shows sudden feeling.')
    ], 'Which card changes "Oh, no" into a complete exclamation?', 'Exclamations end with exclamation points.'),
    23: scene('House Map Fact', 'map', 'Neighborhood map', 'Piper marks a house near the school.', [
      line('piper-prism', 'confident', 'One card gives information about where the house is.'),
      line('dex-decoder', 'coaching', 'That sentence states a fact instead of asking or commanding.')
    ], 'Which speech card is declarative because it gives information?', 'Declarative sentences tell or state.'),
    24: scene('Tell Me Report', 'notebook', 'Case report desk', 'Mina hears "Tell me what happened" and checks the verb job.', [
      line('mina-mapwise', 'curious', 'It feels like someone wants information, but the sentence starts with "Tell."'),
      line('jo-pocket', 'coaching', 'That verb tells the listener to do something.')
    ], 'Which explanation correctly matches "Tell me what happened."?', 'A command can ask someone to give information.')
  };

  const profiles = [
    {
      match: /punctuation|comma|apostrophe|quotation|period|colon|abbreviation/i,
      title: 'Punctuation Scene',
      settings: ['notebook', 'library', 'lab', 'classroom'],
      board: 'Punctuation board',
      clue: 'End marks and small marks change how a sentence works.',
      narration: ''
    },
    {
      match: /capital|proper|title|holiday|place|sentence-beginning/i,
      title: 'Capital Letter Scene',
      settings: ['map', 'museum', 'notebook', 'library'],
      board: 'Capital board',
      clue: 'Names, titles, dates, and sentence starts need capitals.',
      narration: ''
    },
    {
      match: /vocabulary|word|synonym|antonym|homophone|meaning|spelling|syllable|prefix|suffix|root/i,
      title: 'Word Workshop Scene',
      settings: ['notebook', 'shop', 'library', 'science'],
      board: 'Word workshop',
      clue: 'Context, word parts, and sound patterns reveal the answer.',
      narration: ''
    },
    {
      match: /reading|inference|theme|evidence|author|main idea|story|compare|fact|opinion|genre|poetry/i,
      title: 'Reading Evidence Scene',
      settings: ['library', 'notebook', 'map', 'badge'],
      board: 'Evidence wall',
      clue: 'The best answer must match the text evidence.',
      narration: ''
    },
    {
      match: /reference|dictionary|research|media|alphabetical|nonfiction|subject-object|italicize/i,
      title: 'Reference Desk Scene',
      settings: ['library', 'notebook', 'science', 'map'],
      board: 'Reference desk',
      clue: 'Use the feature, source, or order clue to narrow the choices.',
      narration: ''
    },
    {
      match: /grammar|sentence|noun|verb|adjective|adverb|pronoun|tense|subject|predicate|clause|article/i,
      title: 'Grammar Lab Scene',
      settings: ['classroom', 'desk', 'notebook', 'science'],
      board: 'Grammar lab',
      clue: 'The sentence job and word role identify the best choice.',
      narration: ''
    }
  ];

  const defaultSceneClue = 'Use the rule or sound pattern in the prompt, then test every choice.';

  window.GrammarQuestVisualQuestionScenes = {
    applyVisualScenes
  };

  applyVisualScenes();
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('grammarquest:questions-loaded', applyVisualScenes);
  }

  function applyVisualScenes() {
    const bank = window.QUESTION_BANK || {};
    Object.keys(bank).forEach(setId => {
      const set = bank[setId];
      if (!set || !Array.isArray(set.questions)) return;
      set.questions.forEach((question, index) => {
        const sequence = question && question.metadata && question.metadata.sequence;
        if (question.visualScene) return;
        if (setId === 'grammar-sentence-types' && sentenceTypeScenes[sequence]) {
          question.generatedVisualScene = sanitizeSceneClue(question, sentenceTypeScenes[sequence], getSafeFallbackClue(question, profiles[profiles.length - 1]));
          return;
        }
        question.generatedVisualScene = buildAdaptiveScene(setId, set, question, index);
      });
    });
  }

  function buildAdaptiveScene(setId, set, question, index) {
    const profile = getProfile(setId, set, question);
    const setting = inferSetting(question, set) || pick(profile.settings, setId + index);
    const actors = pick(actorCycle, setId + ':' + index);
    const prompt = cleanPrompt(question.question);
    const title = getSceneTitle(profile, set, question, index);
    const firstLine = getFirstLine(profile, question);
    const secondLine = getSecondLine(profile, question);
    const moods = getSceneMoods(question, profile);

    return sanitizeSceneClue(question, scene(title, setting, profile.board, profile.narration, [
      line(actors[0], moods[0], firstLine),
      line(actors[1], moods[1], secondLine)
    ], prompt, getClue(profile, question)), getSafeFallbackClue(question, profile));
  }

  function getProfile(setId, set, question) {
    const source = [
      setId,
      set && set.title,
      set && set.topic,
      question && question.question,
      question && question.metadata && Array.isArray(question.metadata.skills) ? question.metadata.skills.join(' ') : ''
    ].filter(Boolean).join(' ');
    return profiles.find(profile => profile.match.test(source)) || profiles[profiles.length - 1];
  }

  function getSceneTitle(profile, set, question, index) {
    const setTitle = set && set.title ? cleanPrompt(set.title) : '';
    if (setTitle) return shorten(titleCase(setTitle), 36) + ' Scene';
    const source = cleanPrompt(question.question)
      .replace(/^which\s+/i, '')
      .replace(/^what\s+/i, '')
      .replace(/["'?.!,]/g, '');
    const firstWords = source.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    if (firstWords && firstWords.length > 7) return titleCase(firstWords) + ' Scene';
    return `${profile.title} ${((index % 4) + 1)}`;
  }

  function getFirstLine(profile, question) {
    const text = [
      profile && profile.title,
      question && question.question,
      question && question.studyAid && question.studyAid.definition
    ].filter(Boolean).join(' ').toLowerCase();
    if (/modifier/.test(text)) {
      return 'I am checking which word or phrase the modifier is supposed to describe.';
    }
    if (/comparative|superlative|compare|more|most|-er|-est/.test(text)) {
      return 'I am checking whether the sentence compares two things or more than two things.';
    }
    if (/sentence type|declarative|interrogative|imperative|exclamatory|question mark|period|exclamation/.test(text)) {
      return 'I am checking what job the sentence is doing before I choose.';
    }
    if (/capital|proper noun|title/.test(text)) {
      return 'I am checking which words name something specific.';
    }
    if (/punctuation|comma|apostrophe|quotation|colon/.test(text)) {
      return 'I am checking how the punctuation helps the sentence read clearly.';
    }
    if (/reading|passage|story|theme|inference|evidence|main idea/.test(text)) {
      return 'I am looking for the part of the text that supports the idea.';
    }
    return 'I am looking for the exact words that prove the answer.';
  }

  function getSecondLine(profile, question) {
    const prompt = cleanPrompt(question && question.question);
    const contextMeaning = getContextMeaningClue(prompt);
    if (contextMeaning) return contextMeaning;
    const wordPart = getWordPartClue(prompt);
    if (wordPart) return wordPart;
    const syllableClue = getSyllableClue(prompt);
    if (syllableClue) return syllableClue;
    const skills = question && question.metadata && Array.isArray(question.metadata.skills)
      ? question.metadata.skills.slice(0, 2).join(' and ')
      : '';
    if (skills) return `I will use the ${skills} clue in the question.`;
    return 'I will use the exact clue in the question.';
  }

  function getContextMeaningClue(prompt) {
    const quoted = String(prompt || '').match(/["']([^"']+)["']/);
    const target = String(prompt || '').match(/\bwhat does\s+["']?([A-Za-z'-]+)["']?\s+(?:mean|most nearly mean)\b/i);
    if (!quoted || !target) return '';
    const clues = getSalientContextWords(quoted[1], target[1]);
    if (!clues.length) return `Use the quoted sentence to decide which meaning of "${target[1]}" fits.`;
    return `Use "${clues.join('" and "')}" to decide which meaning of "${target[1]}" fits.`;
  }

  function getWordPartClue(prompt) {
    const rootMatch = String(prompt || '').match(/\broot\s+([A-Za-z'-]+)\s+means\s+([^.?!]+)[.?!]/i);
    if (rootMatch) return `Use the root ${rootMatch[1]}, which means ${rootMatch[2].trim()}.`;
    const partMatch = String(prompt || '').match(/\b(prefix|suffix)\s+(-?[A-Za-z]+-?)\s+(?:mean|means)\s+([^.?!]+)[.?!]/i);
    if (partMatch) return `Use the ${partMatch[1]} ${partMatch[2]}, which means ${partMatch[3].trim()}.`;
    const asksPart = String(prompt || '').match(/\bwhat does the\s+(prefix|suffix|root)\s+(-?[A-Za-z]+-?)\s+mean\b/i);
    if (asksPart) return `Focus on the ${asksPart[1]} ${asksPart[2]}.`;
    return '';
  }

  function getSyllableClue(prompt) {
    const text = String(prompt || '');
    if (!/\bsyllables?\b/i.test(text)) return '';
    if (/\breference source\b|\bsource would be best\b/i.test(text)) return '';
    const countMatch = text.match(/\bsyllables?\s+are\s+in\s+["']?([A-Za-z'-]+)["']?/i);
    if (countMatch) return `Say "${countMatch[1]}" naturally and count the vowel beats.`;
    if (/closed first syllable/i.test(text)) return 'Mark the first vowel sound; closed syllables end with a consonant after the vowel.';
    if (/divide/i.test(text)) return 'Mark the vowel sounds, then divide the word into spoken chunks.';
    return 'Count spoken vowel beats, then check the printed vowel chunks.';
  }

  function getSalientContextWords(sentence, targetWord) {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'at', 'but', 'by', 'for', 'from', 'in', 'is', 'it', 'of',
      'on', 'or', 'the', 'to', 'was', 'were', 'with', 'this', 'that', 'these', 'those'
    ]);
    const target = String(targetWord || '').toLowerCase();
    const words = String(sentence || '').toLowerCase().match(/[a-z']+/g) || [];
    return words
      .filter(word => word !== target && !stopWords.has(word))
      .slice(0, 3);
  }

  function getSceneMoods(question, profile) {
    const text = [
      question && question.question,
      question && Array.isArray(question.choices) ? question.choices.join(' ') : '',
      profile && profile.title
    ].filter(Boolean).join(' ').toLowerCase();
    if (/urgent|watch out|look out|danger|falling|strong feeling|exclamation/.test(text)) return ['urgent', 'amazed'];
    if (/\?|which|what|how|why|when|where/.test(text)) return ['curious', 'thinking'];
    if (/correct|fix|revision|rewrite|edit|error/.test(text)) return ['focused', 'determined'];
    if (/story|poem|reader|evidence|inference|theme/.test(text)) return ['reading', 'coaching'];
    if (/not|except|least|does not/.test(text)) return ['puzzled', 'coaching'];
    if (/celebrate|award|great|wow|oh/.test(text)) return ['excited', 'delighted'];
    return ['curious', 'coaching'];
  }

  function getClue(profile, question) {
    const vowelSoundClue = getVowelSoundSceneClue(question);
    if (vowelSoundClue) return vowelSoundClue;
    const definition = question && question.studyAid && question.studyAid.definition;
    if (definition) return shorten(stripExampleTail(definition), 88);
    return profile.clue;
  }

  function getVowelSoundSceneClue(question) {
    const prompt = cleanPrompt(question && question.question);
    if (!/same vowel sound/i.test(prompt)) return '';
    if (/\bcloud\b/i.test(prompt)) return "'ou' and 'ow' both make the /ow/ sound";
    return '';
  }

  function sanitizeSceneClue(question, sceneData, fallback) {
    if (!sceneData || !isSceneClueAnswerLeak(question, sceneData.clue)) return sceneData;
    const trimmed = stripExampleTail(sceneData.clue);
    const safeClue = !isSceneClueAnswerLeak(question, trimmed)
      ? trimmed
      : fallback || defaultSceneClue;
    return Object.assign({}, sceneData, {
      clue: shorten(safeClue, 88)
    });
  }

  function getSafeFallbackClue(question, profile) {
    const prompt = cleanPrompt(question && question.question);
    if (/same vowel sound|vowel sound|phonics|diphthong/i.test(prompt)) {
      return 'Listen for the vowel sound named in the prompt, then compare each choice.';
    }
    if (/sentence type|declarative|interrogative|imperative|exclamatory/i.test(prompt)) {
      return 'Decide whether the sentence asks, tells, commands, or shows strong feeling.';
    }
    return profile && profile.clue || defaultSceneClue;
  }

  function stripExampleTail(value) {
    return String(value || '')
      .replace(/\s*,?\s+as in\b[\s\S]*$/i, '')
      .replace(/\s*,?\s+for example\b[\s\S]*$/i, '')
      .replace(/\s*,?\s+such as\b[\s\S]*$/i, '')
      .trim();
  }

  function isSceneClueAnswerLeak(question, clue) {
    if (!clue || !question || !Array.isArray(question.choices) || !Number.isInteger(question.correct)) return false;
    const correctText = normalizeSceneLeakText(question.choices[question.correct]);
    const clueText = normalizeSceneLeakText(clue);
    if (!correctText || !clueText) return false;
    if (isGenericSceneAnswerText(correctText)) return false;
    if (clueText === correctText) return true;
    if (correctText.length < 2) return false;
    return buildSceneLeakRegExp(correctText).test(clueText);
  }

  function isGenericSceneAnswerText(value) {
    return new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'has', 'have', 'had',
      'how', 'why', 'when', 'where', 'who', 'what', 'sentence', 'question',
      'statement', 'command'
    ]).has(String(value || ''));
  }

  function normalizeSceneLeakText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^a-z0-9'-]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function buildSceneLeakRegExp(value) {
    const escaped = String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`);
  }

  function inferSetting(question, set) {
    const text = [
      set && set.title,
      question && question.question,
      question && Array.isArray(question.choices) ? question.choices.join(' ') : ''
    ].filter(Boolean).join(' ').toLowerCase();
    const rules = [
      [/library|book|reader|read|aisle|passage|guide word|dictionary/, 'library'],
      [/storm|rain|branch|wind|weather/, 'storm'],
      [/bus|practice|gym|coach|team/, 'bus'],
      [/office|hall|hallway|school door/, 'hallway'],
      [/science|experiment|lab|model/, 'science'],
      [/desk|pencil|notebook|paper|write|class/, 'desk'],
      [/museum|opens|entrance/, 'museum'],
      [/canyon|postcard|travel/, 'postcard'],
      [/car|street|crosswalk|road/, 'street'],
      [/\bdollars?\b|\bcents?\b|\bmoney\b|\bstore\b|\bbuy\b|\bprice\b|\bpiano\b/, 'shop'],
      [/map|place|city|state|country|address|house|school/, 'map'],
      [/bell|ring/, 'bell'],
      [/vote|mascot/, 'mascot'],
      [/badge|award|careful reader/, 'badge']
    ];
    const match = rules.find(([pattern]) => pattern.test(text));
    return match ? match[1] : '';
  }

  function cleanPrompt(value) {
    return String(value || '')
      .replace(/^Grade\s+\d+\s+(Easy|Medium|Hard):\s*/i, '')
      .replace(/^Use the context to choose the best answer\.\s*/i, '')
      .replace(/^Analyze the details and choose the strongest answer\.\s*/i, '')
      .replace(/^Choose the best answer\.\s*/i, '')
      .trim();
  }

  function scene(title, setting, board, narration, dialogue, prompt, clue) {
    return {
      type: 'dialogue-scene',
      title,
      setting,
      board,
      narration,
      dialogue,
      prompt,
      clue
    };
  }

  function line(characterId, emotion, text) {
    return { characterId, emotion, text };
  }

  function pick(items, seed) {
    return items[Math.abs(hashString(seed)) % items.length];
  }

  function shorten(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, '') + '...';
  }

  function titleCase(value) {
    return String(value || '').replace(/\w\S*/g, word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  function hashString(value) {
    return String(value).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
  }

  window.GrammarQuestVisualScenes = {
    applyVisualScenes,
    buildAdaptiveScene
  };
})();
