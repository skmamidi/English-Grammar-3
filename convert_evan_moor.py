#!/usr/bin/env python3
"""
Evan Moor JSON to questions_master.js converter
Reads both JSON files, maps questions to subtopics, generates MC format.
"""
import json, os, re, random, textwrap

base = '/Users/kishoremamidi/Documents/GitHub/English-Grammar-3'
js_path = os.path.join(base, 'assets', 'questions_master.js')

# ------------------------------------------------------------------
# Mapping: JSON style -> (subtopic_id, question_template_type)
# ------------------------------------------------------------------
STYLE_MAP = {
    'sentence correction':   ('grammar-sentence-correction', 'sentence_correction'),
    'spelling':              ('vocabulary-spelling', 'spelling'),
    'fact or opinion':       ('reading-comprehension-fact-opinion', 'fact_opinion'),
    'contextual meaning':    ('vocabulary-word-meaning-context', 'contextual_meaning'),
    'analogy completion':    ('reading-comprehension-analogies', 'analogy'),
    'verb tense':            ('grammar-tenses', 'verb_tense'),
    'sentence combination':  ('grammar-sentence-combinations', 'sentence_combination'),
    'syllabication':         ('vocabulary-spelling', 'syllabication'),
    'syllable counting':     ('vocabulary-spelling', 'syllable_counting'),
    'noun types':            ('grammar-parts-of-speech-nouns', 'noun_types'),
    'noun number':           ('grammar-singular-plural-nouns', 'noun_number'),
    'alphabetical order':    ('reference-skills-alphabetical-order', 'alphabetical_order'),
    'dictionary guide words':('reference-skills-dictionary-guide-words', 'guide_words'),
    'friendly letter parts': ('grammar-friendly-letter', 'friendly_letter'),
    'parts of speech':       ('grammar-parts-of-speech-nouns', 'parts_of_speech'),
    'grammar and mechanics': ('grammar-correct-article', 'grammar_mechanics'),
    'fill in the blank':     ('grammar-subject-verb-agreement', 'fill_blank'),
    'subject and predicate': ('grammar-subject-predicate', 'subject_predicate'),
    'phonics':               ('vocabulary-vowel-sounds', 'phonics'),
    'rhyming':               ('vocabulary-rhyming', 'rhyming'),
    'using homophones':      ('vocabulary-homophones', 'homophones'),
    'inference (location/context)': ('reading-comprehension-inference', 'inference'),
    'identifying complete sentences': ('grammar-identify-sentence', 'complete_sentence'),
    'categorization':        ('reading-comprehension-categorizing', 'categorization'),
    'cause and effect':      ('reading-comprehension-cause-effect', 'cause_effect'),
    'paragraph editing':     ('grammar-paragraph-editing', 'paragraph_editing'),
    'fact or fantasy':       ('reading-comprehension-fact-fantasy', 'fact_fantasy'),
    'sentence types':        ('grammar-sentence-types', 'sentence_types'),
    'writing opinion':       ('reading-comprehension-fact-opinion', 'writing_opinion'),
    'synonyms':              ('vocabulary-synonyms-antonyms', 'synonyms'),
    'antonyms':              ('vocabulary-synonyms-antonyms', 'antonyms'),
    'synonyms or antonyms':  ('vocabulary-synonyms-antonyms', 'syn_ant'),
    'root words / affixes':  ('vocabulary-base-words', 'root_words'),
    'contractions':          ('vocabulary-contractions', 'contractions'),
    'plural nouns':          ('grammar-singular-plural-nouns', 'plural_nouns'),
    'double negatives':      ('grammar-double-negatives', 'double_negatives'),
    'possessives':           ('punctuation-apostrophes-possessives', 'possessives'),
    'reference skills':      ('reference-skills-dictionary-guide-words', 'reference_skills'),
}

