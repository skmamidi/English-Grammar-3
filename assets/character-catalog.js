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
        },
        {
          id: 'tessa-thumbprint',
          name: 'Tessa Thumbprint',
          role: 'clue sketch artist',
          pronouns: 'she/her',
          backstory: 'Tessa draws every clue twice: once as a doodle and once as a sentence map. Her sketchbook helps the team notice tiny differences.',
          emotions: {
            curious: 'leans over a sketch clue',
            confident: 'circles the proof mark',
            puzzled: 'tilts her sketchbook sideways',
            coaching: 'draws the next clue step',
            celebrate: 'adds a bright case sticker'
          },
          accent: '#ec4899',
          secondary: '#f97316',
          skin: '#d99570',
          hair: '#5b3427',
          outfit: '#be185d',
          prop: 'magnifier',
          pet: {
            id: 'smudge',
            name: 'Smudge',
            species: 'ink ferret',
            color: '#475569',
            accent: '#f9a8d4',
            backstory: 'Smudge rolls through fresh ink and leaves a dotted trail toward the strongest evidence.'
          }
        },
        {
          id: 'ravi-riddle',
          name: 'Ravi Riddle',
          role: 'pattern puzzler',
          pronouns: 'he/him',
          backstory: 'Ravi loves riddles, secret patterns, and sentences that almost trick you. He sorts clues until the odd one finally makes sense.',
          emotions: {
            curious: 'tests a new clue pattern',
            confident: 'snaps the pattern into place',
            puzzled: 'turns the puzzle card around',
            coaching: 'shares one clue without spoiling it',
            celebrate: 'solves the riddle lock'
          },
          accent: '#7c3aed',
          secondary: '#22c55e',
          skin: '#b97855',
          hair: '#111827',
          outfit: '#5b21b6',
          prop: 'notebook',
          pet: {
            id: 'niblet',
            name: 'Niblet',
            species: 'notebook mouse',
            color: '#94a3b8',
            accent: '#7c3aed',
            backstory: 'Niblet nibbles tiny tabs into pages where a pattern appears again.'
          }
        },
        {
          id: 'lila-lantern',
          name: 'Lila Lantern',
          role: 'evidence tracker',
          pronouns: 'she/her',
          backstory: 'Lila carries a little lantern for dim clues. She shines it on word endings, missing marks, and sentences that need a closer look.',
          emotions: {
            curious: 'raises the lantern toward a clue',
            confident: 'lights the answer trail',
            puzzled: 'checks the shadow clue',
            coaching: 'glows a hint on the page',
            celebrate: 'turns the lantern gold'
          },
          accent: '#f59e0b',
          secondary: '#2563eb',
          skin: '#c58b61',
          hair: '#3f2b1f',
          outfit: '#92400e',
          prop: 'lantern',
          pet: {
            id: 'glowpop',
            name: 'Glowpop',
            species: 'clue cricket',
            color: '#facc15',
            accent: '#92400e',
            backstory: 'Glowpop chirps once for a weak clue and twice when the proof is bright.'
          }
        },
        {
          id: 'omar-outbox',
          name: 'Omar Outbox',
          role: 'message sorter',
          pronouns: 'he/him',
          backstory: 'Omar sorts notes, postcards, and mystery letters into neat piles. If a sentence is asking, telling, or commanding, he files it fast.',
          emotions: {
            curious: 'checks the mail slot',
            confident: 'stamps the correct pile',
            puzzled: 'compares two message cards',
            coaching: 'slides over a filing hint',
            celebrate: 'opens the solved envelope'
          },
          accent: '#0ea5e9',
          secondary: '#facc15',
          skin: '#6f4b35',
          hair: '#1f2937',
          outfit: '#075985',
          prop: 'badge',
          pet: {
            id: 'zippy',
            name: 'Zippy',
            species: 'stamp snail',
            color: '#38bdf8',
            accent: '#facc15',
            backstory: 'Zippy slides a shiny stamp onto the sentence that belongs in the right pile.'
          }
        },
        {
          id: 'nori-notecard',
          name: 'Nori Notecard',
          role: 'rule keeper',
          pronouns: 'they/them',
          backstory: 'Nori keeps a ring of colorful rule cards clipped to their backpack. They love turning a tricky question into one clear rule.',
          emotions: {
            curious: 'flips to a fresh rule card',
            confident: 'holds up the matching rule',
            puzzled: 'checks a crossed-out clue',
            coaching: 'reads the rule in kid words',
            celebrate: 'clips on a victory card'
          },
          accent: '#14b8a6',
          secondary: '#a855f7',
          skin: '#f0b98d',
          hair: '#0f172a',
          outfit: '#0f766e',
          prop: 'camera',
          pet: {
            id: 'tater',
            name: 'Tater',
            species: 'eraser hamster',
            color: '#fbbf24',
            accent: '#0f766e',
            backstory: 'Tater gently erases weak guesses so the best answer has room to shine.'
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
        },
        {
          id: 'ruby-rune',
          name: 'Ruby Rune',
          role: 'root-word dragon',
          pronouns: 'she/her',
          backstory: 'Ruby carves glowing word roots into smooth classroom stones. She can spot a prefix hiding under three layers of sparkle.',
          emotions: {
            curious: 'sniffs a glowing rune',
            confident: 'taps the root stone',
            puzzled: 'turns a rune upside down',
            coaching: 'warms the prefix clue',
            celebrate: 'sets the rune ring shining'
          },
          accent: '#dc2626',
          secondary: '#f59e0b',
          wing: '#fecaca',
          belly: '#fee2e2',
          prop: 'rune',
          pet: {
            id: 'flicker',
            name: 'Flicker',
            species: 'rune gecko',
            color: '#ef4444',
            accent: '#fef3c7',
            backstory: 'Flicker sticks to word stones and flashes when a root carries meaning.'
          }
        },
        {
          id: 'mossy-margin',
          name: 'Mossy Margin',
          role: 'paragraph meadow-dragon',
          pronouns: 'he/him',
          backstory: 'Mossy grows tiny gardens in the margins of reading passages. Each sprout marks a detail that supports the big idea.',
          emotions: {
            curious: 'peeks at a margin sprout',
            confident: 'points to a proof leaf',
            puzzled: 'counts two similar details',
            coaching: 'plants a hint seed',
            celebrate: 'blooms the evidence garden'
          },
          accent: '#16a34a',
          secondary: '#84cc16',
          wing: '#bbf7d0',
          belly: '#dcfce7',
          prop: 'seed',
          pet: {
            id: 'sproutle',
            name: 'Sproutle',
            species: 'seed sprite',
            color: '#22c55e',
            accent: '#166534',
            backstory: 'Sproutle grows one leaf for each detail that proves an answer.'
          }
        },
        {
          id: 'solstice-spark',
          name: 'Solstice Spark',
          role: 'sentence sun-dragon',
          pronouns: 'they/them',
          backstory: 'Solstice keeps the classroom bright during long grammar quests. They warm up cold sentences until their purpose is clear.',
          emotions: {
            curious: 'tilts toward a warm clue',
            confident: 'casts a sunbeam on the rule',
            puzzled: 'dims for a second look',
            coaching: 'glows around the key words',
            celebrate: 'bursts into tiny sun sparks'
          },
          accent: '#f97316',
          secondary: '#facc15',
          wing: '#fed7aa',
          belly: '#fef3c7',
          prop: 'sun',
          pet: {
            id: 'flarebean',
            name: 'Flarebean',
            species: 'sun puff',
            color: '#f59e0b',
            accent: '#fff7ed',
            backstory: 'Flarebean puffs brighter when a sentence shows strong feeling.'
          }
        },
        {
          id: 'violet-verbwing',
          name: 'Violet Verbwing',
          role: 'action-word dragon',
          pronouns: 'she/her',
          backstory: 'Violet swoops over verbs and checks whether each action is happening now, before, or later. Her wingbeats sound like little clocks.',
          emotions: {
            curious: 'watches an action word move',
            confident: 'lands on the right verb',
            puzzled: 'hovers between two tenses',
            coaching: 'beats out the time clue',
            celebrate: 'loops around the action trail'
          },
          accent: '#8b5cf6',
          secondary: '#06b6d4',
          wing: '#ddd6fe',
          belly: '#ede9fe',
          prop: 'clock',
          pet: {
            id: 'whoosh',
            name: 'Whoosh',
            species: 'wind tadpole',
            color: '#a78bfa',
            accent: '#67e8f9',
            backstory: 'Whoosh zips beside action words and wiggles faster for active verbs.'
          }
        },
        {
          id: 'cobalt-cloudtail',
          name: 'Cobalt Cloudtail',
          role: 'context-clue dragon',
          pronouns: 'he/him',
          backstory: 'Cobalt curls his tail into cloud arrows around nearby words. He teaches the team to read the sky around an unknown word.',
          emotions: {
            curious: 'sniffs the cloud clue',
            confident: 'circles the context words',
            puzzled: 'chases a drifting meaning',
            coaching: 'points his cloud tail at proof',
            celebrate: 'makes a tiny answer rainbow'
          },
          accent: '#2563eb',
          secondary: '#14b8a6',
          wing: '#bae6fd',
          belly: '#dbeafe',
          prop: 'cloud',
          pet: {
            id: 'drizzle',
            name: 'Drizzle',
            species: 'cloud salamander',
            color: '#60a5fa',
            accent: '#ecfeff',
            backstory: 'Drizzle sprinkles soft dots under context words that explain a meaning.'
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
        },
        {
          id: 'nova-nightline',
          name: 'Nova Nightline',
          role: 'stealth proofreader',
          pronouns: 'she/her',
          backstory: 'Nova reads missions with a midnight-blue pencil and catches tiny mistakes before they can sneak past the team.',
          emotions: {
            curious: 'checks a quiet signal',
            confident: 'marks the corrected line',
            puzzled: 'replays the clue scan',
            coaching: 'whispers the proof step',
            celebrate: 'lights the night badge'
          },
          accent: '#0f172a',
          secondary: '#38bdf8',
          skin: '#b77956',
          hair: '#111827',
          outfit: '#1e3a8a',
          prop: 'earpiece',
          pet: {
            id: 'echo',
            name: 'Echo',
            species: 'signal bat',
            color: '#334155',
            accent: '#38bdf8',
            backstory: 'Echo chirps back the sentence part Nova should check again.'
          }
        },
        {
          id: 'max-microdot',
          name: 'Max Microdot',
          role: 'tiny clue technologist',
          pronouns: 'he/him',
          backstory: 'Max hides helpful grammar notes in microdots on mission cards. A magnifier, a grin, and patience are his favorite tools.',
          emotions: {
            curious: 'zooms into a tiny clue',
            confident: 'reveals the hidden rule',
            puzzled: 'adjusts the focus dial',
            coaching: 'projects the micro hint',
            celebrate: 'prints the mission dot'
          },
          accent: '#f59e0b',
          secondary: '#22c55e',
          skin: '#d39a70',
          hair: '#3f2b1f',
          outfit: '#78350f',
          prop: 'tablet',
          pet: {
            id: 'blip',
            name: 'Blip',
            species: 'microbot',
            color: '#f59e0b',
            accent: '#111827',
            backstory: 'Blip projects tiny arrows toward the word that changes the answer.'
          }
        },
        {
          id: 'sienna-switch',
          name: 'Sienna Switch',
          role: 'sentence systems analyst',
          pronouns: 'she/her',
          backstory: 'Sienna builds switchboards for sentence parts. She flips one switch at a time until subject, verb, and meaning line up.',
          emotions: {
            curious: 'tests a new circuit clue',
            confident: 'flips the rule switch',
            puzzled: 'checks a crossed wire',
            coaching: 'routes the answer signal',
            celebrate: 'turns the board green'
          },
          accent: '#ea580c',
          secondary: '#16a34a',
          skin: '#8f5f3e',
          hair: '#3f2b1f',
          outfit: '#7c2d12',
          prop: 'switchboard',
          pet: {
            id: 'toggle',
            name: 'Toggle',
            species: 'gadget turtle',
            color: '#16a34a',
            accent: '#f97316',
            backstory: 'Toggle carries little switch labels for sentence parts on his shell.'
          }
        },
        {
          id: 'leo-lockstep',
          name: 'Leo Lockstep',
          role: 'sequence strategist',
          pronouns: 'he/him',
          backstory: 'Leo solves clues in order: read, prove, choose, check. His mission boots tap out the steps whenever a question feels busy.',
          emotions: {
            curious: 'counts the clue steps',
            confident: 'locks the sequence',
            puzzled: 'backs up one step',
            coaching: 'sets the next step marker',
            celebrate: 'opens the answer lock'
          },
          accent: '#2563eb',
          secondary: '#facc15',
          skin: '#f0b98d',
          hair: '#0f172a',
          outfit: '#1d4ed8',
          prop: 'keycard',
          pet: {
            id: 'wink',
            name: 'Wink',
            species: 'laser ferret',
            color: '#60a5fa',
            accent: '#facc15',
            backstory: 'Wink flashes a soft dot on the next clue Leo should check.'
          }
        },
        {
          id: 'quinn-query',
          name: 'Quinn Query',
          role: 'question-code specialist',
          pronouns: 'they/them',
          backstory: 'Quinn collects question marks like badges and decodes what each prompt really wants. They are great at finding the task hidden inside a question.',
          emotions: {
            curious: 'raises a question badge',
            confident: 'decodes the prompt',
            puzzled: 'sorts two possible tasks',
            coaching: 'translates the question code',
            celebrate: 'pings the answer signal'
          },
          accent: '#06b6d4',
          secondary: '#7c3aed',
          skin: '#c9865b',
          hair: '#111827',
          outfit: '#164e63',
          prop: 'hologram',
          pet: {
            id: 'ping',
            name: 'Ping',
            species: 'radar owl',
            color: '#0891b2',
            accent: '#ddd6fe',
            backstory: 'Ping sends a tiny blip when a prompt is asking for a specific job.'
          }
        }
      ]
    }
    ,
    {
      id: 'arcane-academy',
      name: 'Arcane Academy',
      tone: 'magical school creature commons',
      palette: ['#7c3aed', '#f59e0b', '#10b981'],
      characters: [
        {
          id: 'pippa-puffwing',
          name: 'Pippa Puffwing',
          role: 'spellbook sprite',
          pronouns: 'she/her',
          backstory: 'Pippa lives in the cozy shelf between grammar books and glowing storybooks. She dusts tricky sentences with sparkle so the clue words stand out.',
          emotions: {
            curious: 'peeks over a glowing page',
            confident: 'taps the right spellbook line',
            puzzled: 'flutters around two clues',
            coaching: 'sprinkles one hint at a time',
            celebrate: 'sets the page stars spinning'
          },
          accent: '#8b5cf6',
          secondary: '#f59e0b',
          belly: '#ede9fe',
          creatureShape: 'winged',
          prop: 'spellbook',
          pet: {
            id: 'wispdrop',
            name: 'Wispdrop',
            species: 'lantern puff',
            color: '#fbbf24',
            accent: '#7c3aed',
            backstory: 'Wispdrop glows softly when a sentence has a hidden clue word.'
          }
        },
        {
          id: 'bramble-broomtail',
          name: 'Bramble Broomtail',
          role: 'broom-hall monitor',
          pronouns: 'he/him',
          backstory: 'Bramble sweeps the academy halls for runaway commas and muddy meanings. His tidy trails make every sentence easier to follow.',
          emotions: {
            curious: 'sniffs along a broom trail',
            confident: 'sweeps the answer into place',
            puzzled: 'checks a dusty clue twice',
            coaching: 'brushes away one wrong choice',
            celebrate: 'twirls the victory broom'
          },
          accent: '#a16207',
          secondary: '#22c55e',
          belly: '#fef3c7',
          creatureShape: 'round',
          prop: 'broom',
          pet: {
            id: 'twiglet',
            name: 'Twiglet',
            species: 'broom mouse',
            color: '#92400e',
            accent: '#bbf7d0',
            backstory: 'Twiglet rides the broom bristles and squeaks when a choice can be swept away.'
          }
        },
        {
          id: 'luma-lumicorn',
          name: 'Luma Lumicorn',
          role: 'kindness charm keeper',
          pronouns: 'they/them',
          backstory: 'Luma keeps the academy calm during big challenges. Their tiny horn shines whenever a question needs careful, gentle thinking.',
          emotions: {
            curious: 'tilts their shining horn',
            confident: 'lights the calm answer path',
            puzzled: 'blinks at a cloudy clue',
            coaching: 'casts a gentle reread charm',
            celebrate: 'bows under a rainbow sparkle'
          },
          accent: '#ec4899',
          secondary: '#06b6d4',
          belly: '#fce7f3',
          creatureShape: 'horned',
          prop: 'wand',
          pet: {
            id: 'pearlpip',
            name: 'Pearlpip',
            species: 'glow foal',
            color: '#f9a8d4',
            accent: '#22d3ee',
            backstory: 'Pearlpip stamps tiny stars beside answers that feel kind and clear.'
          }
        },
        {
          id: 'fig-fizzwhisk',
          name: 'Fig Fizzwhisk',
          role: 'cauldron clue mixer',
          pronouns: 'he/him',
          backstory: 'Fig mixes vocabulary bubbles in a little practice cauldron. If a word meaning is hidden, he lets the context simmer until it pops.',
          emotions: {
            curious: 'sniffs a bubbling clue',
            confident: 'stirs the answer brew',
            puzzled: 'watches two bubbles wobble',
            coaching: 'adds a drop of context',
            celebrate: 'pops a rainbow word bubble'
          },
          accent: '#0f766e',
          secondary: '#f97316',
          belly: '#ccfbf1',
          creatureShape: 'eared',
          prop: 'cauldron',
          pet: {
            id: 'fizzbit',
            name: 'Fizzbit',
            species: 'bubble newt',
            color: '#14b8a6',
            accent: '#fed7aa',
            backstory: 'Fizzbit floats a bubble around the word that gives the strongest context.'
          }
        },
        {
          id: 'mallow-moonmoth',
          name: 'Mallow Moonmoth',
          role: 'night-library guide',
          pronouns: 'she/her',
          backstory: 'Mallow studies by moonlight in the quietest tower room. She helps young readers slow down and notice what a passage proves.',
          emotions: {
            curious: 'follows a moonbeam clue',
            confident: 'lands on the proof sentence',
            puzzled: 'circles a tricky detail',
            coaching: 'dusts the page with moonlight',
            celebrate: 'fans her silver wings'
          },
          accent: '#6366f1',
          secondary: '#a78bfa',
          belly: '#e0e7ff',
          creatureShape: 'moth',
          prop: 'moon',
          pet: {
            id: 'cometcrumb',
            name: 'Cometcrumb',
            species: 'star beetle',
            color: '#818cf8',
            accent: '#fef3c7',
            backstory: 'Cometcrumb leaves little silver crumbs under text evidence.'
          }
        },
        {
          id: 'sable-spellscale',
          name: 'Sable Spellscale',
          role: 'rule-rune lizard',
          pronouns: 'he/him',
          backstory: 'Sable warms himself on rune stones and remembers every grammar rule carved there. He is small, serious, and secretly very silly.',
          emotions: {
            curious: 'reads a warm rune',
            confident: 'taps the matching rule',
            puzzled: 'checks a cracked stone',
            coaching: 'points his tail at a rule clue',
            celebrate: 'sets the runes glowing'
          },
          accent: '#111827',
          secondary: '#10b981',
          belly: '#d1fae5',
          creatureShape: 'lizard',
          prop: 'rune',
          pet: {
            id: 'blinkroot',
            name: 'Blinkroot',
            species: 'root imp',
            color: '#166534',
            accent: '#bbf7d0',
            backstory: 'Blinkroot pops up beside prefixes, suffixes, and word roots.'
          }
        },
        {
          id: 'tilly-toadstool',
          name: 'Tilly Toadstool',
          role: 'forest-classroom helper',
          pronouns: 'she/her',
          backstory: 'Tilly carries a mushroom cap full of tiny chalk pieces. She teaches the class to mark one clue before choosing an answer.',
          emotions: {
            curious: 'peeks under a mushroom cap',
            confident: 'chalks the answer clue',
            puzzled: 'counts the dotted cap spots',
            coaching: 'draws a small proof arrow',
            celebrate: 'rings a tiny forest bell'
          },
          accent: '#ef4444',
          secondary: '#facc15',
          belly: '#fee2e2',
          creatureShape: 'mushroom',
          prop: 'chalk',
          pet: {
            id: 'puddlepip',
            name: 'Puddlepip',
            species: 'rain froglet',
            color: '#22c55e',
            accent: '#fef08a',
            backstory: 'Puddlepip hops once for a clue and twice for a complete proof.'
          }
        }
      ]
    },
    {
      id: 'cosmic-cuties',
      name: 'Cosmic Cuties',
      tone: 'cute space aliens learning lab',
      palette: ['#06b6d4', '#a855f7', '#facc15'],
      characters: [
        {
          id: 'zuno-zipzap',
          name: 'Zuno Zipzap',
          role: 'rocket reader',
          pronouns: 'he/him',
          backstory: 'Zuno zooms between tiny planets looking for sentence signals. He keeps a star map of every question he has solved.',
          emotions: {
            curious: 'tilts both antennae at the prompt',
            confident: 'locks onto the answer orbit',
            puzzled: 'wobbles through an asteroid clue',
            coaching: 'beams down a hint line',
            celebrate: 'does a zero-gravity spin'
          },
          accent: '#06b6d4',
          secondary: '#facc15',
          belly: '#cffafe',
          creatureShape: 'alien',
          prop: 'rocket',
          pet: {
            id: 'quarky',
            name: 'Quarky',
            species: 'pocket comet',
            color: '#facc15',
            accent: '#06b6d4',
            backstory: 'Quarky leaves a bright trail from the prompt to the clue.'
          }
        },
        {
          id: 'bibi-moonbean',
          name: 'Bibi Moonbean',
          role: 'moon garden linguist',
          pronouns: 'she/her',
          backstory: 'Bibi grows little moonbeans that sprout into word meanings. She waters each clue with patience and giggles.',
          emotions: {
            curious: 'checks a sprouting word',
            confident: 'harvests the clear meaning',
            puzzled: 'counts two moonbean leaves',
            coaching: 'plants a context clue',
            celebrate: 'shakes moon glitter everywhere'
          },
          accent: '#a855f7',
          secondary: '#22c55e',
          belly: '#f3e8ff',
          creatureShape: 'two-antenna',
          prop: 'planet',
          pet: {
            id: 'spronk',
            name: 'Spronk',
            species: 'moon sprout',
            color: '#22c55e',
            accent: '#a855f7',
            backstory: 'Spronk grows taller when nearby words explain a tricky one.'
          }
        },
        {
          id: 'orlo-orbit',
          name: 'Orlo Orbit',
          role: 'sentence navigator',
          pronouns: 'they/them',
          backstory: 'Orlo draws loops around sentence parts like tiny moons. Their favorite move is finding the subject and verb in one smooth orbit.',
          emotions: {
            curious: 'traces a new orbit',
            confident: 'centers the sentence path',
            puzzled: 'recalculates the clue loop',
            coaching: 'adds an orbit arrow',
            celebrate: 'launches a tiny satellite cheer'
          },
          accent: '#2563eb',
          secondary: '#f97316',
          belly: '#dbeafe',
          creatureShape: 'orb',
          prop: 'satellite',
          pet: {
            id: 'loopy',
            name: 'Loopy',
            species: 'orbit snail',
            color: '#60a5fa',
            accent: '#f97316',
            backstory: 'Loopy circles the sentence part Orlo should inspect next.'
          }
        },
        {
          id: 'nix-nebula',
          name: 'Nix Nebula',
          role: 'starlight inference finder',
          pronouns: 'she/her',
          backstory: 'Nix reads between the stars. When an answer is not stated directly, she gathers little clue lights until the idea appears.',
          emotions: {
            curious: 'collects faint clue stars',
            confident: 'connects the inference constellation',
            puzzled: 'squints through space dust',
            coaching: 'points to the brightest evidence',
            celebrate: 'turns the clue cloud pink'
          },
          accent: '#ec4899',
          secondary: '#8b5cf6',
          belly: '#fce7f3',
          creatureShape: 'star',
          prop: 'constellation',
          pet: {
            id: 'twink',
            name: 'Twink',
            species: 'mini starwhale',
            color: '#f9a8d4',
            accent: '#8b5cf6',
            backstory: 'Twink hums when small clues connect into one bigger idea.'
          }
        },
        {
          id: 'kiki-cometcrumb',
          name: 'Kiki Cometcrumb',
          role: 'punctuation pilot',
          pronouns: 'she/her',
          backstory: 'Kiki pilots a crumb-sized comet through end marks, commas, and quotation marks. She loves when punctuation changes the whole mission.',
          emotions: {
            curious: 'checks the end-mark dashboard',
            confident: 'lands on the right punctuation',
            puzzled: 'dodges a comma asteroid',
            coaching: 'flashes the mark to test',
            celebrate: 'loops the comet into a grin'
          },
          accent: '#f97316',
          secondary: '#06b6d4',
          belly: '#ffedd5',
          creatureShape: 'alien',
          prop: 'comet',
          pet: {
            id: 'dashdot',
            name: 'Dashdot',
            species: 'punctuation rover',
            color: '#fb923c',
            accent: '#0e7490',
            backstory: 'Dashdot rolls to the exact spot where punctuation belongs.'
          }
        },
        {
          id: 'vela-starblink',
          name: 'Vela Starblink',
          role: 'galaxy vocabulary scout',
          pronouns: 'he/him',
          backstory: 'Vela collects new words in star jars and tests each one in a tiny sentence orbit before adding it to the galaxy shelf.',
          emotions: {
            curious: 'opens a star word jar',
            confident: 'labels the best meaning',
            puzzled: 'compares two glowing words',
            coaching: 'shines light on the clue phrase',
            celebrate: 'releases a jar of word sparks'
          },
          accent: '#14b8a6',
          secondary: '#facc15',
          belly: '#ccfbf1',
          creatureShape: 'two-antenna',
          prop: 'starjar',
          pet: {
            id: 'glimbit',
            name: 'Glimbit',
            species: 'word meteor',
            color: '#2dd4bf',
            accent: '#fde68a',
            backstory: 'Glimbit taps the sentence around an unknown word.'
          }
        },
        {
          id: 'momo-meteor',
          name: 'Momo Meteor',
          role: 'space-lab encourager',
          pronouns: 'they/them',
          backstory: 'Momo keeps the space lab cheerful when questions get bumpy. They turn mistakes into tiny practice moons.',
          emotions: {
            curious: 'bounces beside the prompt',
            confident: 'gives a double thumbs-up beam',
            puzzled: 'floats upside down to rethink',
            coaching: 'nudges the next clue closer',
            celebrate: 'throws a meteor confetti burst'
          },
          accent: '#84cc16',
          secondary: '#a855f7',
          belly: '#ecfccb',
          creatureShape: 'orb',
          prop: 'ufo',
          pet: {
            id: 'booplet',
            name: 'Booplet',
            species: 'button blob',
            color: '#a3e635',
            accent: '#a855f7',
            backstory: 'Booplet says boop whenever a learner remembers to prove the answer.'
          }
        }
      ]
    },
    {
      id: 'tidepool-tales',
      name: 'Tidepool Tales',
      tone: 'fun ocean creature reading reef',
      palette: ['#0ea5e9', '#14b8a6', '#f97316'],
      characters: [
        {
          id: 'coral-current',
          name: 'Coral Current',
          role: 'reef reading guide',
          pronouns: 'she/her',
          backstory: 'Coral swims through reef passages and ties bright ribbons around important details. She knows every current carries a clue.',
          emotions: {
            curious: 'follows a swirly clue current',
            confident: 'anchors the proof detail',
            puzzled: 'checks a cloudy tide',
            coaching: 'waves a ribbon at the clue',
            celebrate: 'spins a coral confetti spiral'
          },
          accent: '#f97316',
          secondary: '#0ea5e9',
          belly: '#ffedd5',
          creatureShape: 'fish',
          prop: 'shell',
          pet: {
            id: 'bubblesnap',
            name: 'Bubblesnap',
            species: 'bubble shrimp',
            color: '#fb923c',
            accent: '#0ea5e9',
            backstory: 'Bubblesnap pops bubbles around the best text evidence.'
          }
        },
        {
          id: 'finn-bubblewise',
          name: 'Finn Bubblewise',
          role: 'punctuation puffer',
          pronouns: 'he/him',
          backstory: 'Finn puffs up when end marks are missing. He lets out one bubble for a period, two for a question, and a splash for strong feeling.',
          emotions: {
            curious: 'tests a floating end mark',
            confident: 'puffs the right punctuation',
            puzzled: 'lets a bubble wobble',
            coaching: 'points a fin at the mark',
            celebrate: 'bursts into sparkle bubbles'
          },
          accent: '#0ea5e9',
          secondary: '#facc15',
          belly: '#dbeafe',
          creatureShape: 'puffer',
          prop: 'bubble',
          pet: {
            id: 'popple',
            name: 'Popple',
            species: 'bubble clam',
            color: '#38bdf8',
            accent: '#facc15',
            backstory: 'Popple opens whenever the punctuation matches the sentence purpose.'
          }
        },
        {
          id: 'mira-moonjelly',
          name: 'Mira Moonjelly',
          role: 'glowing inference drifter',
          pronouns: 'she/her',
          backstory: 'Mira glows in soft colors when a story hints at something without saying it directly. She teaches readers to notice tiny shimmer clues.',
          emotions: {
            curious: 'drifts toward a shimmer clue',
            confident: 'glows around the inference',
            puzzled: 'dims and rereads the line',
            coaching: 'lights the strongest hint',
            celebrate: 'rings her jelly bells'
          },
          accent: '#a855f7',
          secondary: '#22d3ee',
          belly: '#f3e8ff',
          creatureShape: 'jelly',
          prop: 'moon',
          pet: {
            id: 'glowdrop',
            name: 'Glowdrop',
            species: 'tiny plankton',
            color: '#c084fc',
            accent: '#67e8f9',
            backstory: 'Glowdrop gathers around clues that imply an answer.'
          }
        },
        {
          id: 'tuck-tidepool',
          name: 'Tuck Tidepool',
          role: 'category crab',
          pronouns: 'he/him',
          backstory: 'Tuck sorts shells, words, and sentence types into tidepool piles. His claws are gentle but very organized.',
          emotions: {
            curious: 'clicks through two clue piles',
            confident: 'sorts the answer shell',
            puzzled: 'tilts one claw at the odd choice',
            coaching: 'nudges a shell into place',
            celebrate: 'does a sideways victory dance'
          },
          accent: '#ef4444',
          secondary: '#f97316',
          belly: '#fee2e2',
          creatureShape: 'crab',
          prop: 'pearl',
          pet: {
            id: 'nipper',
            name: 'Nipper',
            species: 'button barnacle',
            color: '#f87171',
            accent: '#fed7aa',
            backstory: 'Nipper taps the pile where a word or sentence belongs.'
          }
        },
        {
          id: 'shelly-starwhirl',
          name: 'Shelly Starwhirl',
          role: 'main-idea starfish',
          pronouns: 'they/them',
          backstory: 'Shelly spreads five arms across a passage and pulls the most important idea to the center. They are calm, patient, and wonderfully sparkly.',
          emotions: {
            curious: 'touches each detail arm',
            confident: 'centers the big idea',
            puzzled: 'checks which detail matters most',
            coaching: 'points all arms to the topic',
            celebrate: 'twirls into a star spiral'
          },
          accent: '#f59e0b',
          secondary: '#ec4899',
          belly: '#fef3c7',
          creatureShape: 'starfish',
          prop: 'map',
          pet: {
            id: 'sprinklefin',
            name: 'Sprinklefin',
            species: 'reef guppy',
            color: '#fbbf24',
            accent: '#ec4899',
            backstory: 'Sprinklefin swims around details that support the main idea.'
          }
        },
        {
          id: 'otto-octonote',
          name: 'Otto Octonote',
          role: 'note-taking octopus',
          pronouns: 'he/him',
          backstory: 'Otto writes eight tiny notes at once, but he only keeps the notes that prove the answer. His ink is washable and very polite.',
          emotions: {
            curious: 'checks all eight notes',
            confident: 'inks the strongest proof',
            puzzled: 'untangles two note lines',
            coaching: 'hands over one useful note',
            celebrate: 'waves eight happy arms'
          },
          accent: '#7c3aed',
          secondary: '#14b8a6',
          belly: '#ede9fe',
          creatureShape: 'octopus',
          prop: 'notebook',
          pet: {
            id: 'inkywink',
            name: 'Inkywink',
            species: 'ink droplet',
            color: '#6d28d9',
            accent: '#5eead4',
            backstory: 'Inkywink dots the note that should be saved for proof.'
          }
        },
        {
          id: 'nara-narwhirl',
          name: 'Nara Narwhirl',
          role: 'vocabulary wave rider',
          pronouns: 'she/her',
          backstory: 'Nara rides wave curls toward unfamiliar words. Her spiral horn hums when nearby words reveal the meaning.',
          emotions: {
            curious: 'listens to a word wave',
            confident: 'points her horn at the meaning',
            puzzled: 'rides back to reread',
            coaching: 'circles the context clue',
            celebrate: 'makes a glittery wave jump'
          },
          accent: '#06b6d4',
          secondary: '#a855f7',
          belly: '#cffafe',
          creatureShape: 'narwhal',
          prop: 'wave',
          pet: {
            id: 'whirly',
            name: 'Whirly',
            species: 'mini seahorse',
            color: '#22d3ee',
            accent: '#a855f7',
            backstory: 'Whirly curls around nearby words that help define a new one.'
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
    if (set.id === 'arcane-academy' || set.id === 'cosmic-cuties' || set.id === 'tidepool-tales') {
      return renderCreature(character, emotion);
    }
    return renderStudent(character, emotion);
  }

  function renderCreature(character, emotion) {
    const svgId = `${character.id}-${emotion}`;
    const expression = getExpression(emotion);
    const face = getCreatureFace(expression);
    const label = getCharacterDisplayName(character) || character.name;
    return `
      <svg class="character-svg" viewBox="0 0 190 190" role="img" aria-label="${escapeHtml(label)} ${escapeHtml(emotion)} illustration">
        <defs>
          <linearGradient id="${svgId}-body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${character.accent}" />
            <stop offset="1" stop-color="${character.secondary}" />
          </linearGradient>
          <radialGradient id="${svgId}-glow" cx="42%" cy="30%" r="70%">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.82" />
            <stop offset="1" stop-color="${character.secondary}" stop-opacity="0.16" />
          </radialGradient>
        </defs>
        <circle cx="95" cy="95" r="82" fill="url(#${svgId}-glow)" />
        ${renderCreatureBody(character, svgId)}
        ${renderCreatureMarkings(character)}
        ${face}
        ${renderCreatureProp(character)}
      </svg>
    `;
  }

  function renderCreatureBody(character, svgId) {
    const shape = character.creatureShape || 'round';
    const fill = `url(#${svgId}-body)`;
    const belly = character.belly || '#ffffff';
    const common = `
      <ellipse cx="95" cy="119" rx="42" ry="47" fill="${fill}" />
      <ellipse cx="95" cy="130" rx="25" ry="26" fill="${belly}" opacity="0.72" />
    `;
    const ears = '<circle cx="66" cy="67" r="14" fill="inherit" /><circle cx="124" cy="67" r="14" fill="inherit" />';
    if (shape === 'winged') {
      return `
        <path d="M60 116 C20 93 28 55 72 74" fill="${character.secondary}" opacity="0.38" stroke="${character.accent}" stroke-width="4" />
        <path d="M130 116 C170 93 162 55 118 74" fill="${character.secondary}" opacity="0.38" stroke="${character.accent}" stroke-width="4" />
        ${common}
        <circle cx="95" cy="76" r="37" fill="${fill}" />
        <path d="M76 47 L67 25 L90 43 Z M114 47 L124 25 L101 43 Z" fill="${character.secondary}" />
      `;
    }
    if (shape === 'moth') {
      return `
        <path d="M65 117 C15 92 25 43 82 70" fill="${character.secondary}" opacity="0.42" stroke="${character.accent}" stroke-width="4" />
        <path d="M125 117 C175 92 165 43 108 70" fill="${character.secondary}" opacity="0.42" stroke="${character.accent}" stroke-width="4" />
        <ellipse cx="95" cy="119" rx="31" ry="52" fill="${fill}" />
        <circle cx="95" cy="72" r="34" fill="${fill}" />
        <path d="M80 38 C72 22 58 21 56 34 M110 38 C118 22 132 21 134 34" fill="none" stroke="${character.accent}" stroke-width="4" stroke-linecap="round" />
      `;
    }
    if (shape === 'horned') {
      return `
        ${common}
        <circle cx="95" cy="75" r="38" fill="${fill}" />
        <path d="M95 22 L108 56 L82 56 Z" fill="${character.secondary}" stroke="${character.accent}" stroke-width="3" />
        <circle cx="62" cy="76" r="12" fill="${character.secondary}" opacity="0.55" />
        <circle cx="128" cy="76" r="12" fill="${character.secondary}" opacity="0.55" />
      `;
    }
    if (shape === 'mushroom') {
      return `
        ${common}
        <circle cx="95" cy="84" r="34" fill="${fill}" />
        <path d="M53 65 C64 28 127 28 138 65 C119 76 72 76 53 65 Z" fill="${character.accent}" />
        <circle cx="77" cy="56" r="5" fill="${belly}" opacity="0.9" />
        <circle cx="102" cy="48" r="6" fill="${belly}" opacity="0.9" />
        <circle cx="119" cy="60" r="4" fill="${belly}" opacity="0.9" />
      `;
    }
    if (shape === 'lizard') {
      return `
        <path d="M56 135 C28 150 22 119 44 114" fill="none" stroke="${character.accent}" stroke-width="12" stroke-linecap="round" />
        ${common}
        <circle cx="95" cy="76" r="36" fill="${fill}" />
        <path d="M63 58 L52 42 M127 58 L138 42" stroke="${character.secondary}" stroke-width="8" stroke-linecap="round" />
      `;
    }
    if (shape === 'alien' || shape === 'two-antenna') {
      const antenna = shape === 'two-antenna'
        ? '<path d="M80 39 C67 20 55 25 57 37 M110 39 C123 20 135 25 133 37" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" /><circle cx="57" cy="36" r="6" fill="#facc15" /><circle cx="133" cy="36" r="6" fill="#facc15" />'
        : '<path d="M95 39 C90 21 104 18 103 34" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" /><circle cx="104" cy="32" r="7" fill="#facc15" />';
      return `
        ${common}
        <ellipse cx="95" cy="76" rx="42" ry="36" fill="${fill}" />
        ${antenna}
        <circle cx="70" cy="111" r="5" fill="${character.secondary}" opacity="0.65" />
        <circle cx="121" cy="135" r="4" fill="${character.secondary}" opacity="0.65" />
      `;
    }
    if (shape === 'orb' || shape === 'star') {
      const star = shape === 'star'
        ? '<path d="M95 31 L106 61 L138 61 L112 80 L122 111 L95 92 L68 111 L78 80 L52 61 L84 61 Z" fill="url(#' + svgId + '-body)" />'
        : '<circle cx="95" cy="91" r="52" fill="' + fill + '" />';
      return `
        ${star}
        <ellipse cx="95" cy="126" rx="34" ry="30" fill="${belly}" opacity="0.62" />
        <path d="M49 111 C29 118 27 141 49 142 M141 111 C161 118 163 141 141 142" fill="none" stroke="${character.secondary}" stroke-width="10" stroke-linecap="round" />
      `;
    }
    if (shape === 'fish' || shape === 'puffer' || shape === 'narwhal') {
      const spikes = shape === 'puffer'
        ? '<path d="M61 68 L51 55 M131 68 L141 55 M56 112 L43 117 M134 112 L147 117" stroke="' + character.secondary + '" stroke-width="5" stroke-linecap="round" />'
        : '';
      const horn = shape === 'narwhal'
        ? '<path d="M95 35 L106 64 L84 64 Z" fill="#fef3c7" stroke="' + character.secondary + '" stroke-width="3" />'
        : '';
      return `
        <path d="M42 103 L18 79 L18 127 Z" fill="${character.secondary}" opacity="0.72" />
        <ellipse cx="91" cy="103" rx="${shape === 'puffer' ? '54' : '50'}" ry="${shape === 'puffer' ? '50' : '39'}" fill="${fill}" />
        <path d="M130 100 C154 78 166 94 146 111 C166 126 153 141 130 118" fill="${character.secondary}" opacity="0.72" />
        ${horn}
        ${spikes}
        <ellipse cx="93" cy="121" rx="26" ry="18" fill="${belly}" opacity="0.72" />
      `;
    }
    if (shape === 'jelly' || shape === 'octopus') {
      const legs = shape === 'octopus'
        ? '<path d="M58 134 C48 153 62 161 72 144 M78 140 C70 160 89 164 93 145 M112 140 C120 160 101 164 97 145 M132 134 C142 153 128 161 118 144" fill="none" stroke="' + character.accent + '" stroke-width="9" stroke-linecap="round" />'
        : '<path d="M65 129 C58 146 72 150 77 133 M91 132 C84 150 101 151 99 133 M118 129 C128 146 112 150 108 133" fill="none" stroke="' + character.secondary + '" stroke-width="7" stroke-linecap="round" />';
      return `
        <path d="M52 91 C54 46 136 46 138 91 C130 124 60 124 52 91 Z" fill="${fill}" />
        <ellipse cx="95" cy="99" rx="36" ry="20" fill="${belly}" opacity="0.5" />
        ${legs}
      `;
    }
    if (shape === 'crab') {
      return `
        <ellipse cx="95" cy="105" rx="45" ry="35" fill="${fill}" />
        <path d="M52 96 C25 80 22 54 45 57 C58 60 61 78 51 88 M138 96 C165 80 168 54 145 57 C132 60 129 78 139 88" fill="${character.secondary}" stroke="${character.accent}" stroke-width="4" />
        <path d="M62 131 L48 145 M78 135 L66 151 M112 135 L124 151 M128 131 L142 145" stroke="${character.accent}" stroke-width="7" stroke-linecap="round" />
      `;
    }
    if (shape === 'starfish') {
      return `
        <path d="M95 31 L110 78 L160 73 L119 101 L136 148 L95 119 L54 148 L71 101 L30 73 L80 78 Z" fill="${fill}" />
        <circle cx="95" cy="94" r="32" fill="${belly}" opacity="0.45" />
      `;
    }
    return `
      ${common}
      <g fill="${fill}">${ears}</g>
      <circle cx="95" cy="76" r="38" fill="${fill}" />
    `;
  }

  function getCreatureFace(expression) {
    const eyeMap = {
      open: '<circle cx="80" cy="83" r="5" fill="#111827" /><circle cx="110" cy="83" r="5" fill="#111827" />',
      wide: '<circle cx="80" cy="83" r="8" fill="#ffffff" /><circle cx="110" cy="83" r="8" fill="#ffffff" /><circle cx="80" cy="83" r="4" fill="#111827" /><circle cx="110" cy="83" r="4" fill="#111827" />',
      happy: '<path d="M73 83 Q80 76 87 83" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" /><path d="M103 83 Q110 76 117 83" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" />',
      squint: '<path d="M73 83 H87" stroke="#111827" stroke-width="5" stroke-linecap="round" /><path d="M103 83 H117" stroke="#111827" stroke-width="5" stroke-linecap="round" />',
      side: '<circle cx="80" cy="83" r="7" fill="#ffffff" /><circle cx="110" cy="83" r="7" fill="#ffffff" /><circle cx="83" cy="83" r="4" fill="#111827" /><circle cx="113" cy="83" r="4" fill="#111827" />',
      soft: '<path d="M73 82 Q80 86 87 82" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" /><path d="M103 82 Q110 86 117 82" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" />',
      wink: '<path d="M73 82 H87" stroke="#111827" stroke-width="5" stroke-linecap="round" /><circle cx="110" cy="83" r="5" fill="#111827" />',
      down: '<path d="M73 84 Q80 88 87 84" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" /><path d="M103 84 Q110 88 117 84" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" />'
    };
    const browMap = {
      lift: ['M73 70 L86 67', 'M104 67 L118 70'],
      calm: ['M73 70 H87', 'M103 70 H117'],
      quirk: ['M73 68 L86 72', 'M104 72 L118 68'],
      soft: ['M73 71 Q80 68 87 71', 'M103 71 Q110 68 117 71'],
      high: ['M73 64 L87 63', 'M103 63 L117 64'],
      focus: ['M73 68 L87 72', 'M103 72 L117 68'],
      worry: ['M73 73 L87 67', 'M103 67 L117 73']
    };
    const mouthMap = {
      smile: 'M82 99 Q95 108 108 99',
      grin: 'M80 98 Q95 113 110 98',
      bigSmile: 'M78 96 Q95 119 112 96',
      hmm: 'M83 102 Q95 96 107 102',
      talk: 'M84 99 Q95 108 106 99',
      smallTalk: 'M86 100 Q95 105 104 100',
      openTalk: 'M84 98 Q95 114 106 98',
      line: 'M84 102 H106',
      smallFrown: 'M83 106 Q95 98 107 106',
      softSmile: 'M83 99 Q95 107 107 99',
      openSmile: 'M80 97 Q95 116 110 97',
      smirk: 'M83 100 Q95 109 107 102',
      firmSmile: 'M82 99 Q95 104 108 99',
      oh: 'M95 97 C105 97 105 113 95 113 C85 113 85 97 95 97'
    };
    const brows = browMap[expression.brows] || browMap.calm;
    const mouth = mouthMap[expression.mouth] || mouthMap.smile;
    const mouthFill = expression.mouth === 'oh' ? 'fill="#7c2d12"' : 'fill="none" stroke="#7c2d12" stroke-width="5" stroke-linecap="round"';
    return `
      ${expression.cheeks ? '<circle cx="68" cy="94" r="5" fill="#fecaca" opacity="0.34" /><circle cx="122" cy="94" r="5" fill="#fecaca" opacity="0.34" />' : ''}
      ${eyeMap[expression.eyes] || eyeMap.open}
      <path d="${brows[0]}" stroke="#111827" stroke-width="3" stroke-linecap="round" />
      <path d="${brows[1]}" stroke="#111827" stroke-width="3" stroke-linecap="round" />
      <path d="${mouth}" ${mouthFill} />
    `;
  }

  function renderCreatureProp(character) {
    const stroke = character.secondary || character.accent;
    const fill = character.belly || '#fef3c7';
    const props = {
      spellbook: '<rect x="124" y="121" width="42" height="28" rx="5" fill="#fef3c7" stroke="#7c3aed" stroke-width="4" /><path d="M145 121 V149 M131 132 H139 M152 132 H160" stroke="#7c3aed" stroke-width="3" stroke-linecap="round" />',
      broom: '<path d="M123 142 L166 103" stroke="#92400e" stroke-width="5" stroke-linecap="round" /><path d="M153 111 L171 95 L174 117 Z" fill="#facc15" stroke="#92400e" stroke-width="3" />',
      wand: '<path d="M123 137 L164 101" stroke="#7c2d12" stroke-width="5" stroke-linecap="round" /><path d="M164 96 L166 104 M160 100 H170" stroke="#facc15" stroke-width="4" stroke-linecap="round" />',
      cauldron: '<path d="M124 124 H164 L157 151 H131 Z" fill="#111827" stroke="#0f766e" stroke-width="4" /><circle cx="139" cy="116" r="5" fill="#14b8a6" /><circle cx="153" cy="111" r="4" fill="#f97316" />',
      moon: '<path d="M151 102 C131 110 133 139 154 145 C126 150 112 117 133 99 C138 96 145 97 151 102 Z" fill="#fef3c7" stroke="#6366f1" stroke-width="4" />',
      rune: '<path d="M127 119 L163 119 L157 149 L132 149 Z" fill="#d1fae5" stroke="#166534" stroke-width="4" /><path d="M140 128 L153 128 L141 142 L155 142" stroke="#10b981" stroke-width="4" fill="none" stroke-linecap="round" />',
      chalk: '<rect x="126" y="133" width="42" height="12" rx="6" fill="#ffffff" stroke="#64748b" stroke-width="3" /><path d="M131 124 L161 113" stroke="#facc15" stroke-width="4" stroke-linecap="round" />',
      rocket: '<path d="M130 144 C132 116 146 99 164 91 C167 111 160 132 138 150 Z" fill="#e0f2fe" stroke="#0e7490" stroke-width="4" /><circle cx="151" cy="113" r="6" fill="#facc15" /><path d="M133 147 L126 162 L144 152" fill="#f97316" />',
      planet: '<circle cx="145" cy="129" r="19" fill="#ddd6fe" stroke="#7c3aed" stroke-width="4" /><path d="M120 131 C134 119 156 116 171 124" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" />',
      satellite: '<rect x="135" y="119" width="22" height="22" rx="5" fill="#dbeafe" stroke="#2563eb" stroke-width="4" /><path d="M130 116 L115 106 M162 144 L177 154 M158 116 L173 106 M132 144 L117 154" stroke="#f97316" stroke-width="4" stroke-linecap="round" />',
      constellation: '<circle cx="128" cy="119" r="4" fill="#fef3c7" /><circle cx="151" cy="111" r="4" fill="#fef3c7" /><circle cx="165" cy="134" r="4" fill="#fef3c7" /><path d="M128 119 L151 111 L165 134" stroke="#8b5cf6" stroke-width="3" />',
      comet: '<circle cx="153" cy="121" r="12" fill="#facc15" /><path d="M141 121 C123 117 116 105 109 93" stroke="#f97316" stroke-width="7" stroke-linecap="round" />',
      starjar: '<rect x="130" y="111" width="34" height="43" rx="8" fill="#cffafe" stroke="#0f766e" stroke-width="4" /><path d="M147 120 L151 129 L161 129 L153 135 L156 146 L147 140 L138 146 L141 135 L133 129 L143 129 Z" fill="#facc15" />',
      ufo: '<ellipse cx="148" cy="129" rx="28" ry="10" fill="#e9d5ff" stroke="#7c3aed" stroke-width="4" /><path d="M131 128 C136 107 160 107 165 128" fill="#cffafe" stroke="#06b6d4" stroke-width="4" />',
      shell: '<path d="M126 148 C121 126 135 108 151 108 C167 108 175 129 162 148 Z" fill="#ffedd5" stroke="#f97316" stroke-width="4" /><path d="M151 111 V148 M138 119 L145 148 M164 119 L157 148" stroke="#f97316" stroke-width="3" />',
      bubble: '<circle cx="145" cy="127" r="19" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="4" opacity="0.85" /><circle cx="159" cy="105" r="7" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="3" opacity="0.8" />',
      pearl: '<circle cx="148" cy="132" r="17" fill="#f8fafc" stroke="#f97316" stroke-width="4" /><circle cx="141" cy="126" r="5" fill="#ffffff" />',
      map: '<path d="M124 116 L166 107 L162 149 L121 154 Z" fill="#fef3c7" stroke="#0ea5e9" stroke-width="4" /><path d="M134 121 C141 129 139 140 152 144" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" />',
      wave: '<path d="M122 140 C138 117 153 118 167 137 C150 132 146 145 128 148" fill="#cffafe" stroke="#06b6d4" stroke-width="4" />'
    };
    return props[character.prop] || `<circle cx="148" cy="129" r="18" fill="${fill}" stroke="${stroke}" stroke-width="4" />`;
  }

  function renderCreatureMarkings(character) {
    const accent = character.accent;
    const secondary = character.secondary;
    const shape = character.creatureShape || '';
    const markings = {
      spellbook: '<path d="M62 91 C72 104 83 108 95 103" fill="none" stroke="#fef3c7" stroke-width="5" stroke-linecap="round" /><circle cx="123" cy="54" r="5" fill="#facc15" />',
      broom: '<path d="M71 58 C80 49 111 49 120 58" fill="none" stroke="#facc15" stroke-width="5" stroke-linecap="round" /><path d="M72 119 H118" stroke="#166534" stroke-width="5" stroke-linecap="round" opacity="0.7" />',
      wand: '<path d="M70 61 C80 48 108 48 120 61" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.75" /><circle cx="95" cy="52" r="5" fill="#facc15" />',
      cauldron: '<circle cx="73" cy="111" r="6" fill="#f97316" opacity="0.75" /><circle cx="119" cy="118" r="5" fill="#f97316" opacity="0.75" /><path d="M64 143 H126" stroke="#0f766e" stroke-width="5" stroke-linecap="round" />',
      moon: '<path d="M72 54 C65 68 72 81 88 86" fill="none" stroke="#fef3c7" stroke-width="5" stroke-linecap="round" /><circle cx="121" cy="52" r="5" fill="#fef3c7" />',
      rune: '<path d="M76 55 L91 48 L106 55 M72 129 H118" fill="none" stroke="#bbf7d0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />',
      chalk: '<path d="M62 66 C76 56 114 56 128 66" fill="none" stroke="#fef3c7" stroke-width="5" stroke-linecap="round" /><circle cx="75" cy="54" r="4" fill="#fef3c7" /><circle cx="115" cy="54" r="4" fill="#fef3c7" />',
      rocket: '<path d="M63 63 H127" stroke="#fef3c7" stroke-width="5" stroke-linecap="round" opacity="0.75" /><path d="M57 120 C73 130 118 130 134 120" fill="none" stroke="#0e7490" stroke-width="5" stroke-linecap="round" />',
      planet: '<path d="M56 77 C75 63 114 63 134 77" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round" /><circle cx="71" cy="118" r="5" fill="#22c55e" opacity="0.72" />',
      satellite: '<path d="M46 92 C68 77 120 77 144 92" fill="none" stroke="#f97316" stroke-width="5" stroke-linecap="round" /><circle cx="95" cy="55" r="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3" />',
      constellation: '<path d="M74 57 L94 49 L117 62" fill="none" stroke="#fef3c7" stroke-width="4" stroke-linecap="round" /><circle cx="74" cy="57" r="4" fill="#fef3c7" /><circle cx="94" cy="49" r="4" fill="#fef3c7" /><circle cx="117" cy="62" r="4" fill="#fef3c7" />',
      comet: '<path d="M52 103 C67 88 122 88 139 103" fill="none" stroke="#fde68a" stroke-width="5" stroke-linecap="round" /><path d="M75 45 C90 35 106 35 121 45" stroke="#06b6d4" stroke-width="5" stroke-linecap="round" />',
      starjar: '<path d="M63 64 C80 55 111 55 128 64" fill="none" stroke="#facc15" stroke-width="5" stroke-linecap="round" /><circle cx="72" cy="121" r="4" fill="#facc15" /><circle cx="117" cy="134" r="4" fill="#facc15" />',
      ufo: '<path d="M47 111 C68 125 123 125 143 111" fill="none" stroke="#a855f7" stroke-width="5" stroke-linecap="round" /><circle cx="95" cy="47" r="6" fill="#ecfccb" />',
      shell: '<path d="M57 113 C74 124 112 124 129 113" fill="none" stroke="#ffedd5" stroke-width="5" stroke-linecap="round" /><path d="M70 81 L58 69 M120 81 L132 69" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" />',
      bubble: '<circle cx="58" cy="78" r="5" fill="#dbeafe" /><circle cx="128" cy="72" r="6" fill="#dbeafe" /><circle cx="132" cy="116" r="5" fill="#facc15" />',
      pearl: '<circle cx="64" cy="84" r="5" fill="#fef3c7" /><circle cx="126" cy="84" r="5" fill="#fef3c7" /><path d="M66 124 H124" stroke="#fee2e2" stroke-width="5" stroke-linecap="round" />',
      map: '<circle cx="72" cy="74" r="5" fill="#ec4899" /><circle cx="118" cy="74" r="5" fill="#ec4899" /><path d="M63 111 C78 124 112 124 127 111" fill="none" stroke="#ec4899" stroke-width="5" stroke-linecap="round" />',
      notebook: '<path d="M70 128 C84 139 109 139 122 128" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" />',
      wave: '<path d="M53 113 C71 125 119 125 137 113" fill="none" stroke="#a855f7" stroke-width="5" stroke-linecap="round" /><path d="M95 34 L104 62 L86 62 Z" fill="#fef3c7" opacity="0.9" />'
    };
    if (markings[character.prop]) return markings[character.prop];
    if (shape === 'fish') return `<path d="M66 83 C79 75 106 75 120 83" stroke="${secondary}" stroke-width="5" stroke-linecap="round" />`;
    if (shape === 'jelly') return `<circle cx="74" cy="63" r="5" fill="${secondary}" opacity="0.75" /><circle cx="116" cy="63" r="5" fill="${secondary}" opacity="0.75" />`;
    return `<circle cx="70" cy="117" r="4" fill="${secondary}" opacity="0.65" /><circle cx="120" cy="132" r="4" fill="${secondary}" opacity="0.65" />`;
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
    const variant = getStudentVariant(character);
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
        ${renderStudentBody(character, variant)}
        <circle cx="80" cy="71" r="36" fill="${character.skin}" />
        ${renderStudentHair(character, variant)}
        ${renderStudentAccessory(character, variant)}
        ${face}
        ${renderStudentProp(character)}
      </svg>
    `;
  }

  function getStudentVariant(character) {
    const variants = {
      'mina-mapwise': { hair: 'bob', body: 'vest', accessory: 'scarf' },
      'jo-pocket': { hair: 'cap-curls', body: 'pockets', accessory: 'badge-dot' },
      'tessa-thumbprint': { hair: 'pigtails', body: 'apron', accessory: 'headband' },
      'ravi-riddle': { hair: 'curly', body: 'hoodie', accessory: 'round-glasses' },
      'lila-lantern': { hair: 'buns', body: 'coat', accessory: 'neck-tie' },
      'omar-outbox': { hair: 'side-cap', body: 'messenger', accessory: 'mail-pin' },
      'nori-notecard': { hair: 'swoop', body: 'cardigan', accessory: 'square-glasses' },
      'dex-decoder': { hair: 'short', body: 'gadget-vest', accessory: 'headphones' },
      'piper-prism': { hair: 'side-pony', body: 'prism-jacket', accessory: 'visor' },
      'nova-nightline': { hair: 'bob-sleek', body: 'stealth-cape', accessory: 'earpiece' },
      'max-microdot': { hair: 'tuft', body: 'utility', accessory: 'goggles' },
      'sienna-switch': { hair: 'curly-bob', body: 'circuit-jacket', accessory: 'wrist-band' },
      'leo-lockstep': { hair: 'beanie', body: 'field-jacket', accessory: 'step-patch' },
      'quinn-query': { hair: 'undercut', body: 'query-coat', accessory: 'question-visor' }
    };
    return variants[character.id] || { hair: 'bob', body: 'vest', accessory: 'badge-dot' };
  }

  function renderStudentBody(character, variant) {
    const base = {
      vest: '<path d="M55 122 C62 104 95 101 105 122 L114 171 L45 171 Z" fill="' + character.outfit + '" /><path d="M59 126 L99 126 L94 152 L66 152 Z" fill="' + character.accent + '" opacity="0.34" />',
      pockets: '<path d="M51 123 C62 106 98 106 109 123 L117 171 L43 171 Z" fill="' + character.outfit + '" /><rect x="61" y="132" width="18" height="16" rx="3" fill="' + character.accent + '" opacity="0.5" /><rect x="85" y="132" width="18" height="16" rx="3" fill="' + character.secondary + '" opacity="0.5" />',
      apron: '<path d="M50 125 C60 104 101 104 111 125 L113 171 L47 171 Z" fill="' + character.secondary + '" /><path d="M64 121 H98 L103 169 H58 Z" fill="' + character.outfit + '" /><path d="M65 138 H96" stroke="' + character.accent + '" stroke-width="4" stroke-linecap="round" />',
      hoodie: '<path d="M48 125 C61 101 101 101 114 125 L118 171 L43 171 Z" fill="' + character.outfit + '" /><path d="M61 123 C69 113 92 113 101 123" fill="none" stroke="' + character.secondary + '" stroke-width="8" stroke-linecap="round" /><path d="M72 130 V149 M90 130 V149" stroke="' + character.secondary + '" stroke-width="3" stroke-linecap="round" />',
      coat: '<path d="M49 124 C60 105 101 105 112 124 L119 171 L41 171 Z" fill="' + character.outfit + '" /><path d="M80 118 L80 171" stroke="' + character.secondary + '" stroke-width="5" /><path d="M60 139 H75 M86 139 H103" stroke="' + character.accent + '" stroke-width="4" stroke-linecap="round" />',
      messenger: '<path d="M51 124 C62 106 99 106 110 124 L115 171 L45 171 Z" fill="' + character.outfit + '" /><path d="M53 127 L108 160" stroke="' + character.secondary + '" stroke-width="7" stroke-linecap="round" /><rect x="82" y="145" width="25" height="20" rx="4" fill="' + character.accent + '" opacity="0.55" />',
      cardigan: '<path d="M47 124 C60 104 101 104 114 124 L116 171 L44 171 Z" fill="' + character.outfit + '" /><path d="M61 126 L80 171 L101 126" fill="' + character.accent + '" opacity="0.45" /><circle cx="80" cy="138" r="3" fill="' + character.secondary + '" /><circle cx="80" cy="151" r="3" fill="' + character.secondary + '" />',
      'gadget-vest': '<path d="M50 123 C63 104 99 104 112 123 L117 171 L43 171 Z" fill="' + character.outfit + '" /><rect x="59" y="130" width="18" height="28" rx="4" fill="' + character.accent + '" opacity="0.42" /><rect x="84" y="130" width="18" height="28" rx="4" fill="' + character.secondary + '" opacity="0.42" /><circle cx="94" cy="143" r="4" fill="#22c55e" />',
      'prism-jacket': '<path d="M48 126 C59 104 101 104 112 126 L116 171 L44 171 Z" fill="' + character.outfit + '" /><path d="M59 130 L98 128 L88 161 L65 160 Z" fill="' + character.accent + '" opacity="0.48" /><path d="M80 119 L95 143 L67 143 Z" fill="' + character.secondary + '" opacity="0.55" />',
      'stealth-cape': '<path d="M44 122 C58 101 105 101 119 122 L128 174 L35 174 Z" fill="' + character.secondary + '" opacity="0.34" /><path d="M54 124 C64 105 98 105 108 124 L113 171 L47 171 Z" fill="' + character.outfit + '" />',
      utility: '<path d="M49 124 C61 105 100 105 112 124 L116 171 L44 171 Z" fill="' + character.outfit + '" /><path d="M57 136 H105" stroke="' + character.secondary + '" stroke-width="6" stroke-linecap="round" /><rect x="62" y="143" width="13" height="15" rx="3" fill="' + character.accent + '" /><rect x="88" y="143" width="13" height="15" rx="3" fill="' + character.accent + '" />',
      'circuit-jacket': '<path d="M47 124 C60 104 102 104 115 124 L116 171 L44 171 Z" fill="' + character.outfit + '" /><path d="M62 132 H78 V148 H98" fill="none" stroke="' + character.secondary + '" stroke-width="4" stroke-linecap="round" /><circle cx="98" cy="148" r="4" fill="' + character.accent + '" />',
      'field-jacket': '<path d="M50 123 C62 105 100 105 112 123 L116 171 L44 171 Z" fill="' + character.outfit + '" /><path d="M57 129 L104 129 M62 142 H75 M86 142 H100" stroke="' + character.secondary + '" stroke-width="4" stroke-linecap="round" /><path d="M80 123 V171" stroke="' + character.accent + '" stroke-width="4" />',
      'query-coat': '<path d="M48 126 C60 103 101 103 113 126 L120 171 L40 171 Z" fill="' + character.outfit + '" /><path d="M62 132 C73 123 88 123 99 132 L91 164 H70 Z" fill="' + character.secondary + '" opacity="0.45" /><text x="77" y="152" fill="' + character.accent + '" font-size="18" font-weight="900">?</text>'
    };
    return base[variant.body] || base.vest;
  }

  function renderStudentHair(character, variant) {
    const color = character.hair;
    const hair = {
      bob: '<path d="M45 72 C43 38 66 22 91 30 C116 39 124 61 113 80 C102 59 76 49 49 68 Z" fill="' + color + '" />',
      'cap-curls': '<path d="M48 68 C52 34 91 22 115 49 C116 63 110 72 102 77 C99 58 75 52 51 68 Z" fill="' + color + '" /><circle cx="54" cy="75" r="8" fill="' + color + '" /><circle cx="103" cy="75" r="8" fill="' + color + '" />',
      pigtails: '<path d="M49 68 C49 39 68 26 90 31 C111 36 121 54 115 73 C99 56 75 51 52 67 Z" fill="' + color + '" /><circle cx="44" cy="83" r="13" fill="' + color + '" /><circle cx="116" cy="83" r="13" fill="' + color + '" />',
      curly: '<circle cx="55" cy="56" r="13" fill="' + color + '" /><circle cx="70" cy="43" r="14" fill="' + color + '" /><circle cx="89" cy="42" r="15" fill="' + color + '" /><circle cx="106" cy="55" r="13" fill="' + color + '" /><path d="M47 70 C60 52 99 49 115 72 C100 61 74 60 52 72 Z" fill="' + color + '" />',
      buns: '<circle cx="48" cy="61" r="15" fill="' + color + '" /><circle cx="112" cy="61" r="15" fill="' + color + '" /><path d="M50 70 C51 39 72 27 93 33 C111 38 118 57 111 76 C98 58 75 52 51 70 Z" fill="' + color + '" />',
      'side-cap': '<path d="M47 65 C58 34 93 24 113 48 L120 62 C101 55 72 54 48 68 Z" fill="' + color + '" /><path d="M58 39 C78 27 103 32 120 49 L103 51 C88 42 72 41 58 45 Z" fill="' + character.accent + '" />',
      swoop: '<path d="M45 69 C50 38 73 22 97 31 C118 39 124 62 113 79 C99 61 87 48 60 59 C74 56 87 47 96 35 C75 36 59 47 45 69 Z" fill="' + color + '" />',
      short: '<path d="M48 67 C52 37 72 25 94 30 C113 35 122 52 116 75 C102 58 77 51 50 68 Z" fill="' + color + '" /><path d="M63 39 L70 27 L79 40 L88 28 L97 43" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" />',
      'side-pony': '<path d="M46 69 C48 38 70 24 95 31 C116 39 124 62 113 80 C101 60 77 51 49 68 Z" fill="' + color + '" /><path d="M109 76 C137 82 132 116 108 110" fill="' + color + '" />',
      'bob-sleek': '<path d="M45 70 C46 35 70 22 95 31 C117 39 123 64 115 89 C100 67 74 55 50 70 Z" fill="' + color + '" /><path d="M49 75 C53 101 111 103 116 76" fill="none" stroke="' + color + '" stroke-width="12" stroke-linecap="round" />',
      tuft: '<path d="M49 69 C54 43 73 30 95 33 C114 36 122 54 116 76 C100 59 75 53 51 69 Z" fill="' + color + '" /><path d="M76 37 C77 22 91 21 91 38 C96 24 111 27 103 44" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" />',
      'curly-bob': '<circle cx="54" cy="61" r="12" fill="' + color + '" /><circle cx="67" cy="45" r="13" fill="' + color + '" /><circle cx="88" cy="40" r="14" fill="' + color + '" /><circle cx="108" cy="54" r="13" fill="' + color + '" /><circle cx="113" cy="73" r="10" fill="' + color + '" /><path d="M50 72 C67 58 96 58 113 73 Z" fill="' + color + '" />',
      beanie: '<path d="M47 68 C52 38 72 25 95 31 C116 38 123 57 116 75 C101 59 76 52 50 68 Z" fill="' + color + '" /><path d="M52 55 C63 32 102 30 114 55 Z" fill="' + character.accent + '" /><circle cx="84" cy="30" r="7" fill="' + character.secondary + '" />',
      undercut: '<path d="M45 68 C50 38 77 23 105 38 C112 47 116 58 115 75 C96 58 75 54 50 68 Z" fill="' + color + '" /><path d="M45 73 C56 61 63 51 69 37" stroke="' + character.accent + '" stroke-width="7" stroke-linecap="round" />'
    };
    return hair[variant.hair] || hair.bob;
  }

  function renderStudentAccessory(character, variant) {
    const items = {
      scarf: '<path d="M57 106 C69 114 91 115 103 106" fill="none" stroke="' + character.secondary + '" stroke-width="8" stroke-linecap="round" /><path d="M70 111 L62 132" stroke="' + character.secondary + '" stroke-width="7" stroke-linecap="round" />',
      'badge-dot': '<circle cx="102" cy="120" r="6" fill="' + character.secondary + '" stroke="#ffffff" stroke-width="2" />',
      headband: '<path d="M52 62 C65 50 97 49 110 63" fill="none" stroke="' + character.secondary + '" stroke-width="5" stroke-linecap="round" />',
      'round-glasses': '<circle cx="68" cy="74" r="9" fill="none" stroke="' + character.accent + '" stroke-width="3" /><circle cx="92" cy="74" r="9" fill="none" stroke="' + character.accent + '" stroke-width="3" /><path d="M77 74 H83" stroke="' + character.accent + '" stroke-width="3" />',
      'neck-tie': '<path d="M78 112 L88 112 L84 143 L73 130 Z" fill="' + character.secondary + '" />',
      'mail-pin': '<rect x="95" y="116" width="18" height="13" rx="3" fill="' + character.secondary + '" /><path d="M96 117 L104 124 L112 117" stroke="' + character.outfit + '" stroke-width="2" fill="none" />',
      'square-glasses': '<rect x="58" y="67" width="19" height="13" rx="3" fill="none" stroke="' + character.secondary + '" stroke-width="3" /><rect x="84" y="67" width="19" height="13" rx="3" fill="none" stroke="' + character.secondary + '" stroke-width="3" /><path d="M77 73 H84" stroke="' + character.secondary + '" stroke-width="3" />',
      headphones: '<path d="M49 72 C49 38 112 38 112 72" fill="none" stroke="' + character.secondary + '" stroke-width="5" /><rect x="43" y="67" width="10" height="19" rx="4" fill="' + character.secondary + '" /><rect x="108" y="67" width="10" height="19" rx="4" fill="' + character.secondary + '" />',
      visor: '<path d="M58 67 H103 L98 79 H61 Z" fill="' + character.secondary + '" opacity="0.65" />',
      earpiece: '<circle cx="112" cy="78" r="6" fill="' + character.secondary + '" /><path d="M116 82 C124 88 124 99 116 105" fill="none" stroke="' + character.secondary + '" stroke-width="3" stroke-linecap="round" />',
      goggles: '<path d="M58 64 H103" stroke="' + character.secondary + '" stroke-width="4" /><rect x="58" y="66" width="20" height="13" rx="4" fill="#e0f2fe" stroke="' + character.secondary + '" stroke-width="3" /><rect x="84" y="66" width="20" height="13" rx="4" fill="#e0f2fe" stroke="' + character.secondary + '" stroke-width="3" />',
      'wrist-band': '<path d="M123 131 L133 139" stroke="' + character.secondary + '" stroke-width="6" stroke-linecap="round" />',
      'step-patch': '<path d="M99 118 L111 125 L99 132 Z" fill="' + character.secondary + '" />',
      'question-visor': '<path d="M56 65 H104 L100 78 H60 Z" fill="' + character.secondary + '" opacity="0.7" /><text x="76" y="77" font-size="14" font-weight="900" fill="' + character.accent + '">?</text>'
    };
    return items[variant.accessory] || '';
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
    if (character.prop === 'magnifier') {
      return '<circle cx="130" cy="87" r="18" fill="#e0f2fe" stroke="#075985" stroke-width="4" opacity="0.86" /><path d="M143 101 L160 119" stroke="#075985" stroke-width="6" stroke-linecap="round" /><path d="M124 83 H137 M130 77 V92" stroke="#2563eb" stroke-width="3" stroke-linecap="round" />';
    }
    if (character.prop === 'notebook') {
      return '<rect x="120" y="75" width="42" height="52" rx="6" fill="#fef3c7" stroke="#7c2d12" stroke-width="4" /><path d="M129 89 H153 M129 100 H150 M129 111 H145" stroke="#2563eb" stroke-width="3" stroke-linecap="round" /><path d="M121 83 H114 M121 98 H114 M121 113 H114" stroke="#7c2d12" stroke-width="3" stroke-linecap="round" />';
    }
    if (character.prop === 'lantern') {
      return '<path d="M129 77 C129 65 151 65 151 77" fill="none" stroke="#92400e" stroke-width="4" /><rect x="124" y="78" width="32" height="43" rx="7" fill="#fef3c7" stroke="#92400e" stroke-width="4" /><circle cx="140" cy="100" r="10" fill="#facc15" opacity="0.85" />';
    }
    if (character.prop === 'badge') {
      return '<path d="M138 73 L160 86 L154 115 L138 127 L122 115 L116 86 Z" fill="#dbeafe" stroke="#075985" stroke-width="4" /><path d="M127 99 H149 M138 88 V111" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />';
    }
    if (character.prop === 'camera') {
      return '<rect x="118" y="83" width="45" height="34" rx="7" fill="#0f172a" stroke="#14b8a6" stroke-width="4" /><circle cx="141" cy="100" r="10" fill="#e0f2fe" stroke="#2563eb" stroke-width="4" /><path d="M128 78 H145 L149 83 H124 Z" fill="#0f172a" />';
    }
    if (character.prop === 'scanner') {
      return '<rect x="119" y="78" width="38" height="52" rx="8" fill="#111827" stroke="#16a34a" stroke-width="4" /><circle cx="138" cy="101" r="10" fill="#22c55e" opacity="0.82" /><path d="M128 101 L148 101 M138 91 L138 111" stroke="#dcfce7" stroke-width="3" />';
    }
    if (character.prop === 'earpiece') {
      return '<path d="M118 81 C140 67 158 82 154 102" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" /><circle cx="154" cy="104" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="4" /><path d="M123 113 H157" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />';
    }
    if (character.prop === 'tablet') {
      return '<rect x="118" y="80" width="44" height="54" rx="7" fill="#111827" stroke="#f59e0b" stroke-width="4" /><path d="M128 94 H152 M128 107 H148 M128 120 H142" stroke="#22c55e" stroke-width="3" stroke-linecap="round" />';
    }
    if (character.prop === 'switchboard') {
      return '<rect x="116" y="78" width="48" height="48" rx="7" fill="#ecfccb" stroke="#166534" stroke-width="4" /><circle cx="131" cy="94" r="5" fill="#16a34a" /><circle cx="149" cy="94" r="5" fill="#f97316" /><path d="M126 111 H154 M132 105 V117 M148 105 V117" stroke="#166534" stroke-width="3" stroke-linecap="round" />';
    }
    if (character.prop === 'keycard') {
      return '<rect x="119" y="86" width="45" height="32" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="4" /><path d="M129 99 H151 M129 108 H141" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" /><circle cx="154" cy="100" r="4" fill="#1d4ed8" />';
    }
    if (character.prop === 'hologram') {
      return '<path d="M119 112 L141 76 L163 112 Z" fill="#cffafe" stroke="#0891b2" stroke-width="4" opacity="0.82" /><path d="M127 105 H155 M135 91 H147" stroke="#7c3aed" stroke-width="3" stroke-linecap="round" /><circle cx="141" cy="112" r="6" fill="#06b6d4" />';
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
        ${renderDragonMarkings(character)}
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

  function renderDragonMarkings(character) {
    const marks = {
      scroll: '<path d="M74 121 C88 132 107 132 121 121" fill="none" stroke="#fed7aa" stroke-width="6" stroke-linecap="round" /><circle cx="70" cy="91" r="5" fill="#f97316" opacity="0.75" /><circle cx="122" cy="92" r="5" fill="#f97316" opacity="0.75" />',
      quill: '<path d="M68 108 C85 119 108 119 126 108" fill="none" stroke="#bfdbfe" stroke-width="6" stroke-linecap="round" /><path d="M86 40 L79 25 M104 42 L115 27" stroke="#06b6d4" stroke-width="5" stroke-linecap="round" />',
      rune: '<path d="M72 107 L91 96 L110 107 M76 129 H116" fill="none" stroke="#fee2e2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /><path d="M95 50 L95 32" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" />',
      seed: '<path d="M71 112 C84 123 108 123 121 112" fill="none" stroke="#dcfce7" stroke-width="6" stroke-linecap="round" /><path d="M96 49 C87 34 75 36 72 50 M105 50 C119 36 130 39 128 53" fill="none" stroke="#84cc16" stroke-width="5" stroke-linecap="round" />',
      sun: '<path d="M71 111 C85 126 108 126 122 111" fill="none" stroke="#fef3c7" stroke-width="6" stroke-linecap="round" /><path d="M95 42 V25 M78 49 L67 35 M113 49 L126 35" stroke="#facc15" stroke-width="5" stroke-linecap="round" />',
      clock: '<path d="M73 118 H118" stroke="#ede9fe" stroke-width="6" stroke-linecap="round" /><circle cx="95" cy="52" r="9" fill="#ddd6fe" stroke="#6d28d9" stroke-width="3" />',
      cloud: '<path d="M70 112 C86 121 105 121 121 112" fill="none" stroke="#dbeafe" stroke-width="6" stroke-linecap="round" /><path d="M64 51 C74 42 87 45 91 56 C101 43 119 46 124 59" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" />'
    };
    return marks[character.prop] || '';
  }

  function renderPet(pet, mood) {
    if (!pet) return '';
    const label = getPetDisplayName(pet) || pet.name;
    const expression = getExpression(mood || 'curious');
    return `
      <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(label)} ${escapeHtml(pet.species)}">
        <circle cx="50" cy="54" r="36" fill="${pet.color}" opacity="0.22" />
        ${renderPetBody(pet)}
        ${renderPetFace(expression, pet)}
      </svg>
    `;
  }

  function renderPetBody(pet) {
    const species = String(pet.species || '').toLowerCase();
    const color = pet.color;
    const accent = pet.accent;
    if (/snail/.test(species)) {
      return `<path d="M25 68 C35 50 70 50 78 67 C65 77 42 80 25 68 Z" fill="${color}" /><circle cx="42" cy="58" r="17" fill="${accent}" opacity="0.85" /><path d="M34 58 C39 47 53 49 53 61 C53 72 38 73 36 62" fill="none" stroke="${color}" stroke-width="4" /><path d="M73 53 L82 42 M76 54 L91 49" stroke="${accent}" stroke-width="4" stroke-linecap="round" />`;
    }
    if (/hedgehog|hamster|mouse/.test(species)) {
      const spikes = /hedgehog/.test(species) ? '<path d="M24 53 L15 44 M32 45 L26 34 M44 42 L43 30 M57 45 L63 34 M68 53 L79 45" stroke="' + accent + '" stroke-width="5" stroke-linecap="round" />' : '';
      const ears = /mouse/.test(species) ? '<circle cx="31" cy="37" r="10" fill="' + color + '" /><circle cx="69" cy="37" r="10" fill="' + color + '" />' : '<circle cx="34" cy="39" r="8" fill="' + color + '" /><circle cx="66" cy="39" r="8" fill="' + color + '" />';
      const tail = /mouse/.test(species) ? '<path d="M25 69 C8 70 9 88 27 84" fill="none" stroke="' + accent + '" stroke-width="5" stroke-linecap="round" />' : '';
      return `${spikes}${ears}<ellipse cx="50" cy="60" rx="29" ry="23" fill="${color}" />${tail}<circle cx="50" cy="66" r="5" fill="${accent}" opacity="0.35" />`;
    }
    if (/cat|bat|owl/.test(species)) {
      const wings = /bat/.test(species) ? '<path d="M25 58 C6 45 14 31 35 43 M75 58 C94 45 86 31 65 43" fill="' + accent + '" opacity="0.55" />' : '';
      const ears = /owl/.test(species) ? '<path d="M30 41 L38 25 L47 42 M53 42 L62 25 L70 41" fill="' + color + '" />' : '<path d="M30 43 L38 24 L48 43 M52 43 L62 24 L70 43" fill="' + color + '" />';
      return `${wings}${ears}<ellipse cx="50" cy="59" rx="28" ry="26" fill="${color}" /><path d="M38 70 C45 77 55 77 62 70" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" />`;
    }
    if (/cricket|froglet|gecko|newt|salamander|tadpole/.test(species)) {
      const tail = /tadpole|gecko|newt|salamander/.test(species) ? '<path d="M26 65 C7 72 15 91 34 80" fill="none" stroke="' + accent + '" stroke-width="7" stroke-linecap="round" />' : '';
      const legs = /cricket|froglet/.test(species) ? '<path d="M29 70 L15 83 M70 70 L84 83" stroke="' + accent + '" stroke-width="6" stroke-linecap="round" />' : '';
      return `${tail}<ellipse cx="50" cy="58" rx="29" ry="22" fill="${color}" /><circle cx="35" cy="42" r="9" fill="${color}" /><circle cx="65" cy="42" r="9" fill="${color}" />${legs}`;
    }
    if (/moth|puff|sprite|imp|plankton|blob|droplet/.test(species)) {
      const wings = /moth|sprite/.test(species) ? '<path d="M36 61 C9 51 20 25 46 43 M64 61 C91 51 80 25 54 43" fill="' + accent + '" opacity="0.55" />' : '';
      const glow = /puff|blob|droplet|plankton/.test(species) ? '<circle cx="50" cy="58" r="31" fill="' + accent + '" opacity="0.22" />' : '';
      return `${wings}${glow}<ellipse cx="50" cy="58" rx="25" ry="27" fill="${color}" /><path d="M50 31 L58 44 L42 44 Z" fill="${accent}" opacity="0.8" />`;
    }
    if (/fish|whale|guppy|seahorse|shrimp|clam/.test(species)) {
      if (/clam/.test(species)) {
        return `<path d="M21 67 C27 35 73 35 79 67 C66 81 34 81 21 67 Z" fill="${color}" /><path d="M25 66 H75 M34 47 L45 67 M50 42 V68 M66 47 L56 67" stroke="${accent}" stroke-width="4" stroke-linecap="round" />`;
      }
      if (/shrimp/.test(species)) {
        return `<path d="M26 63 C35 39 74 40 78 65 C71 80 42 82 28 68 C51 71 63 63 61 52" fill="${color}" /><path d="M76 58 C91 55 91 72 77 70" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" /><path d="M34 55 L18 45 M38 50 L27 36" stroke="${accent}" stroke-width="3" stroke-linecap="round" />`;
      }
      if (/seahorse/.test(species)) {
        return `<path d="M53 31 C78 33 78 60 57 62 C74 71 69 93 48 83 C60 78 58 69 47 65 C29 56 34 35 53 31 Z" fill="${color}" /><path d="M45 79 C34 87 44 96 55 89" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" />`;
      }
      return `<path d="M22 59 L8 45 L8 73 Z" fill="${accent}" opacity="0.72" /><ellipse cx="48" cy="59" rx="30" ry="22" fill="${color}" /><path d="M74 58 C91 43 94 75 74 62" fill="${accent}" opacity="0.72" />`;
    }
    if (/comet|meteor|rover|microbot|button|radar/.test(species)) {
      if (/rover|microbot|button|radar/.test(species)) {
        return `<rect x="25" y="42" width="50" height="34" rx="13" fill="${color}" /><circle cx="35" cy="78" r="6" fill="${accent}" /><circle cx="65" cy="78" r="6" fill="${accent}" /><path d="M50 42 V29" stroke="${accent}" stroke-width="4" stroke-linecap="round" /><circle cx="50" cy="27" r="5" fill="${accent}" />`;
      }
      return `<path d="M25 64 C5 57 4 39 18 29 C25 42 37 45 50 44" fill="${accent}" opacity="0.55" /><circle cx="57" cy="58" r="24" fill="${color}" /><path d="M39 48 L24 37 M38 60 L16 57 M42 70 L25 80" stroke="${accent}" stroke-width="4" stroke-linecap="round" />`;
    }
    return `<ellipse cx="50" cy="58" rx="27" ry="22" fill="${color}" /><circle cx="36" cy="40" r="10" fill="${color}" /><circle cx="64" cy="40" r="10" fill="${color}" /><path d="M24 67 C8 74 14 90 33 84" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" />`;
  }

  function renderPetFace(expression, pet) {
    const eye = expression.eyes === 'happy'
      ? '<path d="M38 55 Q42 51 46 55" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" /><path d="M55 55 Q59 51 63 55" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" />'
      : '<circle cx="42" cy="55" r="3" fill="#111827" /><circle cx="59" cy="55" r="3" fill="#111827" />';
    const mouth = expression.mouth === 'oh'
      ? '<circle cx="50" cy="65" r="5" fill="#7c2d12" />'
      : '<path d="M41 65 Q50 73 60 65" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round" />';
    return `
      ${eye}
      ${mouth}
      <path d="M50 61 Q48 64 45 61 M50 61 Q52 64 55 61" fill="none" stroke="${pet.accent}" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
    `;
  }

  function renderDragonProp(character) {
    if (character.prop === 'quill') {
      return '<path d="M132 116 C157 97 166 78 162 58 C146 64 131 81 119 110 Z" fill="#e0f2fe" stroke="#075985" stroke-width="4" /><path d="M122 111 L162 61" stroke="#075985" stroke-width="3" />';
    }
    if (character.prop === 'rune') {
      return '<path d="M123 116 L162 116 L155 146 L130 146 Z" fill="#fee2e2" stroke="#991b1b" stroke-width="4" /><path d="M137 126 L149 126 L139 139 L153 139" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />';
    }
    if (character.prop === 'seed') {
      return '<path d="M136 144 C130 125 138 111 154 104 C161 123 154 138 136 144 Z" fill="#bbf7d0" stroke="#166534" stroke-width="4" /><path d="M135 141 C144 130 147 119 154 106" stroke="#166534" stroke-width="3" fill="none" />';
    }
    if (character.prop === 'sun') {
      return '<circle cx="145" cy="124" r="18" fill="#facc15" stroke="#f97316" stroke-width="4" /><path d="M145 96 V105 M145 143 V153 M117 124 H126 M164 124 H174 M126 105 L132 111 M158 137 L164 143 M126 143 L132 137 M158 111 L164 105" stroke="#f97316" stroke-width="4" stroke-linecap="round" />';
    }
    if (character.prop === 'clock') {
      return '<circle cx="145" cy="125" r="21" fill="#ede9fe" stroke="#6d28d9" stroke-width="4" /><path d="M145 112 V126 L156 132" stroke="#6d28d9" stroke-width="4" stroke-linecap="round" /><circle cx="145" cy="126" r="3" fill="#6d28d9" />';
    }
    if (character.prop === 'cloud') {
      return '<path d="M123 133 C113 130 115 113 128 114 C132 101 151 102 154 116 C168 115 172 134 158 139 H128 C126 139 124 136 123 133 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="4" /><path d="M131 126 H157" stroke="#14b8a6" stroke-width="3" stroke-linecap="round" />';
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