# Study aid templates per subtopic
STUDY_AIDS = {
    'grammar-sentence-correction': {
        'definition': 'A correct sentence follows capitalization, punctuation, spelling, and grammar rules.',
        'example': 'Correct: "She went to the store." Incorrect: "she went to the store"',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'vocabulary-spelling': {
        'definition': 'Spelling is the correct arrangement of letters to form a word.',
        'example': 'Correct: "friend." Incorrect: "frend."',
        'link': 'https://www.readingrockets.org/article/spelling',
        'linkText': 'Reading Rockets - Spelling'
    },
    'reading-comprehension-fact-opinion': {
        'definition': 'A fact can be proven true. An opinion is what someone thinks or feels.',
        'example': 'Fact: "Water freezes at 32°F." Opinion: "Winter is the best season."',
        'link': 'https://www.readingrockets.org/article/fact-or-opinion',
        'linkText': 'Reading Rockets - Fact or Opinion'
    },
    'vocabulary-word-meaning-context': {
        'definition': 'Context clues are hints in the sentence that help you figure out the meaning of an unknown word.',
        'example': '"The frigid wind made us shiver." Frigid means very cold.',
        'link': 'https://www.readingrockets.org/article/using-context-clues',
        'linkText': 'Reading Rockets - Context Clues'
    },
    'reading-comprehension-analogies': {
        'definition': 'An analogy shows a relationship between two pairs of words.',
        'example': 'Hot is to cold as up is to down.',
        'link': 'https://www.khanacademy.org/test-prep/vocabulary/analogies',
        'linkText': 'Khan Academy - Analogies'
    },
    'grammar-tenses': {
        'definition': 'Verb tense tells when an action happens: past, present, or future.',
        'example': 'Past: walked. Present: walks. Future: will walk.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-sentence-combinations': {
        'definition': 'Sentence combining joins two or more simple sentences into one smoother sentence.',
        'example': 'The dog barked. The dog wagged its tail. -> The dog barked and wagged its tail.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-parts-of-speech-nouns': {
        'definition': 'A noun is a person, place, thing, or idea. A proper noun names a specific person, place, or thing and is capitalized.',
        'example': 'Common noun: city. Proper noun: Paris.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-singular-plural-nouns': {
        'definition': 'Singular means one. Plural means more than one.',
        'example': 'Singular: cat. Plural: cats.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'reference-skills-alphabetical-order': {
        'definition': 'Alphabetical order means arranging words from A to Z based on the alphabet.',
        'example': 'apple, banana, cherry',
        'link': 'https://www.readingrockets.org/article/alphabetical-order',
        'linkText': 'Reading Rockets - Alphabetical Order'
    },
    'reference-skills-dictionary-guide-words': {
        'definition': 'Guide words at the top of a dictionary page show the first and last words on that page.',
        'example': 'Guide words: cat - dog. The word "deer" would be on this page.',
        'link': 'https://www.readingrockets.org/article/dictionary-skills',
        'linkText': 'Reading Rockets - Dictionary Skills'
    },
    'grammar-friendly-letter': {
        'definition': 'A friendly letter has five parts: heading, greeting, body, closing, and signature.',
        'example': 'Heading: 123 Main St. Greeting: Dear Sam,',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-correct-article': {
        'definition': 'Use "a" before words that start with a consonant sound and "an" before words that start with a vowel sound.',
        'example': 'a dog, an apple',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-subject-predicate': {
        'definition': 'The subject tells who or what the sentence is about. The predicate tells what the subject does.',
        'example': 'The cat (subject) sleeps on the couch (predicate).',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-subject-verb-agreement': {
        'definition': 'The subject and verb must agree in number. Singular subjects need singular verbs; plural subjects need plural verbs.',
        'example': 'She walks. They walk.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'vocabulary-vowel-sounds': {
        'definition': 'Vowel sounds are made by the letters a, e, i, o, u, and sometimes y.',
        'example': 'The long /a/ sound in "cake" sounds like the letter name A.',
        'link': 'https://www.readingrockets.org/article/phonics',
        'linkText': 'Reading Rockets - Phonics'
    },
    'vocabulary-rhyming': {
        'definition': 'Rhyming words have the same ending sounds.',
        'example': 'cat, hat, bat',
        'link': 'https://www.readingrockets.org/article/rhyming',
        'linkText': 'Reading Rockets - Rhyming'
    },
    'vocabulary-homophones': {
        'definition': 'Homophones are words that sound the same but have different meanings and spellings.',
        'example': 'their (belonging to them), there (a place), they\'re (they are)',
        'link': 'https://www.readingrockets.org/article/homophones',
        'linkText': 'Reading Rockets - Homophones'
    },
    'reading-comprehension-inference': {
        'definition': 'An inference is a conclusion you draw based on clues in the text plus what you already know.',
        'example': 'If someone is wearing a swim suit and carrying a towel, you can infer they are going swimming.',
        'link': 'https://www.readingrockets.org/article/making-inferences',
        'linkText': 'Reading Rockets - Inference'
    },
    'grammar-identify-sentence': {
        'definition': 'A complete sentence has a subject and a predicate and expresses a complete thought.',
        'example': 'Complete: The sun shines. Incomplete: Shines brightly.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'reading-comprehension-categorizing': {
        'definition': 'Categorizing means grouping things that are alike based on shared traits.',
        'example': 'Apple, banana, and orange are all fruits.',
        'link': 'https://www.readingrockets.org/article/categorizing',
        'linkText': 'Reading Rockets - Categorizing'
    },
    'reading-comprehension-cause-effect': {
        'definition': 'Cause is why something happens. Effect is what happens.',
        'example': 'Cause: It rained. Effect: The ground got wet.',
        'link': 'https://www.readingrockets.org/article/cause-and-effect',
        'linkText': 'Reading Rockets - Cause and Effect'
    },
    'grammar-paragraph-editing': {
        'definition': 'When editing a paragraph, look for capitalization, punctuation, spelling, and grammar errors.',
        'example': 'Check that sentences start with capital letters and end with correct punctuation.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'reading-comprehension-fact-fantasy': {
        'definition': 'Fact is something that can be proven true. Fantasy is make-believe and could not happen in real life.',
        'example': 'Fact: Birds can fly. Fantasy: Pigs can fly.',
        'link': 'https://www.readingrockets.org/article/fact-or-fantasy',
        'linkText': 'Reading Rockets - Fact or Fantasy'
    },
    'grammar-sentence-types': {
        'definition': 'A statement tells something. A question asks something. A command tells someone to do something. An exclamation shows strong feeling.',
        'example': 'Statement: It is sunny. Question: Is it sunny? Command: Close the door. Exclamation: What a beautiful day!',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'vocabulary-synonyms-antonyms': {
        'definition': 'Synonyms are words with similar meanings. Antonyms are words with opposite meanings.',
        'example': 'Synonyms: happy, joyful. Antonyms: hot, cold.',
        'link': 'https://www.readingrockets.org/article/synonyms-and-antonyms',
        'linkText': 'Reading Rockets - Synonyms and Antonyms'
    },
    'vocabulary-base-words': {
        'definition': 'A base word is the main part of a word. A prefix is added to the beginning. A suffix is added to the end.',
        'example': 'Base: kind. Prefix: unkind. Suffix: kindness.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'vocabulary-contractions': {
        'definition': 'A contraction is a shortened form of two words. An apostrophe replaces the missing letters.',
        'example': 'do not -> don\'t, will not -> won\'t',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'grammar-double-negatives': {
        'definition': 'A double negative uses two negative words when only one is needed. It makes the sentence confusing.',
        'example': 'Incorrect: I don\'t have no money. Correct: I don\'t have any money.',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
    'punctuation-apostrophes-possessives': {
        'definition': 'Use an apostrophe and s to show that something belongs to someone.',
        'example': 'The dog\'s bone. The girls\' room (plural).',
        'link': 'https://www.khanacademy.org/humanities/grammar',
        'linkText': 'Khan Academy Grammar'
    },
}

# Generic study aid fallback
GENERIC_STUDY_AID = {
    'definition': 'Read carefully and look for clues in the question to find the best answer.',
    'example': 'Think about what you know and what the question is asking.',
    'link': 'https://www.khanacademy.org/humanities/grammar',
    'linkText': 'Khan Academy Grammar'
}

def escape_js_string(s):
    if not isinstance(s, str):
        s = str(s)
    s = s.replace('\\', '\\\\')
    s = s.replace('"', '\\"')
    s = s.replace('\n', '\\n')
    s = s.replace('\r', '')
    return s

def make_explanations(choices, correct_idx, qtype, correct_answer):
    """Generate explanation.correct and explanation.incorrect array."""
    explanations = []
    for i, choice in enumerate(choices):
        if i == correct_idx:
            explanations.append(f"CORRECT: {correct_answer}")
        else:
            explanations.append(f"This is incorrect because it does not match the rules for {qtype.replace('_', ' ')}.")
    
    correct_exp = f"The correct answer is {chr(65+correct_idx)}. {correct_answer}"
    incorrect_arr = explanations
    return correct_exp, incorrect_arr

def to_mc_spelling(q):
    opts = q.get('options', [])
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    if len(opts) < 4:
        # Pad with distractors
        while len(opts) < 4:
            opts.append(f"option{len(opts)}")
    elif len(opts) > 4:
        opts = opts[:4]
        if ans not in opts:
            opts[3] = ans
    try:
        correct_idx = opts.index(ans)
    except ValueError:
        opts[0] = ans
        correct_idx = 0
    random.shuffle(opts)
    correct_idx = opts.index(ans)
    return opts, correct_idx, ans

def to_mc_fill_blank(q):
    opts = q.get('options', [])
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    if len(opts) < 4:
        while len(opts) < 4:
            opts.append(f"choice{len(opts)}")
    elif len(opts) > 4:
        opts = opts[:4]
        if ans not in opts:
            opts[3] = ans
    try:
        correct_idx = opts.index(ans)
    except ValueError:
        opts[0] = ans
        correct_idx = 0
    return opts, correct_idx, ans

def to_mc_guide_words(q):
    opts = q.get('options', [])
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    if len(opts) < 4:
        while len(opts) < 4:
            opts.append(f"word{len(opts)}")
    elif len(opts) > 4:
        opts = opts[:4]
        if ans not in opts:
            opts[3] = ans
    try:
        correct_idx = opts.index(ans)
    except ValueError:
        opts[0] = ans
        correct_idx = 0
    return opts, correct_idx, ans

def to_mc_categorization(q):
    opts = q.get('options', [])
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    if len(opts) < 4:
        while len(opts) < 4:
            opts.append(f"item{len(opts)}")
    elif len(opts) > 4:
        opts = opts[:4]
        if ans not in opts:
            opts[3] = ans
    try:
        correct_idx = opts.index(ans)
    except ValueError:
        opts[0] = ans
        correct_idx = 0
    return opts, correct_idx, ans

def to_mc_sentence_correction(q):
    """Generate 4 choices for sentence correction."""
    correct = q['answer']
    if isinstance(correct, list):
        correct = correct[0]
    correct = str(correct)
    original = q['question']
    # Capitalize first letter of original to make it look like an option
    original_cap = original[0].upper() + original[1:] if original else original
    if not original_cap.endswith(('.', '?', '!')):
        original_cap += '.'
    
    # Generate distractors by introducing common errors to the correct sentence
    distractors = [original_cap]
    
    # Distractor 1: lowercase proper nouns (simple heuristic)
    d1 = correct
    for word in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
                 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                 'September', 'October', 'November', 'December', 'Christmas', 'Halloween',
                 'Mother', 'Father', 'Dr.', 'Mr.', 'Mrs.', 'Ms.']:
        d1 = d1.replace(word, word.lower())
    if d1 != correct:
        distractors.append(d1)
    
    # Distractor 2: remove commas
    d2 = correct.replace(',', '')
    if d2 != correct and d2 not in distractors:
        distractors.append(d2)
    
    # Distractor 3: wrong contraction/homophone
    d3 = correct.replace("doesn't", "dont").replace("don't", "aint").replace("can't", "cant")
    d3 = d3.replace("isn't", "aint").replace("won't", "wont")
    if d3 != correct and d3 not in distractors:
        distractors.append(d3)
    
    # Distractor 4: wrong pronoun
    d4 = correct.replace("He and I", "Me and him").replace("She and I", "Her and me")
    d4 = d4.replace("Marcos and I", "Me and Marcos")
    if d4 != correct and d4 not in distractors:
        distractors.append(d4)
    
    # Ensure we have at least 3 distractors
    while len(distractors) < 3:
        distractors.append(correct + " (wrong)")
    
    choices = [correct] + distractors[:3]
    random.shuffle(choices)
    correct_idx = choices.index(correct)
    return choices, correct_idx, correct

def to_mc_analogy(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans)
    # Clean up answer
    ans_clean = ans.split('(')[0].strip().lower()
    # Generate distractors
    distractors = []
    if ans_clean == 'cold':
        distractors = ['warm', 'freezing', 'wet']
    elif ans_clean == 'three':
        distractors = ['four', 'two', 'five']
    elif ans_clean == 'hear':
        distractors = ['sing', 'dance', 'play']
    elif ans_clean == 'oink':
        distractors = ['moo', 'baa', 'neigh']
    elif ans_clean == 'owed':
        distractors = ['paid', 'lent', 'spent']
    elif ans_clean == 'cloudy':
        distractors = ['sunny', 'rainy', 'windy']
    elif ans_clean == 'leave':
        distractors = ['enter', 'stay', 'sit']
    elif ans_clean == 'present':
        distractors = ['past', 'future', 'now']
    elif ans_clean == 'closed':
        distractors = ['shut', 'locked', 'dark']
    elif ans_clean == 'beginner':
        distractors = ['expert', 'teacher', 'student']
    elif ans_clean == 'open':
        distractors = ['closed', 'locked', 'shut']
    elif ans_clean == 'mad':
        distractors = ['happy', 'sad', 'scared']
    elif ans_clean == 'aggressive':
        distractors = ['calm', 'sleepy', 'gentle']
    elif ans_clean == 'breakfast':
        distractors = ['lunch', 'dinner', 'snack']
    elif ans_clean == 'handlebars':
        distractors = ['wheels', 'pedals', 'seat']
    elif ans_clean == 'boring':
        distractors = ['fun', 'exciting', 'scary']
    elif ans_clean == 'start':
        distractors = ['begin', 'go', 'run']
    elif ans_clean == 'classroom':
        distractors = ['library', 'gym', 'cafeteria']
    elif ans_clean == 'swimming pool':
        distractors = ['park', 'school', 'store']
    elif ans_clean == 'kitchen':
        distractors = ['bedroom', 'bathroom', 'garage']
    elif ans_clean == 'green':
        distractors = ['red', 'yellow', 'blue']
    elif ans_clean == 'smooth':
        distractors = ['rough', 'bumpy', 'soft']
    elif ans_clean == 'awake':
        distractors = ['sleepy', 'tired', 'rested']
    elif ans_clean == 'west':
        distractors = ['north', 'south', 'east']
    elif ans_clean == 'hand':
        distractors = ['arm', 'foot', 'leg']
    elif ans_clean == 'February':
        distractors = ['January', 'March', 'April']
    elif ans_clean == 'asleep':
        distractors = ['awake', 'sleepy', 'rested']
    elif ans_clean == 'shamrocks':
        distractors = ['hearts', 'pumpkins', 'turkeys']
    elif ans_clean == 'breakfast':
        distractors = ['lunch', 'dinner', 'snack']
    elif ans_clean == 'twelve':
        distractors = ['six', 'ten', 'twenty']
    elif ans_clean == 'dime':
        distractors = ['penny', 'nickel', 'quarter']
    elif ans_clean == 'tiny':
        distractors = ['big', 'huge', 'giant']
    elif ans_clean == 'square':
        distractors = ['circle', 'triangle', 'oval']
    elif ans_clean == 'odd':
        distractors = ['even', 'prime', 'whole']
    elif ans_clean == 'letter':
        distractors = ['number', 'word', 'sentence']
    elif ans_clean == 'parties':
        distractors = ['party', 'partied', 'partying']
    elif ans_clean == 'orange':
        distractors = ['brown', 'black', 'white']
    else:
        # Generic distractors
        distractors = ['wrong', 'incorrect', 'different']
    
    choices = [ans_clean] + distractors[:3]
    # Ensure uniqueness
    seen = set()
    unique = []
    for c in choices:
        if c.lower() not in seen:
            seen.add(c.lower())
            unique.append(c)
    while len(unique) < 4:
        unique.append(f"option{len(unique)}")
    choices = unique[:4]
    random.shuffle(choices)
    correct_idx = None
    for i, c in enumerate(choices):
        if c.lower() == ans_clean:
            correct_idx = i
            break
    if correct_idx is None:
        choices[0] = ans_clean
        correct_idx = 0
    return choices, correct_idx, ans_clean

def to_mc_fact_opinion(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['fact', 'opinion', 'both', 'neither']
    correct_idx = 0 if 'fact' in ans else 1
    return choices, correct_idx, ans

def to_mc_verb_tense(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['past', 'present', 'future', 'none of these']
    correct_idx = choices.index(ans) if ans in choices else 0
    return choices, correct_idx, ans

def to_mc_contextual_meaning(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans)
    # Extract clean answer
    ans_clean = ans.split('/')[0].strip().lower()
    # Generate distractors based on context clues
    distractors = {
        'open': ['closed', 'locked', 'broken'],
        'person walking': ['driver', 'police officer', 'child'],
        'beginner': ['expert', 'teacher', 'rider'],
        'starving': ['full', 'tired', 'thirsty'],
        'cloudy': ['sunny', 'clear', 'bright'],
        'leave': ['enter', 'stay', 'arrive'],
        'owed': ['paid', 'lent', 'spent'],
        'hear': ['see', 'touch', 'taste'],
        'oink': ['moo', 'baa', 'neigh'],
        'funny': ['serious', 'sad', 'angry'],
        'floated in one place': ['flew away', 'fell down', 'ran fast'],
        'torn': ['new', 'clean', 'pretty'],
        'torn / shredded': ['new', 'clean', 'pretty'],
        'dress up / pretend to be': ['hide', 'run away', 'sleep'],
        'sick': ['healthy', 'strong', 'happy'],
        'fascinating / interesting': ['boring', 'sad', 'scary'],
        'lives': ['works', 'plays', 'eats'],
        'funny': ['serious', 'boring', 'scary'],
        'book of maps': ['book of stories', 'book of poems', 'book of pictures'],
        'aggressive / ready to fight': ['calm', 'sleepy', 'gentle'],
        'person walking': ['driver', 'biker', 'runner'],
        'mad / angry': ['happy', 'sad', 'scared'],
        'talking / conversation': ['singing', 'dancing', 'reading'],
        'bother / tease / annoy': ['help', 'praise', 'comfort'],
        'happy / overjoyed': ['sad', 'angry', 'tired'],
        'determined / stubborn': ['lazy', 'sleepy', 'careless'],
        'wrong / incorrect': ['right', 'perfect', 'exact'],
        'trash / garbage': ['treasure', 'food', 'clothes'],
        'begged / asked': ['demanded', 'refused', 'ignored'],
        'nonstop / continuous': ['quiet', 'rare', 'short'],
        'floated in one place / flew in place': ['flew away', 'landed', 'fell'],
    }
    
    key = ans_clean
    if key not in distractors:
        # Try partial match
        for k in distractors:
            if k in ans.lower() or ans.lower() in k:
                key = k
                break
    
    dlist = distractors.get(key, ['wrong', 'incorrect', 'different'])
    choices = [ans_clean] + dlist[:3]
    seen = set()
    unique = []
    for c in choices:
        if c.lower() not in seen:
            seen.add(c.lower())
            unique.append(c)
    while len(unique) < 4:
        unique.append(f"choice{len(unique)}")
    choices = unique[:4]
    random.shuffle(choices)
    correct_idx = None
    for i, c in enumerate(choices):
        if c.lower() == ans_clean:
            correct_idx = i
            break
    if correct_idx is None:
        choices[0] = ans_clean
        correct_idx = 0
    return choices, correct_idx, ans_clean

def to_mc_noun_types(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['common noun', 'proper noun', 'singular noun', 'plural noun']
    if 'common' in ans:
        correct_idx = 0
    elif 'proper' in ans:
        correct_idx = 1
    elif 'singular' in ans:
        correct_idx = 2
    elif 'plural' in ans:
        correct_idx = 3
    else:
        correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_noun_number(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['singular', 'plural', 'possessive', 'proper']
    if 'singular' in ans and 'possessive' not in ans:
        correct_idx = 0
    elif 'plural' in ans and 'possessive' not in ans:
        correct_idx = 1
    elif 'possessive' in ans and 'plural' not in ans:
        correct_idx = 2
    elif 'plural possessive' in ans:
        correct_idx = 2  # closest
    elif 'singular possessive' in ans:
        correct_idx = 2
    else:
        correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_friendly_letter(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['heading', 'greeting', 'body', 'closing']
    for i, c in enumerate(choices):
        if c in ans:
            correct_idx = i
            return choices, correct_idx, c
    correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_parts_of_speech(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['noun', 'verb', 'adjective', 'adverb']
    for i, c in enumerate(choices):
        if c in ans:
            correct_idx = i
            return choices, correct_idx, c
    correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_subject_predicate(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['subject', 'predicate', 'verb', 'noun']
    for i, c in enumerate(choices):
        if c in ans:
            correct_idx = i
            return choices, correct_idx, c
    correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_complete_sentence(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['sentence', 'not a sentence', 'fragment', 'run-on']
    if 'not' in ans or 'no' in ans:
        correct_idx = 1
    elif 'sentence' in ans:
        correct_idx = 0
    else:
        correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_sentence_types(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['statement', 'command', 'question', 'exclamation']
    for i, c in enumerate(choices):
        if c in ans:
            correct_idx = i
            return choices, correct_idx, c
    correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_sentence_combination(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans)
    # For sentence combination, use the correct combined sentence
    correct = ans.split('.')[0] + '.' if '.' in ans else ans
    distractors = [
        q['question'].split('.')[0] + '.',  # first sentence only
        q['question'].split('.')[1].strip() + '.' if '.' in q['question'] else q['question'],
        correct.replace('and', 'but').replace('because', 'so'),
    ]
    choices = [correct] + distractors[:3]
    seen = set()
    unique = []
    for c in choices:
        if c.lower() not in seen:
            seen.add(c.lower())
            unique.append(c)
    while len(unique) < 4:
        unique.append(f"choice{len(unique)}")
    choices = unique[:4]
    random.shuffle(choices)
    correct_idx = 0
    for i, c in enumerate(choices):
        if c == correct:
            correct_idx = i
            break
    return choices, correct_idx, correct

def to_mc_fact_fantasy(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['fact', 'fantasy', 'fiction', 'nonfiction']
    if 'fact' in ans and 'fantasy' not in ans:
        correct_idx = 0
    elif 'fantasy' in ans or 'fiction' in ans:
        correct_idx = 1
    else:
        correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_root_words(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    choices = ['prefix', 'suffix', 'base word', 'root']
    for i, c in enumerate(choices):
        if c in ans:
            correct_idx = i
            return choices, correct_idx, c
    correct_idx = 0
    return choices, correct_idx, choices[correct_idx]

def to_mc_synonyms(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    # Extract first word
    first = ans.split('/')[0].strip()
    distractors = ['wrong', 'different', 'opposite']
    choices = [first] + distractors
    random.shuffle(choices)
    correct_idx = choices.index(first)
    return choices, correct_idx, first

def to_mc_antonyms(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    first = ans.split('/')[0].strip()
    distractors = ['same', 'similar', 'alike']
    choices = [first] + distractors
    random.shuffle(choices)
    correct_idx = choices.index(first)
    return choices, correct_idx, first

def to_mc_homophones(q):
    # Skip open-ended "write a sentence" questions
    return None, None, None

def to_mc_rhyming(q):
    # Skip open-ended "write words" questions
    return None, None, None

def to_mc_inference(q):
    ans = q['answer']
    if isinstance(ans, list):
        ans = ans[0]
    ans = str(ans).lower()
    # Extract location
    loc = ans.split('/')[0].strip()
    distractors = {
        'classroom': ['park', 'store', 'kitchen'],
        'school': ['park', 'store', 'kitchen'],
        'swimming pool': ['park', 'school', 'store'],
        'kitchen': ['bedroom', 'bathroom', 'garage'],
        'a school bus': ['train', 'airplane', 'boat'],
        'a playground': ['classroom', 'kitchen', 'store'],
        'a baseball game': ['football game', 'soccer game', 'basketball game'],
        'a library': ['bookstore', 'classroom', 'museum'],
        'restaurant': ['store', 'school', 'park'],
        'classroom / art class': ['gym', 'library', 'cafeteria'],
        'an airplane or car': ['train', 'bus', 'boat'],
        'in an airplane (or car)': ['train', 'bus', 'boat'],
        'at a zoo': ['park', 'farm', 'aquarium'],
    }
    dlist = distractors.get(loc, ['wrong place', 'different place', 'nowhere'])
    choices = [loc] + dlist[:3]
    seen = set()
    unique = []
    for c in choices:
        if c.lower() not in seen:
            seen.add(c.lower())
            unique.append(c)
    while len(unique) < 4:
        unique.append(f"place{len(unique)}")
    choices = unique[:4]
    random.shuffle(choices)
    correct_idx = None
    for i, c in enumerate(choices):
        if c.lower() == loc:
            correct_idx = i
            break
    if correct_idx is None:
        choices[0] = loc
        correct_idx = 0
    return choices, correct_idx, loc

def to_mc_cause_effect(q):
    ans = q['answer']
    # These are complex; skip for now or create simple versions
    return None, None, None

def to_mc_paragraph_editing(q):
    # Complex multi-part; skip
    return None, None, None

def to_mc_writing_opinion(q):
    # Open-ended; skip
    return None, None, None

def to_mc_phonics(q):
    return to_mc_fill_blank({'options': q.get('options', []), 'answer': q['answer']})

def to_mc_grammar_mechanics(q):
    return to_mc_fill_blank(q)

def to_mc_syllabication(q):
    return to_mc_fill_blank(q)

def to_mc_syllable_counting(q):
    q2 = q.copy()
    if 'options' not in q2 or not q2['options']:
        # For "circle words with N syllables"
        return None, None, None
    return to_mc_categorization(q)

def to_mc_alphabetical_order(q):
    return to_mc_categorization(q)

def to_mc_contractions(q):
    return to_mc_fill_blank(q)

def to_mc_double_negatives(q):
    return to_mc_sentence_correction(q)

def to_mc_possessives(q):
    return to_mc_fill_blank(q)

def to_mc_reference_skills(q):
    return to_mc_categorization(q)

def to_mc_plural_nouns(q):
    return to_mc_categorization(q)

# Dispatcher
DISPATCH = {
    'sentence_correction': to_mc_sentence_correction,
    'spelling': to_mc_spelling,
    'fact_opinion': to_mc_fact_opinion,
    'contextual_meaning': to_mc_contextual_meaning,
    'analogy': to_mc_analogy,
    'verb_tense': to_mc_verb_tense,
    'sentence_combination': to_mc_sentence_combination,
    'syllabication': to_mc_syllabication,
    'syllable_counting': to_mc_syllable_counting,
    'noun_types': to_mc_noun_types,
    'noun_number': to_mc_noun_number,
    'alphabetical_order': to_mc_alphabetical_order,
    'guide_words': to_mc_guide_words,
    'friendly_letter': to_mc_friendly_letter,
    'parts_of_speech': to_mc_parts_of_speech,
    'grammar_mechanics': to_mc_grammar_mechanics,
    'fill_blank': to_mc_fill_blank,
    'subject_predicate': to_mc_subject_predicate,
    'phonics': to_mc_phonics,
    'rhyming': to_mc_rhyming,
    'homophones': to_mc_homophones,
    'inference': to_mc_inference,
    'complete_sentence': to_mc_complete_sentence,
    'categorization': to_mc_categorization,
    'cause_effect': to_mc_cause_effect,
    'paragraph_editing': to_mc_paragraph_editing,
    'fact_fantasy': to_mc_fact_fantasy,
    'sentence_types': to_mc_sentence_types,
    'writing_opinion': to_mc_writing_opinion,
    'synonyms': to_mc_synonyms,
    'antonyms': to_mc_antonyms,
    'syn_ant': to_mc_synonyms,
    'root_words': to_mc_root_words,
    'contractions': to_mc_contractions,
    'plural_nouns': to_mc_plural_nouns,
    'double_negatives': to_mc_double_negatives,
    'possessives': to_mc_possessives,
    'reference_skills': to_mc_reference_skills,
}

def convert_question(q, qtype):
    func = DISPATCH.get(qtype)
    if not func:
        return None
    result = func(q)
    if result[0] is None:
        return None
    choices, correct_idx, correct_answer = result
    return choices, correct_idx, correct_answer

def generate_js_question(q, subtopic_id, qtype):
    result = convert_question(q, qtype)
    if not result:
        return None
    choices, correct_idx, correct_answer = result
    
    # Clean choices
    clean_choices = [str(c) for c in choices]
    
    # Question text
    question_text = q['question']
    if not question_text.endswith('?'):
        question_text = question_text[0].upper() + question_text[1:]
    
    # Explanations
    correct_exp = f"The correct answer is {chr(65+correct_idx)}. {correct_answer}"
    incorrect_arr = []
    for i, choice in enumerate(clean_choices):
        if i == correct_idx:
            incorrect_arr.append(f"CORRECT: {correct_answer}")
        else:
            incorrect_arr.append(f"This choice is incorrect because '{choice}' does not follow the rules.")
    
    study_aid = STUDY_AIDS.get(subtopic_id, GENERIC_STUDY_AID)
    
    js_obj = {
        'question': question_text,
        'choices': clean_choices,
        'correct': correct_idx,
        'explanation': {
            'correct': correct_exp,
            'incorrect': incorrect_arr
        },
        'studyAid': study_aid
    }
    return js_obj

def js_obj_to_string(obj, indent=6):
    ind = ' ' * indent
    lines = [f"{ind}{{"]
    lines.append(f'{ind}  question: "{escape_js_string(obj["question"])}",')
    choices_str = ', '.join(f'"{escape_js_string(c)}"' for c in obj['choices'])
    lines.append(f'{ind}  choices: [{choices_str}],')
    lines.append(f'{ind}  correct: {obj["correct"]},')
    
    exp = obj['explanation']
    inc_arr = ', '.join(f'"{escape_js_string(x)}"' for x in exp['incorrect'])
    lines.append(f'{ind}  explanation: {{ correct: "{escape_js_string(exp["correct"])}", incorrect: [{inc_arr}] }},')
    
    aid = obj['studyAid']
    lines.append(f'{ind}  studyAid: {{ definition: "{escape_js_string(aid["definition"])}", example: "{escape_js_string(aid["example"])}", link: "{escape_js_string(aid["link"])}", linkText: "{escape_js_string(aid["linkText"])}" }}')
    lines.append(f"{ind}}}")
    return '\n'.join(lines)

def main():
    # Load JSONs
    all_questions = []
    for fname in ['evan_moor_weeks_1_15.json', 'evan_moor_weeks_16_31.json']:
        path = os.path.join(base, fname)
        with open(path) as f:
            data = json.load(f)
        for week in data['weeks']:
            for day, qs in week['days'].items():
                for q in qs:
                    style = q.get('style', '').lower()
                    mapping = STYLE_MAP.get(style)
                    if mapping:
                        subtopic_id, qtype = mapping
                        all_questions.append((subtopic_id, qtype, q))
    
    # Group by subtopic
    grouped = {}
    for subtopic_id, qtype, q in all_questions:
        js_q = generate_js_question(q, subtopic_id, qtype)
        if js_q:
            grouped.setdefault(subtopic_id, []).append(js_q)
    
    # Read existing JS
    with open(js_path) as f:
        js_content = f.read()
    
    # For each subtopic, check if it exists in JS
    new_sets = []
    existing_keys = re.findall(r"QUESTION_BANK\['([^']+)'\]\s*=", js_content)
    
    for subtopic_id, questions in grouped.items():
        if not questions:
            continue
        
        # Determine title and topic
        title_map = {
            'grammar-sentence-correction': 'Sentence Correction',
            'grammar-paragraph-editing': 'Paragraph Editing',
        }
        title = title_map.get(subtopic_id, subtopic_id.replace('-', ' ').title())
        
        # Determine parent topic
        topic_map = {
            'vocabulary-spelling': 'Vocabulary / Word Study',
            'vocabulary-word-meaning-context': 'Vocabulary / Word Study',
            'vocabulary-rhyming': 'Vocabulary / Word Study',
            'vocabulary-homophones': 'Vocabulary / Word Study',
            'vocabulary-synonyms-antonyms': 'Vocabulary / Word Study',
            'vocabulary-base-words': 'Vocabulary / Word Study',
            'vocabulary-contractions': 'Vocabulary / Word Study',
            'vocabulary-vowel-sounds': 'Vocabulary / Word Study',
            'grammar-sentence-correction': 'Grammar',
            'grammar-paragraph-editing': 'Grammar',
            'grammar-tenses': 'Grammar',
            'grammar-sentence-combinations': 'Grammar',
            'grammar-parts-of-speech-nouns': 'Grammar',
            'grammar-singular-plural-nouns': 'Grammar',
            'grammar-friendly-letter': 'Grammar',
            'grammar-correct-article': 'Grammar',
            'grammar-subject-predicate': 'Grammar',
            'grammar-subject-verb-agreement': 'Grammar',
            'grammar-identify-sentence': 'Grammar',
            'grammar-sentence-types': 'Grammar',
            'grammar-double-negatives': 'Grammar',
            'reading-comprehension-fact-opinion': 'Reading Comprehension',
            'reading-comprehension-analogies': 'Reading Comprehension',
            'reading-comprehension-inference': 'Reading Comprehension',
            'reading-comprehension-categorizing': 'Reading Comprehension',
            'reading-comprehension-cause-effect': 'Reading Comprehension',
            'reading-comprehension-fact-fantasy': 'Reading Comprehension',
            'reference-skills-alphabetical-order': 'Reference Skills',
            'reference-skills-dictionary-guide-words': 'Reference Skills',
            'punctuation-apostrophes-possessives': 'Punctuation',
        }
        topic = topic_map.get(subtopic_id, 'Grammar')
        
        if subtopic_id in existing_keys:
            # Append to existing set
            # Find the questions array in the existing set and append before its closing ]
            pattern = rf"(QUESTION_BANK\['{re.escape(subtopic_id)}'\] = \{{[^}}]+questions: \[)"
            match = re.search(pattern, js_content, re.DOTALL)
            if match:
                insert_pos = match.end()
                # Need to insert before the closing ] of questions array
                # Find the matching ]
                start = insert_pos
                bracket_count = 0
                in_string = False
                escape = False
                found = False
                for i in range(start, len(js_content)):
                    ch = js_content[i]
                    if escape:
                        escape = False
                        continue
                    if ch == '\\':
                        escape = True
                        continue
                    if ch == '"' and not in_string:
                        in_string = True
                    elif ch == '"' and in_string:
                        in_string = False
                    if not in_string:
                        if ch == '[':
                            bracket_count += 1
                        elif ch == ']':
                            if bracket_count == 0:
                                # This is the closing ] we want
                                insert_before = i
                                found = True
                                break
                            bracket_count -= 1
                
                if found:
                    new_qs = ',\n'.join(js_obj_to_string(q) for q in questions)
                    # Check if there are existing questions (need comma before)
                    before_text = js_content[start:insert_before].strip()
                    if before_text and not before_text.endswith(','):
                        new_qs = ',\n' + new_qs
                    js_content = js_content[:insert_before] + new_qs + js_content[insert_before:]
                    print(f"Appended {len(questions)} questions to existing {subtopic_id}")
                else:
                    print(f"WARNING: Could not find insertion point for {subtopic_id}")
            else:
                print(f"WARNING: Could not find existing set {subtopic_id}")
        else:
            # Create new set
            new_set = f"""
/* Evan Moor - {title} */
QUESTION_BANK['{subtopic_id}'] = {{
  title: "{title}",
  topic: "{topic}",
  questions: [
{',\n'.join(js_obj_to_string(q) for q in questions)}
  ]
}};
"""
            new_sets.append(new_set)
            print(f"Created new set {subtopic_id} with {len(questions)} questions")
    
    # Insert new sets before window.QUESTION_BANK
    if new_sets:
        insert_marker = "window.QUESTION_BANK = QUESTION_BANK;"
        marker_pos = js_content.rfind(insert_marker)
        if marker_pos != -1:
            js_content = js_content[:marker_pos] + '\n'.join(new_sets) + '\n' + js_content[marker_pos:]
        else:
            # Append at end
            js_content += '\n'.join(new_sets)
    
    # Write back
    with open(js_path, 'w') as f:
        f.write(js_content)
    
    print(f"\nDone! Total questions converted: {sum(len(v) for v in grouped.values())}")
    print(f"New subtopics created: {len(new_sets)}")

if __name__ == '__main__':
    main()
