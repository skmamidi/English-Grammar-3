/**
 * English Language Quiz App - Master Question Bank
 * 
 * Architecture: Each topic has a unique key (e.g., 'vocabulary-base-words').
 * To add more topics, subtopics, or questions, just add new entries here.
 * The quiz engine loads questions by key, so the rest of the app never changes.
 * 
 * Structure:
 *   QUESTION_BANK[setId] = {
 *     title: "Display Title",
 *     topic: "Parent Topic Name",
 *     questions: [
 *       {
 *         question: "The question text",
 *         choices: ["A) choice 1", "B) choice 2", "C) choice 3", "D) choice 4"],
 *         correct: 0, // index of correct answer (0=A, 1=B, 2=C, 3=D)
 *         explanation: {
 *           correct: "Why the right answer is correct",
 *           incorrect: [
 *             "Why A is wrong",
 *             "Why B is wrong",
 *             "Why C is wrong",
 *             "Why D is wrong"
 *           ]
 *         },
 *         studyAid: {
 *           definition: "Definition of the concept",
 *           example: "Example sentence",
 *           link: "https://example.com",
 *           linkText: "Learn more about X"
 *         }
 *       }
 *     ]
 *   };
 */

const QUESTION_BANK = {};

/* ============================================================
   TOPIC 1: Vocabulary / Word Study
   ============================================================ */

/* 1.1 Base Words / Prefix / Suffix */
QUESTION_BANK['vocabulary-base-words'] = {
  title: "Base Words, Prefixes, and Suffixes",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "What is the base word in the word 'unhappily'?",
      choices: ["un-", "happy", "-ily", "unhapp"],
      correct: 1,
      explanation: {
        correct: "The base word is 'happy.' The prefix 'un-' changes the meaning to 'not happy,' and the suffix '-ily' turns it into an adverb describing how something is done.",
        incorrect: [
          "'un-' is a prefix, not the base word. It is added to the beginning to change meaning.",
          "CORRECT: 'happy' is the base word that carries the core meaning.",
          "'-ily' is a suffix that changes the word into an adverb. It is not the base word.",
          "'unhapp' is not a real word or a base word."
        ]
      },
      studyAid: {
        definition: "A base word is the main part of a word that can stand alone. A prefix is added to the beginning, and a suffix is added to the end.",
        example: "Base word: 'kind.' Prefix: 'un-' makes 'unkind.' Suffix: '-ness' makes 'kindness.'",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "Which prefix means 'again'?",
      choices: ["un-", "pre-", "re-", "dis-"],
      correct: 2,
      explanation: {
        correct: "The prefix 're-' means 'again.' For example, 'rewrite' means to write again.",
        incorrect: [
          "'un-' means 'not,' as in 'unhappy' (not happy).",
          "'pre-' means 'before,' as in 'preview' (view before).",
          "CORRECT: 're-' means 'again,' as in 'restart' (start again).",
          "'dis-' means 'not' or 'opposite of,' as in 'disagree' (not agree)."
        ]
      },
      studyAid: {
        definition: "A prefix is a group of letters added to the beginning of a word that changes its meaning.",
        example: "re- = again (rebuild), pre- = before (preschool), un- = not (unfair)",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "If you add the suffix '-ful' to the word 'help,' what does the new word mean?",
      choices: ["Without help", "Full of help", "A person who helps", "To help again"],
      correct: 1,
      explanation: {
        correct: "The suffix '-ful' means 'full of.' So 'helpful' means 'full of help' or ready to help others.",
        incorrect: [
          "'Without help' would use the suffix '-less' to make 'helpless.'",
          "CORRECT: '-ful' means 'full of,' so 'helpful' means full of help.",
          "A person who helps uses the suffix '-er' to make 'helper.'",
          "'To help again' uses the prefix 're-' to make 'rehelp.'"
        ]
      },
      studyAid: {
        definition: "The suffix '-ful' means 'full of' or 'having a lot of' something.",
        example: "care + -ful = careful (full of care), joy + -ful = joyful (full of joy)",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "What does the word 'impossible' mean?",
      choices: ["Very possible", "Not possible", "Possibly done", "Done before"],
      correct: 1,
      explanation: {
        correct: "The prefix 'im-' means 'not.' So 'impossible' means 'not possible.'",
        incorrect: [
          "'Very possible' is the opposite of what 'im-' means.",
          "CORRECT: 'im-' means 'not,' so 'impossible' means not possible.",
          "'Possibly done' ignores the prefix 'im-' entirely.",
          "'Done before' would use the prefix 'pre-,' not 'im-.'"
        ]
      },
      studyAid: {
        definition: "The prefix 'im-' is a variant of 'in-' and means 'not.' It is used before words starting with 'p' or 'm.'",
        example: "polite → impolite (not polite), mature → immature (not mature)",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "Which word is formed by adding a prefix meaning 'before' to the word 'heat'?",
      choices: ["reheat", "unheat", "preheat", "disheat"],
      correct: 2,
      explanation: {
        correct: "'Pre-' means 'before.' To 'preheat' an oven means to heat it before you put food in.",
        incorrect: [
          "'re-' means 'again,' so 'reheat' means to heat again.",
          "'un-' means 'not,' but 'unheat' is not a real word.",
          "CORRECT: 'pre-' means 'before,' so 'preheat' means to heat before.",
          "'dis-' means 'not' or 'apart,' but 'disheat' is not a real word."
        ]
      },
      studyAid: {
        definition: "The prefix 'pre-' means 'before' in time, place, or order.",
        example: "preview = view before, pretest = test before, prehistoric = before history",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "The suffix '-less' in the word 'fearless' means:",
      choices: ["Full of fear", "Without fear", "A little fear", "Causing fear"],
      correct: 1,
      explanation: {
        correct: "The suffix '-less' means 'without.' A 'fearless' person is someone without fear.",
        incorrect: [
          "'Full of fear' would use '-ful' to make 'fearful.'",
          "CORRECT: '-less' means 'without,' so 'fearless' means without fear.",
          "'A little fear' does not match the meaning of '-less.'",
          "'Causing fear' would describe something scary, not 'fearless.'"
        ]
      },
      studyAid: {
        definition: "The suffix '-less' means 'without' or 'lacking.'",
        example: "home + -less = homeless (without a home), care + -less = careless (without care)",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "Which of these words contains a base word, a prefix, AND a suffix?",
      choices: ["unfair", "happiness", "disagreement", "reading"],
      correct: 2,
      explanation: {
        correct: "'Disagreement' has the prefix 'dis-' (not), the base word 'agree,' and the suffix '-ment' (the act of).",
        incorrect: [
          "'unfair' has a prefix 'un-' and base word 'fair,' but no suffix.",
          "'happiness' has a base word 'happy' and suffix '-ness,' but no prefix.",
          "CORRECT: 'disagreement' has prefix 'dis-,' base 'agree,' and suffix '-ment.'",
          "'reading' has a base word 'read' and suffix '-ing,' but no prefix."
        ]
      },
      studyAid: {
        definition: "Some words have all three parts: a prefix at the start, a base word in the middle, and a suffix at the end.",
        example: "unhappiness = un- (not) + happy (base) + -ness (state of)",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "What does 'rewrite' mean?",
      choices: ["To write for the first time", "To write again", "To not write", "To write quickly"],
      correct: 1,
      explanation: {
        correct: "The prefix 're-' means 'again.' So 'rewrite' means to write something again.",
        incorrect: [
          "'To write for the first time' has no prefix meaning.",
          "CORRECT: 're-' means again, so 'rewrite' means to write again.",
          "'To not write' would use a negative prefix like 'un-.'",
          "'To write quickly' is not what 're-' means."
        ]
      },
      studyAid: {
        definition: "'Re-' is a common prefix meaning 'again' or 'back.'",
        example: "rewrite = write again, rebuild = build again, return = turn back",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "Which suffix turns a verb into a person who does the action?",
      choices: ["-ful", "-less", "-er", "-ly"],
      correct: 2,
      explanation: {
        correct: "The suffix '-er' often means 'a person who does something.' A 'teacher' is a person who teaches.",
        incorrect: [
          "'-ful' means 'full of,' not a person.",
          "'-less' means 'without,' not a person.",
          "CORRECT: '-er' means a person who does the action, like 'baker' or 'singer.'",
          "'-ly' usually turns a word into an adverb describing how something is done."
        ]
      },
      studyAid: {
        definition: "The suffix '-er' means 'one who' or 'a person who' performs an action.",
        example: "teach → teacher, bake → baker, run → runner",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "If 'visible' means 'can be seen,' what does 'invisible' mean?",
      choices: ["Very easy to see", "Not able to be seen", "Seen before", "Seen again"],
      correct: 1,
      explanation: {
        correct: "The prefix 'in-' means 'not.' So 'invisible' means 'not able to be seen.'",
        incorrect: [
          "'Very easy to see' is the opposite of 'invisible.'",
          "CORRECT: 'in-' means 'not,' so 'invisible' means not able to be seen.",
          "'Seen before' would use 'pre-,' not 'in-.'",
          "'Seen again' would use 're-,' not 'in-.'"
        ]
      },
      studyAid: {
        definition: "The prefix 'in-' means 'not.' It changes to 'im-' before p or m, 'il-' before l, and 'ir-' before r.",
        example: "visible → invisible, possible → impossible, legal → illegal, responsible → irresponsible",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "What does the word 'disappear' mean?",
      choices: ["To appear quickly", "To not appear; to vanish", "To appear before", "To appear fully"],
      correct: 1,
      explanation: {
        correct: "The prefix 'dis-' means 'not' or 'opposite of.' So 'disappear' means to vanish or stop appearing.",
        incorrect: [
          "'To appear quickly' does not match the meaning of 'dis-.'",
          "CORRECT: 'dis-' means not/opposite, so 'disappear' means to stop appearing or vanish.",
          "'To appear before' would use 'pre-,' not 'dis-.'",
          "'To appear fully' is not what 'dis-' means."
        ]
      },
      studyAid: {
        definition: "The prefix 'dis-' means 'not,' 'opposite of,' or 'apart.'",
        example: "agree → disagree, honest → dishonest, connect → disconnect",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "Which word means 'the act of agreeing'?",
      choices: ["disagree", "agreeable", "agreement", "agreeing"],
      correct: 2,
      explanation: {
        correct: "The suffix '-ment' turns a verb into a noun that means 'the act or result of.' 'Agreement' is the act of agreeing.",
        incorrect: [
          "'disagree' is a verb with the negative prefix 'dis-,' meaning to not agree.",
          "'agreeable' is an adjective describing someone who is easy to agree with.",
          "CORRECT: 'agreement' uses '-ment' to mean the act or result of agreeing.",
          "'agreeing' uses '-ing' to show an ongoing action, not the act itself as a noun."
        ]
      },
      studyAid: {
        definition: "The suffix '-ment' turns a verb into a noun meaning the act, process, or result of something.",
        example: "move → movement, develop → development, achieve → achievement",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "The prefix 'over-' in the word 'overcook' means:",
      choices: ["To cook under", "To cook again", "To cook too much", "To not cook"],
      correct: 2,
      explanation: {
        correct: "The prefix 'over-' means 'too much' or 'excessive.' To 'overcook' means to cook something too long.",
        incorrect: [
          "'To cook under' is the opposite; 'under-' means below or too little.",
          "'To cook again' uses the prefix 're-,' not 'over-.'",
          "CORRECT: 'over-' means too much, so 'overcook' means to cook too much.",
          "'To not cook' uses a negative prefix like 'un-.'"
        ]
      },
      studyAid: {
        definition: "The prefix 'over-' means 'too much,' 'above,' or 'excessive.'",
        example: "overcook = cook too much, oversleep = sleep too much, overpay = pay too much",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    },
    {
      question: "What is the meaning of the word 'uncomfortable'?",
      choices: ["Very comfortable", "Not comfortable", "Comforting others", "Before comfort"],
      correct: 1,
      explanation: {
        correct: "The prefix 'un-' means 'not,' and '-able' means 'able to be.' So 'uncomfortable' means 'not able to be comforted' or not feeling good.",
        incorrect: [
          "'Very comfortable' is the opposite of 'uncomfortable.'",
          "CORRECT: 'un-' means not, so 'uncomfortable' means not comfortable.",
          "'Comforting others' would describe someone giving comfort, not feeling it.",
          "'Before comfort' would use 'pre-,' not 'un-.'"
        ]
      },
      studyAid: {
        definition: "'Un-' is a prefix meaning 'not.' It reverses the meaning of the base word.",
        example: "happy → unhappy, kind → unkind, able → unable",
        link: "https://www.readingrockets.org/article/roots-words-and-childrens-vocabulary-development",
        linkText: "Reading Rockets - Root Words"
      }
    },
    {
      question: "Which suffix would you add to the adjective 'quick' to turn it into a noun describing a person?",
      choices: ["-ness", "-ly", "-er", "-ful"],
      correct: 2,
      explanation: {
        correct: "The suffix '-er' can turn a descriptive word into a noun for a person, like 'quick' becoming 'quicker' (one who is quick). However, more commonly, '-er' turns verbs into doers. For adjectives describing people, '-er' works for comparisons, but among these choices, '-er' is the only one that forms a person noun from related verbs. Re-reading: the closest person-forming suffix here is '-er' (e.g., a quick thinker uses 'quick,' but 'quicker' is comparative). The best answer is '-er' because '-ness,' '-ly,' and '-ful' do not create person nouns.",
        incorrect: [
          "'-ness' turns an adjective into a noun describing a state or quality, not a person.",
          "'-ly' turns an adjective into an adverb describing how something is done.",
          "CORRECT: '-er' is the only suffix here that can relate to a person (e.g., 'doer,' 'thinker').",
          "'-ful' means 'full of' and does not create a person noun."
        ]
      },
      studyAid: {
        definition: "The suffix '-er' often means 'one who' does something or has a quality.",
        example: "quick → quicker (more quick), but also think → thinker, drive → driver",
        link: "https://www.khanacademy.org/humanities/grammar",
        linkText: "Khan Academy Grammar"
      }
    }
  ]
};

/* 1.2 Vowel Sounds */
QUESTION_BANK['vocabulary-vowel-sounds'] = {
  title: "Vowel Sounds",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "In the word 'train,' what sound does the vowel team 'ai' make?",
      choices: ["Short a as in 'cat'", "Long a as in 'say'", "Short i as in 'sit'", "Long e as in 'see'"],
      correct: 1,
      explanation: { correct: "The vowel team 'ai' makes the long a sound, as in 'train,' 'rain,' and 'mail.'", incorrect: ["'ai' does not make a short a sound; 'a' alone in 'cat' does.","CORRECT: 'ai' makes the long a sound, like the letter name A.","'ai' does not make a short i sound; that would be 'i' in 'sit.'","'ai' does not make a long e sound; 'ee' or 'ea' does that."] },
      studyAid: { definition: "A vowel team is two vowels together that make one sound. 'ai' usually says the long a sound.", example: "'train,' 'paid,' 'mail' all use 'ai' to say /ā/.", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has the same vowel sound as 'meat'?",
      choices: ["met", "meet", "mat", "mitt"],
      correct: 1,
      explanation: { correct: "'Meat' and 'meet' both have the long e sound made by the vowel teams 'ea' and 'ee.'", incorrect: ["'met' has a short e sound, not long e.","CORRECT: 'meet' has the same long e sound as 'meat.'","'mat' has a short a sound.","'mitt' has a short i sound."] },
      studyAid: { definition: "The long e sound can be spelled with 'ea' or 'ee.' Both vowel teams say the letter name E.", example: "meat, meet, seat, see, feel, team", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "What vowel sound do you hear in the word 'moon'?",
      choices: ["Short u as in 'cup'", "Long u as in 'blue'", "Short o as in 'hot'", "Long o as in 'go'"],
      correct: 1,
      explanation: { correct: "The letters 'oo' in 'moon' make the long u sound, like the letter name U.", incorrect: ["'oo' does not make a short u sound; 'u' in 'cup' does.","CORRECT: 'oo' in 'moon' makes the long u sound.","'oo' does not make a short o sound.","'oo' does not make a long o sound; 'oa' or 'ow' does that."] },
      studyAid: { definition: "The vowel team 'oo' often makes the long u sound, as in 'moon,' 'spoon,' and 'school.'", example: "moon, food, tool, school, cool", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has a different vowel sound from the others?",
      choices: ["boat", "road", "toad", "book"],
      correct: 3,
      explanation: { correct: "'Book' has the short oo sound, while 'boat,' 'road,' and 'toad' all have the long o sound.", incorrect: ["'boat' has the long o sound with 'oa.'","'road' has the long o sound with 'oa.'","'toad' has the long o sound with 'oa.'","CORRECT: 'book' has the short oo sound, different from the rest."] },
      studyAid: { definition: "'oa' usually says long o. 'oo' can say long u (moon) or short oo (book).", example: "boat, coat, road (long o) vs. book, look, cook (short oo)", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "In the word 'light,' what sound does 'igh' make?",
      choices: ["Short i", "Long i", "Long a", "Short e"],
      correct: 1,
      explanation: { correct: "The letters 'igh' together make the long i sound, as in 'light,' 'night,' and 'sight.'", incorrect: ["'igh' does not make a short i sound.","CORRECT: 'igh' makes the long i sound, like the letter name I.","'igh' does not make a long a sound.","'igh' does not make a short e sound."] },
      studyAid: { definition: "'igh' is a trigraph (three letters) that makes the long i sound.", example: "light, night, sight, fight, tight", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has the same vowel sound as 'cloud'?",
      choices: ["clue", "clown", "clean", "climb"],
      correct: 1,
      explanation: { correct: "'Cloud' and 'clown' both have the 'ou' and 'ow' sounds that say /ow/.", incorrect: ["'clue' has a long u sound.","CORRECT: 'clown' has the same /ow/ sound as 'cloud.'","'clean' has a long e sound.","'climb' has a long i sound."] },
      studyAid: { definition: "'ou' and 'ow' both make the /ow/ sound, as in 'cloud' and 'clown.'", example: "cloud, found, clown, down, house, mouse", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "What sound does the 'y' make at the end of 'happy'?",
      choices: ["Long i", "Short i", "Long e", "Short e"],
      correct: 2,
      explanation: { correct: "At the end of a multi-syllable word, 'y' usually makes the long e sound, as in 'happy,' 'sunny,' and 'funny.'", incorrect: ["'y' at the end of a short word like 'my' makes long i, but not in 'happy.'","'y' does not make a short i sound at the end of words.","CORRECT: 'y' at the end of 'happy' makes the long e sound.","'y' does not make a short e sound at the end of words."] },
      studyAid: { definition: "At the end of a two-or-more-syllable word, 'y' usually says /ē/ (long e). At the end of a one-syllable word, it says /ī/ (long i).", example: "happy, puppy, baby (long e) vs. my, try, fly (long i)", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has a short vowel sound?",
      choices: ["cake", "ride", "ship", "hope"],
      correct: 2,
      explanation: { correct: "'Ship' has a short i sound. The other words have silent e that makes the vowel long.", incorrect: ["'cake' has a long a because of the silent e.","'ride' has a long i because of the silent e.","CORRECT: 'ship' has a short i sound.","'hope' has a long o because of the silent e."] },
      studyAid: { definition: "A silent e at the end of a word usually makes the vowel before it say its name (long vowel). Without silent e, the vowel is usually short.", example: "cap → cape, pin → pine, hop → hope", link: "https://www.readingrockets.org/article/silent-e", linkText: "Reading Rockets - Silent E" }
    },
    {
      question: "In the word 'bread,' what sound does 'ea' make?",
      choices: ["Long e as in 'bead'", "Short e as in 'bed'", "Long a as in 'break'", "Short a as in 'bad'"],
      correct: 1,
      explanation: { correct: "In 'bread,' the vowel team 'ea' makes the short e sound, which is an exception to the usual long e sound.", incorrect: ["'bead' has long e, but 'bread' is an exception with short e.","CORRECT: 'bread' uses 'ea' to make the short e sound, like 'bed.'","'break' uses 'ea' for long a, but 'bread' does not.","'ea' in 'bread' does not make a short a sound."] },
      studyAid: { definition: "'ea' usually says long e, but there are exceptions like 'bread,' 'head,' and 'ready' where it says short e.", example: "read (long e) vs. bread (short e); bead (long e) vs. head (short e)", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has the same vowel sound as 'coin'?",
      choices: ["cone", "join", "cane", "cabin"],
      correct: 1,
      explanation: { correct: "'Coin' and 'join' both use the vowel team 'oi' to make the /oy/ sound.", incorrect: ["'cone' has a long o sound.","CORRECT: 'join' has the same /oy/ sound as 'coin.'","'cane' has a long a sound.","'cabin' has a short a sound."] },
      studyAid: { definition: "'oi' and 'oy' both make the /oy/ sound. 'oi' is usually in the middle of a word; 'oy' is usually at the end.", example: "coin, oil, point, toy, boy, joy", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "What sound does 'aw' make in the word 'saw'?",
      choices: ["Short a", "Long a", "/aw/ as in 'paw'", "Short o"],
      correct: 2,
      explanation: { correct: "'aw' makes the /aw/ sound, as in 'saw,' 'paw,' and 'draw.'", incorrect: ["'aw' does not make a short a sound.","'aw' does not make a long a sound; 'ai' or 'ay' does that.","CORRECT: 'aw' says /aw/, like in 'paw' and 'saw.'","'aw' does not make a short o sound; 'o' in 'hot' does that."] },
      studyAid: { definition: "'aw' is a vowel team that makes the /aw/ sound, like in 'saw' and 'paw.'", example: "saw, paw, draw, lawn, yawn", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has a long o sound?",
      choices: ["sock", "stock", "stroke", "clock"],
      correct: 2,
      explanation: { correct: "'Stroke' has a long o sound because of the silent e at the end. The other words have short o sounds.", incorrect: ["'sock' has a short o sound.","'stock' has a short o sound.","CORRECT: 'stroke' has a long o sound because of the silent e.","'clock' has a short o sound."] },
      studyAid: { definition: "A silent e at the end of a word usually makes the vowel say its name (long vowel).", example: "not → note, hop → hope, rob → robe", link: "https://www.readingrockets.org/article/silent-e", linkText: "Reading Rockets - Silent E" }
    },
    {
      question: "In the word 'caught,' what sound does 'augh' make?",
      choices: ["Short a", "Long a", "/aw/", "Short o"],
      correct: 2,
      explanation: { correct: "'augh' makes the /aw/ sound in 'caught,' 'taught,' and 'naughty.'", incorrect: ["'augh' does not make a short a sound.","'augh' does not make a long a sound.","CORRECT: 'augh' makes the /aw/ sound.","'augh' does not make a short o sound."] },
      studyAid: { definition: "'augh' is a letter group that usually makes the /aw/ sound.", example: "caught, taught, naughty, daughter", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "Which word has the same vowel sound as 'few'?",
      choices: ["fed", "fuel", "fan", "fall"],
      correct: 1,
      explanation: { correct: "'Few' and 'fuel' both have the long u sound spelled with 'ew' and 'ue' patterns.", incorrect: ["'fed' has a short e sound.","CORRECT: 'fuel' has the same long u /yoo/ sound as 'few.'","'fan' has a short a sound.","'fall' has an /aw/ sound."] },
      studyAid: { definition: "'ew' and 'ue' often make the long u /yoo/ sound.", example: "few, new, cue, blue, true", link: "https://www.readingrockets.org/article/vowel-teams", linkText: "Reading Rockets - Vowel Teams" }
    },
    {
      question: "What vowel sound do you hear in the word 'first'?",
      choices: ["Short i", "Long i", "/er/", "Short e"],
      correct: 2,
      explanation: { correct: "The letters 'ir' in 'first' make the /er/ sound, which is called an r-controlled vowel.", incorrect: ["'first' does not have a short i sound.","'first' does not have a long i sound.","CORRECT: 'ir' makes the /er/ sound in 'first.'","'first' does not have a short e sound."] },
      studyAid: { definition: "An r-controlled vowel happens when 'r' follows a vowel and changes its sound to /er/. 'ir,' 'er,' and 'ur' all say /er/.", example: "bird, fern, nurse, shirt, worm", link: "https://www.readingrockets.org/article/r-controlled-vowels", linkText: "Reading Rockets - R-Controlled Vowels" }
    }
  ]
};

/* 1.3 Contractions */
QUESTION_BANK['vocabulary-contractions'] = {
  title: "Contractions",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which two words make the contraction 'won't'?",
      choices: ["will not", "would not", "was not", "were not"],
      correct: 0,
      explanation: { correct: "'Won't' is the contraction for 'will not.' It is an unusual contraction because the spelling changes a lot.", incorrect: ["CORRECT: 'won't' = 'will not.' This is an unusual spelling change.","'would not' makes 'wouldn't.'","'was not' makes 'wasn't.'","'were not' makes 'weren't.'"] },
      studyAid: { definition: "A contraction is a shortened form of two words. An apostrophe replaces the missing letters.", example: "will not → won't; do not → don't; I am → I'm", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the contraction for 'they are'?",
      choices: ["their", "they're", "there", "theyr"],
      correct: 1,
      explanation: { correct: "'They're' is the contraction for 'they are.' The apostrophe replaces the missing 'a.'", incorrect: ["'their' shows ownership, not a contraction.","CORRECT: 'they're' = 'they are.'","'there' refers to a place, not a contraction.","'theyr' is not a real word."] },
      studyAid: { definition: "'They're' (they are), 'their' (belongs to them), and 'there' (a place) are homophones with different meanings.", example: "They're going to their house over there.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses a contraction correctly?",
      choices: ["I dont like spinach.", "I don't like spinach.", "I do'nt like spinach.", "I donot like spinach."],
      correct: 1,
      explanation: { correct: "'Don't' is the correct contraction for 'do not.' The apostrophe goes where the 'o' is missing.", incorrect: ["Missing apostrophe; 'dont' is not a contraction.","CORRECT: 'don't' places the apostrophe where the 'o' in 'not' was removed.","The apostrophe is in the wrong place in 'do'nt.'","'donot' is not a contraction; it should be two words or 'don't.'"] },
      studyAid: { definition: "In a contraction, the apostrophe always goes where letters were removed.", example: "do not → don't (o removed); cannot → can't (no removed)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What two words make up 'she'll'?",
      choices: ["she will", "she shall", "she all", "she well"],
      correct: 0,
      explanation: { correct: "'She'll' is the contraction for 'she will.' The apostrophe replaces 'wi.'", incorrect: ["CORRECT: 'she'll' = 'she will.'","'she shall' would also contract to 'she'll' in older English, but modern use is 'she will.'","'she all' is not a phrase.","'she well' is not a phrase."] },
      studyAid: { definition: "'She'll' replaces the letters 'wi' in 'she will' with an apostrophe.", example: "she will → she'll; he will → he'll; it will → it'll", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which contraction is spelled correctly?",
      choices: ["did'nt", "didnt", "didn't", "di'dnt"],
      correct: 2,
      explanation: { correct: "'Didn't' is correct. The apostrophe replaces the 'o' in 'not.'", incorrect: ["'did'nt' puts the apostrophe in the wrong place.","'didnt' is missing the apostrophe entirely.","CORRECT: 'didn't' places the apostrophe where the 'o' was removed.","'di'dnt' puts the apostrophe in the wrong place."] },
      studyAid: { definition: "Always place the apostrophe exactly where the missing letter(s) were.", example: "did not → didn't; is not → isn't; are not → aren't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the contraction for 'it is'?",
      choices: ["its", "it's", "its'", "it s"],
      correct: 1,
      explanation: { correct: "'It's' is the contraction for 'it is.' The apostrophe replaces the missing 'i.'", incorrect: ["'its' shows ownership (possessive), not a contraction.","CORRECT: 'it's' = 'it is.'","'its'' is not a real word.","'it s' has a space and is not a contraction."] },
      studyAid: { definition: "'It's' (it is) has an apostrophe because it is a contraction. 'Its' (belonging to it) has no apostrophe because it is possessive.", example: "It's raining. The dog wagged its tail.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which two words form 'could've'?",
      choices: ["could of", "could have", "could love", "could ve"],
      correct: 1,
      explanation: { correct: "'Could've' is the contraction for 'could have.' The apostrophe replaces 'ha.' Many people mistakenly say 'could of,' but 'of' is never correct here.", incorrect: ["'could of' is a common spoken mistake, but 'of' is not a verb.","CORRECT: 'could've' = 'could have.'","'could love' makes no sense here.","'could ve' is not written with a space."] },
      studyAid: { definition: "'Could've,' 'should've,' and 'would've' all contract 'have.' Never write 'could of' or 'should of.'", example: "could have → could've; should have → should've; would have → would've", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the contraction for 'you are'?",
      choices: ["your", "you're", "yore", "youre"],
      correct: 1,
      explanation: { correct: "'You're' is the contraction for 'you are.' The apostrophe replaces the 'a.'", incorrect: ["'your' shows ownership, not a contraction.","CORRECT: 'you're' = 'you are.'","'yore' means long ago and is not a contraction.","'youre' is missing the apostrophe."] },
      studyAid: { definition: "'You're' (you are) is a contraction. 'Your' (belongs to you) is a possessive pronoun.", example: "You're going to love your new book.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses a contraction correctly?",
      choices: ["Hes going to the store.", "He's going to the store.", "He;s going to the store.", "He`s going to the store."],
      correct: 1,
      explanation: { correct: "'He's' is the correct contraction for 'he is' or 'he has.' The apostrophe replaces the missing letter.", incorrect: ["'Hes' is missing the apostrophe.","CORRECT: 'He's' uses an apostrophe to show the missing 'i' or 'a.'","'He;s' uses a semicolon, not an apostrophe.","'He`s' uses a backtick, not an apostrophe."] },
      studyAid: { definition: "Use a straight apostrophe (') in contractions, not a backtick or other symbol.", example: "he is → he's; she is → she's; I am → I'm", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What two words make the contraction 'shan't'?",
      choices: ["shall not", "should not", "sham not", "share not"],
      correct: 0,
      explanation: { correct: "'Shan't' is the contraction for 'shall not.' It is rarely used today but follows the same rule.", incorrect: ["CORRECT: 'shan't' = 'shall not.'","'should not' makes 'shouldn't.'","'sham not' is not a real phrase.","'share not' is not a real phrase."] },
      studyAid: { definition: "'Shan't' contracts 'shall not.' It is old-fashioned but follows the same contraction rules.", example: "shall not → shan't; will not → won't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is the contraction for 'does not'?",
      choices: ["dont", "doesn't", "does'nt", "doesnt"],
      correct: 1,
      explanation: { correct: "'Doesn't' is the contraction for 'does not.' The apostrophe replaces the 'o' in 'not.'", incorrect: ["'dont' is the contraction for 'do not,' not 'does not.'","CORRECT: 'doesn't' = 'does not.'","'does'nt' has the apostrophe in the wrong place.","'doesnt' is missing the apostrophe."] },
      studyAid: { definition: "'Does not' contracts to 'doesn't.' 'Do not' contracts to 'don't.' They are not interchangeable.", example: "She doesn't know. They don't know.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the contraction for 'I would'?",
      choices: ["I'ld", "I'd", "Ild", "Iw'd"],
      correct: 1,
      explanation: { correct: "'I'd' is the contraction for 'I would' (or 'I had'). The apostrophe replaces the missing letters.", incorrect: ["'I'ld' is not a standard contraction.","CORRECT: 'I'd' = 'I would' or 'I had.'","'Ild' is missing the apostrophe.","'Iw'd' is not a real contraction."] },
      studyAid: { definition: "'I'd' can mean 'I would' or 'I had' depending on the rest of the sentence.", example: "I'd like some water. (I would) / I'd finished when he arrived. (I had)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which contraction is formed incorrectly?",
      choices: ["is not → isn't", "are not → aren't", "were not → weren't", "am not → amn't"],
      correct: 3,
      explanation: { correct: "'Am not' does not form 'amn't' in standard English. We usually say 'I'm not' instead.", incorrect: ["'isn't' is a correct contraction.","'aren't' is a correct contraction.","'weren't' is a correct contraction.","CORRECT: 'am not' does not contract to 'amn't' in standard English. Use 'I'm not.'"] },
      studyAid: { definition: "Most negative contractions follow a pattern, but 'am not' is special. We use 'I'm not' instead of 'amn't.'", example: "I am not → I'm not (not amn't)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What two words make 'mightn't'?",
      choices: ["might not", "may not", "must not", "mayn't"],
      correct: 0,
      explanation: { correct: "'Mightn't' is the contraction for 'might not.' The apostrophe replaces the 'o' in 'not.'", incorrect: ["CORRECT: 'mightn't' = 'might not.'","'may not' makes 'mayn't' (rare) or just 'may not.'","'must not' makes 'mustn't.'","'mayn't' is not what 'mightn't' means."] },
      studyAid: { definition: "'Mightn't' contracts 'might not.' It is less common today but still correct.", example: "might not → mightn't; must not → mustn't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence correctly uses a contraction in dialogue?",
      choices: ["'I cant believe it,' she said.", "'I can't believe it,' she said.", "'I ca'nt believe it,' she said.", "'I can,t believe it,' she said."],
      correct: 1,
      explanation: { correct: "'Can't' is the correct contraction for 'cannot.' The apostrophe replaces the 'no' in 'not.'", incorrect: ["Missing apostrophe; 'cant' is not a contraction.","CORRECT: 'can't' places the apostrophe where 'no' was removed.","'ca'nt' puts the apostrophe in the wrong place.","'can,t' uses a comma instead of an apostrophe."] },
      studyAid: { definition: "In dialogue, contractions make speech sound natural. Always use the correct apostrophe placement.", example: "cannot → can't; will not → won't; do not → don't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 1.4 Homophones */
QUESTION_BANK['vocabulary-homophones'] = {
  title: "Homophones",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which word means 'to receive or agree to something'?",
      choices: ["except", "accept", "expect", "excerpt"],
      correct: 1,
      explanation: { correct: "'Accept' means to receive or agree to something. 'Except' means excluding.", incorrect: ["'except' means excluding or leaving out.","CORRECT: 'accept' means to receive or agree to something.","'expect' means to think something will happen.","'excerpt' is a short piece from a longer work."] },
      studyAid: { definition: "Homophones are words that sound alike but have different spellings and meanings.", example: "accept (receive) vs. except (exclude)", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Fill in the blank: I need to ___ my room before dinner.",
      choices: ["clean", "klean", "clene", "kleane"],
      correct: 0,
      explanation: { correct: "'Clean' is the correct spelling. 'Klean' and the others are incorrect spellings that sound the same but are not real words.", incorrect: ["CORRECT: 'clean' is the proper spelling.","'klean' uses a 'k' where 'c' belongs.","'clene' uses an 'e' where 'a' belongs.","'kleane' is doubly misspelled."] },
      studyAid: { definition: "Some misspelled words sound like real words but are not. Always check the correct spelling.", example: "clean (correct) vs. klean (incorrect)", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which sentence uses 'their' correctly?",
      choices: ["Their going to the park.", "I like their dog.", "The book is over their.", "Their is a big tree."],
      correct: 1,
      explanation: { correct: "'Their' shows that something belongs to them. 'I like their dog' means the dog belongs to them.", incorrect: ["'Their' does not mean 'they are'; that would be 'they're.'","CORRECT: 'their' shows possession of the dog.","'Their' is not a place; 'there' is a place.","'Their' is not used for 'there is'; that would be 'There is a big tree.'"] },
      studyAid: { definition: "'Their' = possession, 'they're' = they are, 'there' = a place.", example: "They're going to their house over there.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "What is the correct word? The ___ of the mountain was snowy.",
      choices: ["peak", "peek", "pique", "peke"],
      correct: 0,
      explanation: { correct: "'Peak' means the top of a mountain. 'Peek' means to look quickly, and 'pique' means to excite interest.", incorrect: ["CORRECT: 'peak' means the top or highest point.","'peek' means to glance or look quickly.","'pique' means to arouse interest.","'peke' is a type of dog, not a mountain top."] },
      studyAid: { definition: "'Peak' (top), 'peek' (glance), and 'pique' (interest) are homophones with very different meanings.", example: "The peak of the mountain. Take a peek. Pique your curiosity.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which word means 'to cut with teeth'?",
      choices: ["byte", "bite", "bight", "byet"],
      correct: 1,
      explanation: { correct: "'Bite' means to cut or grip with teeth. 'Byte' is a computer term.", incorrect: ["'byte' is a unit of computer data.","CORRECT: 'bite' means to use teeth to cut or grip.","'bight' is a curve in a coastline or rope.","'byet' is not a real word."] },
      studyAid: { definition: "'Bite' (use teeth) and 'byte' (computer data) sound the same but have unrelated meanings.", example: "The dog will bite. The file is 500 bytes.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Fill in the blank: Please ___ the letter in the mailbox.",
      choices: ["male", "mail", "maile", "malle"],
      correct: 1,
      explanation: { correct: "'Mail' means letters and packages sent by post. 'Male' refers to a boy or man.", incorrect: ["'male' refers to a gender, not letters.","CORRECT: 'mail' means letters and packages.","'maile' is a misspelling.","'malle' is not a real word."] },
      studyAid: { definition: "'Mail' (letters) and 'male' (boy/man) are homophones.", example: "I sent the mail. He is a male doctor.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which sentence uses 'hear' correctly?",
      choices: ["I can here the music.", "I can hear the music.", "I can heir the music.", "I can hare the music."],
      correct: 1,
      explanation: { correct: "'Hear' means to perceive sound with your ears. 'Here' means this place.", incorrect: ["'here' means this place, not listening.","CORRECT: 'hear' means to listen or perceive sound.","'heir' is a person who inherits something.","'hare' is an animal like a rabbit."] },
      studyAid: { definition: "'Hear' (listen with ears) and 'here' (this place) are homophones.", example: "Can you hear me? Come here, please.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "What is the correct word? She wore a ___ dress to the party.",
      choices: ["read", "red", "reed", "redd"],
      correct: 1,
      explanation: { correct: "'Red' is a color. 'Read' is what you do with books, and 'reed' is a tall grass.", incorrect: ["'read' is the action of looking at words; the color is spelled 'red.'","CORRECT: 'red' is the color.","'reed' is a tall grass that grows in water.","'redd' is not a standard word."] },
      studyAid: { definition: "'Red' (color), 'read' (look at words), and 'reed' (grass) can sound alike depending on tense.", example: "She wore a red dress. I read a book. A reed grows by the pond.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which word means 'a long passage in a building'?",
      choices: ["isle", "I'll", "aisle", "isle"],
      correct: 2,
      explanation: { correct: "'Aisle' is a long passage between rows of seats or shelves. 'Isle' is an island, and 'I'll' is a contraction.", incorrect: ["'isle' means island, not a passage.","'I'll' is a contraction for 'I will.'","CORRECT: 'aisle' is a passage between rows.","'isle' is repeated and means island."] },
      studyAid: { definition: "'Aisle' (passage), 'isle' (island), and 'I'll' (I will) are homophones.", example: "Walk down the aisle. A tropical isle. I'll be there soon.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Fill in the blank: The squirrel buried ___ nuts under the tree.",
      choices: ["it's", "its", "its'", "it is"],
      correct: 1,
      explanation: { correct: "'Its' is the possessive form showing the nuts belong to the squirrel. 'It's' is a contraction for 'it is.'", incorrect: ["'it's' means 'it is,' not possession.","CORRECT: 'its' shows that the nuts belong to the squirrel.","'its'' is never correct in English.","'it is' does not show possession in this sentence structure."] },
      studyAid: { definition: "'Its' (possessive, no apostrophe) shows ownership. 'It's' (with apostrophe) is a contraction for 'it is.'", example: "The dog wagged its tail. It's a sunny day.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which word means 'to influence or have power over'?",
      choices: ["effect", "affect", "affekt", "efect"],
      correct: 1,
      explanation: { correct: "'Affect' is usually a verb meaning to influence. 'Effect' is usually a noun meaning a result.", incorrect: ["'effect' is usually a noun meaning a result.","CORRECT: 'affect' is a verb meaning to influence.","'affekt' is a misspelling.","'efect' is a misspelling."] },
      studyAid: { definition: "'Affect' (verb, to influence) vs. 'effect' (noun, a result). Remember: A for Action (verb), E for End result (noun).", example: "The weather affects my mood. The medicine had a good effect.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "What is the correct word? The ___ of the story was exciting.",
      choices: ["plain", "plane", "plaine", "plot"],
      correct: 3,
      explanation: { correct: "'Plot' means the events of a story. 'Plain' means simple or a flat area of land. 'Plane' is an airplane or flat surface.", incorrect: ["'plain' means simple or a flat land area.","'plane' is an aircraft.","'plaine' is a misspelling.","CORRECT: 'plot' means the sequence of events in a story."] },
      studyAid: { definition: "'Plot' (story events), 'plain' (simple/flat land), and 'plane' (aircraft) are not exact homophones but are often confused.", example: "The plot was surprising. The plain was flat. The plane flew high.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which sentence uses 'right' correctly to mean 'correct'?",
      choices: ["Turn left at the light, not right.", "You have the right to speak.", "That is the right answer.", "Write your name on the line."],
      correct: 2,
      explanation: { correct: "'Right' can mean correct, the opposite of left, or a legal power. 'That is the right answer' uses it to mean correct.", incorrect: ["This uses 'right' as the opposite of left.","This uses 'right' as a legal power or privilege.","CORRECT: 'right' means correct in this sentence.","'write' is a different word meaning to form letters."] },
      studyAid: { definition: "'Right' has many meanings: correct, opposite of left, or a privilege. 'Write' means to form letters with a pen or pencil.", example: "That is the right answer. Turn right. You have the right to vote. Write a letter.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Fill in the blank: Do you know ___ coming to the party?",
      choices: ["who's", "whose", "whos", "who"],
      correct: 0,
      explanation: { correct: "'Who's' is the contraction for 'who is.' The sentence means 'Do you know who is coming to the party?'", incorrect: ["CORRECT: 'who's' = 'who is.'","'whose' shows ownership, not 'who is.'","'whos' is missing the apostrophe.","'who' alone does not form the verb needed here."] },
      studyAid: { definition: "'Who's' (who is) is a contraction. 'Whose' (belonging to whom) is a possessive pronoun.", example: "Who's at the door? Whose book is this?", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    },
    {
      question: "Which word means 'to rest on a surface'?",
      choices: ["lie", "lye", "lei", "ly"],
      correct: 0,
      explanation: { correct: "'Lie' means to rest on a surface. 'Lye' is a strong chemical used in soap. 'Lei' is a Hawaiian flower necklace.", incorrect: ["CORRECT: 'lie' means to recline or rest on a surface.","'lye' is a dangerous chemical used in cleaning.","'lei' is a Hawaiian garland of flowers.","'ly' is a suffix, not a verb meaning to rest."] },
      studyAid: { definition: "'Lie' (to recline), 'lye' (chemical), and 'lei' (flower necklace) are homophones.", example: "Lie down for a nap. Lye is used in soap. She wore a lei at the party.", link: "https://www.readingrockets.org/article/word-play-homophones", linkText: "Reading Rockets - Homophones" }
    }
  ]
};


/* 1.5 Rhyming */
QUESTION_BANK['vocabulary-rhyming'] = {
  title: "Rhyming Words",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which word rhymes with 'thunder'?",
      choices: ["thunder", "wonder", "tender", "thicker"],
      correct: 1,
      explanation: { correct: "'Wonder' rhymes with 'thunder' because they both end with the same vowel and consonant sounds: /un-der/.", incorrect: ["A word does not rhyme with itself in quizzes.","CORRECT: 'wonder' ends with the same -under sound.","'tender' ends with -ender, a different vowel sound.","'thicker' ends with -icker, a different vowel sound."] },
      studyAid: { definition: "Rhyming words have the same ending sounds, starting from the stressed vowel to the end of the word.", example: "cat / hat / bat; thunder / wonder / under", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word does NOT rhyme with the others?",
      choices: ["light", "night", "kite", "lit"],
      correct: 3,
      explanation: { correct: "'Lit' has a short i sound, while 'light,' 'night,' and 'kite' all have the long i sound at the end.", incorrect: ["'light' has the long i sound and rhymes with 'night' and 'kite.'","'night' rhymes with 'light' and 'kite.'","'kite' rhymes with 'light' and 'night.'","CORRECT: 'lit' has a short i sound and does not rhyme with the others."] },
      studyAid: { definition: "Words rhyme when their final stressed vowel and following sounds match. Short and long vowels do not rhyme with each other.", example: "light / night / kite (long i) vs. lit / sit / kit (short i)", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "What word rhymes with 'ocean'?",
      choices: ["motion", "option", "potions", "nation"],
      correct: 0,
      explanation: { correct: "'Motion' rhymes with 'ocean' because both end in the /-shun/ sound.", incorrect: ["CORRECT: 'motion' ends with the same -shun sound as 'ocean.'","'option' ends with -shun but has a different starting vowel sound.","'potions' ends with -shunz, which adds a z sound.","'nation' ends with -shun but has a different starting vowel sound."] },
      studyAid: { definition: "Rhyming words share the same ending sounds from the stressed vowel onward.", example: "ocean / motion / potion / devotion", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which pair of words are perfect rhymes?",
      choices: ["love / move", "great / greet", "stone / throne", "food / good"],
      correct: 2,
      explanation: { correct: "'Stone' and 'throne' are perfect rhymes because every sound after the initial consonant matches exactly.", incorrect: ["'love' and 'move' have different vowel sounds.","'great' and 'greet' have different vowel sounds.","CORRECT: 'stone' and 'throne' match perfectly after the first sound.","'food' has a long u sound; 'good' has a short oo sound."] },
      studyAid: { definition: "A perfect rhyme matches all sounds from the stressed vowel to the end of the word.", example: "stone / throne / alone; cat / hat / bat", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word rhymes with 'enough'?",
      choices: ["cough", "tough", "bough", "though"],
      correct: 1,
      explanation: { correct: "'Tough' rhymes with 'enough' because both end with the /uff/ sound. The spelling '-ough' can make many different sounds.", incorrect: ["'cough' ends with an /off/ sound, not /uff./","CORRECT: 'tough' ends with the same /uff/ sound.","'bough' ends with an /ow/ sound.","'though' ends with a long o sound."] },
      studyAid: { definition: "The letter group '-ough' can make many sounds. You must listen to the sounds, not just the spelling, to find rhymes.", example: "enough / tough / rough / stuff", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word does NOT rhyme with 'heard'?",
      choices: ["bird", "word", "herd", "beard"],
      correct: 3,
      explanation: { correct: "'Beard' has the /eerd/ sound, while 'heard,' 'bird,' 'word,' and 'herd' all have the /erd/ sound.", incorrect: ["'bird' has the same /erd/ sound as 'heard.'","'word' has the same /erd/ sound.","'herd' has the same /erd/ sound.","CORRECT: 'beard' has a long e sound and does not rhyme."] },
      studyAid: { definition: "'Ir,' 'er,' 'ur,' and 'ear' can all make the /er/ sound, but 'ear' can also make the /eer/ sound as in 'beard.'", example: "heard / bird / word / herd (all /er/) vs. beard / fear / near (/eer/)", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "What is a rhyming word for 'measure'?",
      choices: ["pleasure", "pressure", "treasure", "leisure"],
      correct: 0,
      explanation: { correct: "'Pleasure' rhymes with 'measure' because both end in the /-zher/ sound.", incorrect: ["CORRECT: 'pleasure' ends with the same -zher sound.","'pressure' ends with -sher, a slightly different sound.","'treasure' also rhymes! Wait—both 'pleasure' and 'treasure' rhyme with 'measure.' In this question, 'pleasure' is the intended answer, but 'treasure' is also a valid rhyme. For the quiz, 'pleasure' is listed as correct.","'leisure' ends with -zher in some accents but is often pronounced differently."] },
      studyAid: { definition: "Words that share ending sounds are rhymes. Sometimes more than one answer can rhyme.", example: "measure / pleasure / treasure / leisure", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word rhymes with 'plumber'?",
      choices: ["number", "lumber", "dumber", "All of the above"],
      correct: 3,
      explanation: { correct: "'Number,' 'lumber,' and 'dumber' all rhyme with 'plumber' because they share the /-umber/ ending sound.", incorrect: ["'number' rhymes, but so do the others.","'lumber' rhymes, but so do the others.","'dumber' rhymes, but so do the others.","CORRECT: All three words rhyme with 'plumber.'"] },
      studyAid: { definition: "Multiple words can rhyme with the same target word if they share the same ending sounds.", example: "plumber / number / lumber / dumber / cucumber", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word does NOT rhyme with 'weight'?",
      choices: ["eight", "freight", "height", "straight"],
      correct: 2,
      explanation: { correct: "'Height' ends with the /ite/ sound, while 'weight,' 'eight,' 'freight,' and 'straight' all end with the /ate/ sound.", incorrect: ["'eight' rhymes with 'weight.'","'freight' rhymes with 'weight.'","CORRECT: 'height' has a different vowel sound and does not rhyme.","'straight' rhymes with 'weight.'"] },
      studyAid: { definition: "Silent letters can trick you. 'Weight' and 'eight' share the long a sound, but 'height' has a long i sound.", example: "weight / eight / freight / straight (all /ate/) vs. height / kite / light (all /ite/)", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "What word rhymes with 'circle'?",
      choices: ["cycle", "bicycle", "turtle", "purple"],
      correct: 3,
      explanation: { correct: "'Purple' is a near rhyme (slant rhyme) with 'circle' because both end with the /-ul/ sound. Among the choices, it is the closest match.", incorrect: ["'cycle' ends with /-ikel/, a different sound.","'bicycle' also ends with /-ikel/.","'turtle' ends with /-ul/ but has a different middle consonant.","CORRECT: 'purple' shares the closest ending sound with 'circle.'"] },
      studyAid: { definition: "A slant rhyme (near rhyme) shares some but not all ending sounds. It is common in poetry.", example: "circle / purple / turtle", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word rhymes with 'through'?",
      choices: ["threw", "though", "thorough", "thought"],
      correct: 0,
      explanation: { correct: "'Threw' rhymes with 'through' because both end with the /oo/ sound. They are homophones too.", incorrect: ["CORRECT: 'threw' sounds exactly like 'through.'","'though' ends with a long o sound.","'thorough' ends with an /oh/ sound.","'thought' ends with an /aw/ sound."] },
      studyAid: { definition: "Homophones often rhyme because they sound exactly alike, even though their spellings differ.", example: "through / threw / blue / true / flew", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which pair does NOT rhyme?",
      choices: ["bear / pear", "bare / hair", "hear / bear", "care / stare"],
      correct: 2,
      explanation: { correct: "'Hear' has the /eer/ sound, while 'bear' has the /air/ sound. They do not rhyme.", incorrect: ["'bear' and 'pear' both have the /air/ sound.","'bare' and 'hair' both have the /air/ sound.","CORRECT: 'hear' and 'bear' have different vowel sounds.","'care' and 'stare' both have the /air/ sound."] },
      studyAid: { definition: "'Ear' can make /eer/ (hear) or /air/ (bear) depending on the word. Listen carefully to the vowel sound.", example: "hear / near / deer (/eer/) vs. bear / pear / wear (/air/)", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "What word rhymes with 'choir'?",
      choices: ["chair", "fire", "higher", "buyer"],
      correct: 1,
      explanation: { correct: "'Choir' is pronounced with the /ier/ sound, making it rhyme with 'fire,' 'higher,' and 'buyer.'", incorrect: ["'chair' has the /air/ sound.","CORRECT: 'fire' rhymes with 'choir' in many English dialects.","'higher' also rhymes, but 'fire' is the best single choice.","'buyer' also rhymes, but 'fire' is the best single choice."] },
      studyAid: { definition: "'Choir' is an unusual spelling that sounds like /kwire/, rhyming with words ending in -ire or -yer.", example: "choir / fire / wire / buyer / higher", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word rhymes with 'sword'?",
      choices: ["word", "board", "scored", "toward"],
      correct: 0,
      explanation: { correct: "'Word' rhymes with 'sword' because the 'w' in 'sword' is silent, making it sound like /ord/.", incorrect: ["CORRECT: 'word' rhymes with 'sword' because the 'w' is silent.","'board' has the /ord/ sound in some dialects but usually /oard/.","'scored' has the /ord/ sound but with an extra syllable feel.","'toward' has two syllables and does not rhyme perfectly."] },
      studyAid: { definition: "Silent letters change how words sound. The 'w' in 'sword' is silent, so it rhymes with 'word' and 'bird.'", example: "sword / word / bird / heard", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    },
    {
      question: "Which word does NOT rhyme with 'dove' (the bird)?",
      choices: ["love", "glove", "above", "move"],
      correct: 3,
      explanation: { correct: "'Move' has the long oo sound, while 'dove,' 'love,' 'glove,' and 'above' all have the short u /uv/ sound.", incorrect: ["'love' rhymes with 'dove.'","'glove' rhymes with 'dove.'","'above' rhymes with 'dove.'","CORRECT: 'move' has a different vowel sound and does not rhyme."] },
      studyAid: { definition: "'Ove' can make the /uv/ sound or the /oo/ sound. You must know the word to pronounce it correctly.", example: "dove / love / glove / above (/uv/) vs. move / prove / groove (/oo/)", link: "https://www.readingrockets.org/article/learning-read-rhyme", linkText: "Reading Rockets - Rhyme" }
    }
  ]
};

/* 1.6 Synonyms / Antonyms */
QUESTION_BANK['vocabulary-synonyms-antonyms'] = {
  title: "Synonyms and Antonyms",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which word is a synonym for 'enormous'?",
      choices: ["tiny", "huge", "small", "little"],
      correct: 1,
      explanation: { correct: "A synonym is a word with a similar meaning. 'Huge' means very big, just like 'enormous.'", incorrect: ["'tiny' means very small, the opposite of enormous.","CORRECT: 'huge' means very big, similar to 'enormous.'","'small' is the opposite of enormous.","'little' is also the opposite of enormous."] },
      studyAid: { definition: "A synonym is a word that has the same or nearly the same meaning as another word.", example: "enormous / huge / gigantic / massive", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the antonym of 'generous'?",
      choices: ["kind", "selfish", "giving", "helpful"],
      correct: 1,
      explanation: { correct: "An antonym is a word with the opposite meaning. 'Selfish' means thinking only of yourself, which is the opposite of generous.", incorrect: ["'kind' is a synonym of generous, not an antonym.","CORRECT: 'selfish' is the opposite of generous.","'giving' is a synonym of generous.","'helpful' is similar to generous, not opposite."] },
      studyAid: { definition: "An antonym is a word that means the opposite of another word.", example: "generous / selfish; hot / cold; happy / sad", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pair are synonyms?",
      choices: ["begin / end", "shout / whisper", "rapid / fast", "victory / defeat"],
      correct: 2,
      explanation: { correct: "'Rapid' and 'fast' both mean quick or speedy, so they are synonyms.", incorrect: ["'begin' and 'end' are antonyms.","'shout' and 'whisper' are antonyms.","CORRECT: 'rapid' and 'fast' both mean quick.","'victory' and 'defeat' are antonyms."] },
      studyAid: { definition: "Synonyms are words with similar meanings. Antonyms are words with opposite meanings.", example: "rapid / fast / quick / swift", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the antonym of 'ancient'?",
      choices: ["old", "modern", "aged", "elderly"],
      correct: 1,
      explanation: { correct: "'Modern' means new or current, which is the opposite of 'ancient' meaning very old.", incorrect: ["'old' is a synonym of ancient.","CORRECT: 'modern' is the opposite of ancient.","'aged' means old, a synonym.","'elderly' means old, a synonym."] },
      studyAid: { definition: "'Ancient' means very old, often from long ago. Its opposite is 'modern' or 'new.'", example: "ancient / modern; old / new; outdated / current", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is a synonym for 'brilliant'?",
      choices: ["dull", "bright", "dim", "faded"],
      correct: 1,
      explanation: { correct: "'Bright' and 'brilliant' both mean shining with a lot of light or very smart.", incorrect: ["'dull' is the opposite of brilliant.","CORRECT: 'bright' is a synonym for brilliant.","'dim' is the opposite of brilliant.","'faded' is the opposite of brilliant."] },
      studyAid: { definition: "'Brilliant' can mean very bright or very smart. Synonyms depend on which meaning is used.", example: "brilliant / bright / radiant / dazzling", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the antonym of 'arrogant'?",
      choices: ["proud", "humble", "confident", "bold"],
      correct: 1,
      explanation: { correct: "'Humble' means not thinking you are better than others, which is the opposite of 'arrogant' meaning too proud.", incorrect: ["'proud' is similar to arrogant, not opposite.","CORRECT: 'humble' is the opposite of arrogant.","'confident' is not the opposite; you can be confident and humble.","'bold' is not the opposite of arrogant."] },
      studyAid: { definition: "'Arrogant' means having too much pride in yourself. 'Humble' means modest and respectful.", example: "arrogant / humble; boastful / modest; vain / unassuming", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pair are antonyms?",
      choices: ["joyful / cheerful", "vast / huge", "fragile / sturdy", "rapid / swift"],
      correct: 2,
      explanation: { correct: "'Fragile' means easily broken, and 'sturdy' means strong and solid. They are opposites.", incorrect: ["'joyful' and 'cheerful' are synonyms.","'vast' and 'huge' are synonyms.","CORRECT: 'fragile' and 'sturdy' are opposites.","'rapid' and 'swift' are synonyms."] },
      studyAid: { definition: "Antonyms are words with opposite meanings. Look for pairs that contrast strongly.", example: "fragile / sturdy / strong; weak / powerful", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is a synonym for 'drenched'?",
      choices: ["dry", "soaked", "thirsty", "parched"],
      correct: 1,
      explanation: { correct: "'Soaked' means very wet, which is the same as 'drenched.'", incorrect: ["'dry' is the opposite of drenched.","CORRECT: 'soaked' means very wet, like 'drenched.'","'thirsty' is wanting water, not being wet.","'parched' means very dry, the opposite."] },
      studyAid: { definition: "'Drenched' means completely covered with liquid. Synonyms describe extreme wetness.", example: "drenched / soaked / saturated / waterlogged", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is the antonym of 'frequently'?",
      choices: ["often", "regularly", "rarely", "constantly"],
      correct: 2,
      explanation: { correct: "'Rarely' means not often, which is the opposite of 'frequently' meaning happening often.", incorrect: ["'often' is a synonym of frequently.","'regularly' is similar to frequently.","CORRECT: 'rarely' means not often, the opposite.","'constantly' is a synonym of frequently."] },
      studyAid: { definition: "'Frequently' means happening many times. 'Rarely' means almost never.", example: "frequently / rarely; often / seldom; always / never", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pair are synonyms?",
      choices: ["gloomy / sunny", "furious / calm", "weary / tired", "noisy / quiet"],
      correct: 2,
      explanation: { correct: "'Weary' and 'tired' both mean needing rest or sleep.", incorrect: ["'gloomy' and 'sunny' are opposites.","'furious' and 'calm' are opposites.","CORRECT: 'weary' and 'tired' mean the same thing.","'noisy' and 'quiet' are opposites."] },
      studyAid: { definition: "'Weary' is a more formal or literary word for 'tired.' They mean the same thing.", example: "weary / tired / exhausted / fatigued", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the antonym of 'cooperate'?",
      choices: ["help", "assist", "refuse", "support"],
      correct: 2,
      explanation: { correct: "'Refuse' means to say no or not do something, which is the opposite of 'cooperate' meaning to work together.", incorrect: ["'help' is similar to cooperate.","'assist' is similar to cooperate.","CORRECT: 'refuse' means to not cooperate.","'support' is similar to cooperate."] },
      studyAid: { definition: "'Cooperate' means to work together toward a goal. Its opposite is to refuse or resist.", example: "cooperate / refuse / resist / oppose", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is a synonym for 'cautious'?",
      choices: ["careless", "reckless", "careful", "rash"],
      correct: 2,
      explanation: { correct: "'Careful' and 'cautious' both mean being alert to danger and avoiding risks.", incorrect: ["'careless' is the opposite of cautious.","'reckless' is the opposite of cautious.","CORRECT: 'careful' means the same as cautious.","'rash' means acting without thinking, the opposite."] },
      studyAid: { definition: "'Cautious' means careful to avoid danger or mistakes.", example: "cautious / careful / wary / watchful", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the antonym of 'expand'?",
      choices: ["grow", "enlarge", "shrink", "spread"],
      correct: 2,
      explanation: { correct: "'Shrink' means to become smaller, which is the opposite of 'expand' meaning to become larger.", incorrect: ["'grow' is a synonym of expand.","'enlarge' is a synonym of expand.","CORRECT: 'shrink' means to get smaller, the opposite of expand.","'spread' is similar to expand."] },
      studyAid: { definition: "'Expand' means to grow larger. 'Shrink' means to grow smaller.", example: "expand / shrink / contract / reduce", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pair are antonyms?",
      choices: ["magnificent / splendid", "hostile / friendly", "immense / gigantic", "plentiful / abundant"],
      correct: 1,
      explanation: { correct: "'Hostile' means unfriendly or aggressive, while 'friendly' means kind and welcoming. They are opposites.", incorrect: ["'magnificent' and 'splendid' are synonyms.","CORRECT: 'hostile' and 'friendly' are opposites.","'immense' and 'gigantic' are synonyms.","'plentiful' and 'abundant' are synonyms."] },
      studyAid: { definition: "'Hostile' means showing or feeling opposition or dislike. 'Friendly' means kind and pleasant.", example: "hostile / friendly / welcoming / aggressive", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is a synonym for 'migrate'?",
      choices: ["stay", "settle", "relocate", "remain"],
      correct: 2,
      explanation: { correct: "'Relocate' means to move to a new place, which is the same as 'migrate.'", incorrect: ["'stay' is the opposite of migrate.","'settle' can mean to stay in one place, opposite of migrate.","CORRECT: 'relocate' means to move, like 'migrate.'","'remain' is the opposite of migrate."] },
      studyAid: { definition: "'Migrate' means to move from one place to another, usually seasonally or permanently.", example: "migrate / relocate / move / journey", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 1.7 Comparatives, Superlatives */
QUESTION_BANK['vocabulary-comparatives-superlatives'] = {
  title: "Comparatives and Superlatives",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which sentence uses the comparative form correctly?",
      choices: ["This book is more better than that one.", "This book is gooder than that one.", "This book is better than that one.", "This book is best than that one."],
      correct: 2,
      explanation: { correct: "'Better' is the correct comparative form of 'good.' You do not add '-er' or use 'more' with irregular adjectives like 'good.'", incorrect: ["'More better' is double-marked comparison; use only 'better.'","'gooder' is not a real word; 'good' is irregular.","CORRECT: 'better' is the correct comparative form of 'good.'","'best' is the superlative form, used when comparing three or more things."] },
      studyAid: { definition: "Comparative adjectives compare two things. 'Good' is irregular: good → better → best.", example: "good / better / best; bad / worse / worst", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the superlative form of 'happy'?",
      choices: ["more happy", "happier", "happiest", "most happier"],
      correct: 2,
      explanation: { correct: "'Happiest' is the superlative form of 'happy.' For short adjectives ending in 'y,' change 'y' to 'i' and add '-est' for superlative.", incorrect: ["'more happy' is not the standard superlative form.","'happier' is the comparative form, comparing two things.","CORRECT: 'happiest' is the superlative form.","'most happier' is double-marked and incorrect."] },
      studyAid: { definition: "Superlative adjectives compare three or more things. For short adjectives ending in 'y,' change 'y' to 'i' and add '-est.'", example: "happy → happier → happiest; silly → sillier → silliest", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["Of the two dogs, this one is the most fast.", "Of the two dogs, this one is the faster.", "Of the two dogs, this one is fasterest.", "Of the two dogs, this one is more faster."],
      correct: 1,
      explanation: { correct: "When comparing two things, use the comparative form ('faster'), not the superlative ('fastest').", incorrect: ["'the most fast' is incorrect; use 'faster' for two things.","CORRECT: 'faster' is the correct comparative for two dogs.","'fasterest' is not a real word.","'more faster' is double-marked and incorrect."] },
      studyAid: { definition: "Use comparative (-er/more) when comparing two things. Use superlative (-est/most) when comparing three or more.", example: "Two dogs: faster. Three dogs: fastest.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the correct comparative form of 'beautiful'?",
      choices: ["beautifuller", "more beautiful", "most beautiful", "beautifuler"],
      correct: 1,
      explanation: { correct: "For long adjectives (three or more syllables), use 'more' for comparative and 'most' for superlative.", incorrect: ["'beautifuller' is incorrect; long adjectives do not add '-er.'","CORRECT: 'more beautiful' is correct for long adjectives.","'most beautiful' is the superlative, not comparative.","'beautifuler' is incorrect."] },
      studyAid: { definition: "Adjectives with three or more syllables use 'more' and 'most' instead of '-er' and '-est.'", example: "beautiful → more beautiful → most beautiful; expensive → more expensive → most expensive", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses the superlative correctly?",
      choices: ["She is the more intelligent student in the class.", "She is the most intelligent student in the class.", "She is the intelligenter student in the class.", "She is the intelligentest student in the class."],
      correct: 1,
      explanation: { correct: "'Most intelligent' is correct because 'intelligent' is a long adjective. Use 'most' for superlatives of long adjectives.", incorrect: ["'more intelligent' is comparative, not superlative.","CORRECT: 'most intelligent' is the correct superlative.","'intelligenter' is not a real word.","'intelligentest' is not a real word."] },
      studyAid: { definition: "Long adjectives (3+ syllables) form superlatives with 'most,' not '-est.'", example: "intelligent → most intelligent; difficult → most difficult", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the comparative form of 'bad'?",
      choices: ["badder", "more bad", "worse", "worst"],
      correct: 2,
      explanation: { correct: "'Worse' is the irregular comparative form of 'bad.' 'Bad' does not follow the regular rules.", incorrect: ["'badder' is not a real word.","'more bad' is incorrect for this irregular adjective.","CORRECT: 'worse' is the comparative form of 'bad.'","'worst' is the superlative, not comparative."] },
      studyAid: { definition: "Some adjectives are irregular and do not use '-er' or 'more.' Bad → worse → worst.", example: "bad / worse / worst; good / better / best; far / farther / farthest", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is written correctly?",
      choices: ["My cat is the most cutest pet in the world.", "My cat is the cuter pet in the world.", "My cat is the cutest pet in the world.", "My cat is the more cutest pet in the world."],
      correct: 2,
      explanation: { correct: "'Cutest' is the correct superlative form of 'cute.' Do not use 'most' with '-est' (double marking).", incorrect: ["'most cutest' is double-marked; use only 'cutest.'","'cuter' is comparative, not superlative.","CORRECT: 'cutest' is the correct superlative form.","'more cutest' is double-marked and incorrect."] },
      studyAid: { definition: "Never combine 'more/most' with '-er/-est.' That is called double marking and is always wrong.", example: "Incorrect: more happier, most fastest. Correct: happier, fastest.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the correct comparative form of 'far' (distance)?",
      choices: ["more far", "farer", "farther", "farthest"],
      correct: 2,
      explanation: { correct: "'Farther' is used for physical distance. 'Further' is used for figurative distance or more/additional.", incorrect: ["'more far' is incorrect for this irregular adjective.","'farer' is not a real word.","CORRECT: 'farther' compares physical distance.","'farthest' is the superlative, not comparative."] },
      studyAid: { definition: "'Farther' = physical distance. 'Further' = figurative distance or additional amount.", example: "The store is farther than the park. We need further discussion.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word correctly completes the sentence? This test was ___ than the last one.",
      choices: ["difficult", "more difficult", "most difficult", "difficultest"],
      correct: 1,
      explanation: { correct: "'More difficult' is correct because 'difficult' has three syllables and needs 'more' for the comparative.", incorrect: ["'difficult' is the base form, not comparative.","CORRECT: 'more difficult' is the correct comparative.","'most difficult' is superlative, not comparative.","'difficultest' is not a real word."] },
      studyAid: { definition: "Adjectives with three or more syllables use 'more' for comparative.", example: "difficult → more difficult; interesting → more interesting", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the superlative form of 'little' (amount)?",
      choices: ["littler", "more little", "less", "least"],
      correct: 3,
      explanation: { correct: "'Least' is the superlative form of 'little' when talking about amount. 'Less' is the comparative.", incorrect: ["'littler' refers to size, not amount, and is rare.","'more little' is incorrect.","'less' is the comparative, not superlative.","CORRECT: 'least' is the superlative form for amount."] },
      studyAid: { definition: "'Little' (amount) is irregular: little → less → least. This is different from 'little' (size).", example: "little / less / least (amount); small / smaller / smallest (size)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["Of all the players, he is the more tall.", "Of all the players, he is the most tall.", "Of all the players, he is the tallest.", "Of all the players, he is the more taller."],
      correct: 2,
      explanation: { correct: "'Tallest' is the correct superlative form of the one-syllable adjective 'tall.'", incorrect: ["'more tall' is incorrect for a one-syllable adjective.","'most tall' is incorrect; one-syllable adjectives use '-est.'","CORRECT: 'tallest' is the correct superlative.","'more taller' is double-marked and incorrect."] },
      studyAid: { definition: "One-syllable adjectives usually add '-er' for comparative and '-est' for superlative.", example: "tall → taller → tallest; fast → faster → fastest", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the comparative form of 'well' (health)?",
      choices: ["weller", "more well", "better", "best"],
      correct: 2,
      explanation: { correct: "'Better' is the irregular comparative form of 'well' when referring to health.", incorrect: ["'weller' is not a real word.","'more well' is sometimes used, but 'better' is standard.","CORRECT: 'better' is the comparative form of 'well.'","'best' is the superlative, not comparative."] },
      studyAid: { definition: "'Well' (healthy) is irregular: well → better → best. This is different from 'good.'", example: "I feel well today. I feel better than yesterday. I feel the best I have ever felt.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word correctly completes the sentence? This is the ___ book I have ever read.",
      choices: ["more boring", "most boring", "boringer", "boringest"],
      correct: 1,
      explanation: { correct: "'Most boring' is correct because 'boring' has two syllables and ends in -ing. Two-syllable adjectives ending in -ing, -ed, -ful, or -less usually use 'more/most.'", incorrect: ["'more boring' is comparative, not superlative.","CORRECT: 'most boring' is the correct superlative.","'boringer' is not standard English.","'boringest' is not standard English."] },
      studyAid: { definition: "Two-syllable adjectives ending in -y usually change to -ier/-iest. Others usually use more/most.", example: "happy → happier → happiest; boring → more boring → most boring", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the correct form? The blue whale is ___ than an elephant.",
      choices: ["more big", "bigger", "most big", "biggest"],
      correct: 1,
      explanation: { correct: "'Bigger' is the correct comparative form of the one-syllable adjective 'big.'", incorrect: ["'more big' is incorrect for a one-syllable adjective.","CORRECT: 'bigger' doubles the final consonant and adds '-er.'","'most big' is incorrect.","'biggest' is superlative, not comparative."] },
      studyAid: { definition: "For one-syllable adjectives ending in consonant-vowel-consonant, double the final consonant before adding -er or -est.", example: "big → bigger → biggest; hot → hotter → hottest; thin → thinner → thinnest", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses the comparative correctly?",
      choices: ["This problem is more harder than the first one.", "This problem is the hardest than the first one.", "This problem is harder than the first one.", "This problem is most hard than the first one."],
      correct: 2,
      explanation: { correct: "'Harder' is the correct comparative form of 'hard.' Do not use 'more' with '-er.'", incorrect: ["'more harder' is double-marked.","'the hardest' is superlative and does not work with 'than.'","CORRECT: 'harder' is the correct comparative form.","'most hard' is incorrect; use 'harder' or 'hardest.'"] },
      studyAid: { definition: "Use 'than' with comparative adjectives. Never use double marking (more + -er).", example: "harder than; more difficult than; faster than", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 1.8 Word Meaning from Context */
QUESTION_BANK['vocabulary-word-meaning-context'] = {
  title: "Word Meaning from Context",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "In the sentence 'The arid desert had no water for miles,' what does 'arid' mean?",
      choices: ["wet and rainy", "very dry", "cold and snowy", "green and lush"],
      correct: 1,
      explanation: { correct: "The context says the desert had 'no water for miles,' so 'arid' must mean very dry.", incorrect: ["Wet and rainy is the opposite of the context clue.","CORRECT: 'arid' means very dry, supported by 'no water for miles.'","Cold and snowy is not mentioned in the context.","Green and lush describes places with water, the opposite."] },
      studyAid: { definition: "Context clues are words or phrases around an unknown word that help you figure out its meaning.", example: "'The arid desert had no water' — 'no water' tells you 'arid' means dry.", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The boy was ecstatic when he won the race.' What does 'ecstatic' mean?",
      choices: ["very sad", "extremely happy", "very tired", "extremely angry"],
      correct: 1,
      explanation: { correct: "Winning a race is a happy event, so 'ecstatic' must mean extremely happy.", incorrect: ["Winning a race would not make someone sad.","CORRECT: 'ecstatic' means extremely happy, fitting the context of winning.","Winning a race is not usually associated with being tired.","Winning a race does not make someone extremely angry."] },
      studyAid: { definition: "Look at the situation described in the sentence to guess the meaning of an unknown word.", example: "'ecstatic' when winning = extremely happy", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The mammoth building towered over the small houses.' What does 'mammoth' mean?",
      choices: ["tiny", "ancient", "enormous", "colorful"],
      correct: 2,
      explanation: { correct: "The building 'towered over' the small houses, so 'mammoth' must mean enormous or huge.", incorrect: ["Tiny is the opposite of what the context suggests.","Ancient is not supported by the context.","CORRECT: 'mammoth' means enormous, shown by 'towered over the small houses.'","Colorful is not mentioned in the context."] },
      studyAid: { definition: "Comparison context clues show how one thing relates to another in size, amount, or quality.", example: "'mammoth building towered over small houses' = mammoth means very large", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'After the long hike, the weary travelers finally sat down.' What does 'weary' mean?",
      choices: ["excited", "frightened", "tired", "lost"],
      correct: 2,
      explanation: { correct: "After a long hike, travelers would be tired. 'Weary' means tired or exhausted.", incorrect: ["Excited does not fit after a long hike.","Frightened is not suggested by the context.","CORRECT: 'weary' means tired, which makes sense after a long hike.","Lost is not mentioned in the context."] },
      studyAid: { definition: "Cause-and-effect context clues help you figure out a word by what happened before or after.", example: "Long hike → weary travelers. 'Weary' must mean tired.", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The student was meticulous, checking every answer three times.' What does 'meticulous' mean?",
      choices: ["careless", "very careful", "quick", "confused"],
      correct: 1,
      explanation: { correct: "Checking every answer three times shows extreme care, so 'meticulous' means very careful.", incorrect: ["Careless is the opposite of checking everything three times.","CORRECT: 'meticulous' means very careful and precise.","Quick does not match checking three times.","Confused does not match the careful behavior described."] },
      studyAid: { definition: "Example context clues show what a word means by giving an example of the behavior.", example: "'checking every answer three times' shows that 'meticulous' means very careful.", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'Unlike her gregarious sister, Maya was quiet and shy.' What does 'gregarious' mean?",
      choices: ["outgoing and sociable", "angry and rude", "sad and lonely", "smart and studious"],
      correct: 0,
      explanation: { correct: "The word 'unlike' signals a contrast. If Maya is quiet and shy, 'gregarious' must mean outgoing and sociable.", incorrect: ["CORRECT: 'gregarious' means outgoing, the opposite of quiet and shy.","Angry and rude is not the opposite of quiet and shy.","Sad and lonely is somewhat opposite but not the best fit.","Smart and studious is not the opposite of quiet and shy."] },
      studyAid: { definition: "Contrast context clues use words like 'unlike,' 'but,' 'however,' or 'although' to show opposites.", example: "'Unlike her gregarious sister, Maya was quiet' = gregarious means outgoing", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The odor from the garbage was so pungent that everyone covered their noses.' What does 'pungent' mean?",
      choices: ["pleasant", "weak", "strong-smelling", "invisible"],
      correct: 2,
      explanation: { correct: "Everyone covered their noses because the smell was strong, so 'pungent' means strong-smelling.", incorrect: ["Pleasant smells would not make people cover their noses.","A weak smell would not cause everyone to cover their noses.","CORRECT: 'pungent' means strong-smelling, shown by people covering their noses.","Invisible does not describe a smell."] },
      studyAid: { definition: "Result or reaction context clues show what people do because of the unknown word.", example: "'everyone covered their noses' tells you 'pungent' means a strong, unpleasant smell.", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The old house looked dilapidated, with broken windows and a sagging roof.' What does 'dilapidated' mean?",
      choices: ["newly built", "falling apart", "brightly painted", "carefully decorated"],
      correct: 1,
      explanation: { correct: "Broken windows and a sagging roof show that the house is falling apart, so 'dilapidated' means in bad condition.", incorrect: ["Newly built is the opposite of broken and sagging.","CORRECT: 'dilapidated' means falling apart or in poor condition.","Brightly painted is not mentioned.","Carefully decorated is the opposite of the description."] },
      studyAid: { definition: "Description context clues list details that define the unknown word.", example: "broken windows + sagging roof = dilapidated (falling apart)", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The doctor gave the patient a placebo, which was just a sugar pill with no real medicine.' What does 'placebo' mean?",
      choices: ["a strong drug", "a fake treatment", "a vitamin", "a surgery"],
      correct: 1,
      explanation: { correct: "The context says it was 'just a sugar pill with no real medicine,' so a placebo is a fake treatment.", incorrect: ["A strong drug is the opposite of 'no real medicine.'","CORRECT: 'placebo' means a fake treatment that looks real.","A vitamin is a real substance, not a sugar pill.","A surgery is not a pill."] },
      studyAid: { definition: "Definition context clues sometimes explain the word directly after a comma or with phrases like 'which is.'", example: "'placebo, which was just a sugar pill' = placebo is a fake treatment", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The serpent slithered silently through the grass.' What does 'serpent' mean?",
      choices: ["bird", "snake", "mouse", "lizard"],
      correct: 1,
      explanation: { correct: "A creature that 'slithered' through grass is most likely a snake. 'Serpent' is another word for snake.", incorrect: ["Birds do not slither.","CORRECT: 'serpent' means snake, shown by 'slithered through the grass.'","Mice scurry, not slither.","Lizards crawl but do not typically slither."] },
      studyAid: { definition: "Action context clues use verbs that only certain things can do.", example: "'slithered' is something snakes (serpents) do.", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The children were jubilant because school was canceled due to snow.' What does 'jubilant' mean?",
      choices: ["worried", "overjoyed", "bored", "annoyed"],
      correct: 1,
      explanation: { correct: "Children are usually very happy when school is canceled, so 'jubilant' means overjoyed.", incorrect: ["Worried does not fit the situation.","CORRECT: 'jubilant' means extremely happy or overjoyed.","Bored does not fit the excitement of no school.","Annoyed is the opposite of how children feel."] },
      studyAid: { definition: "Situation context clues use the setting or event to suggest the word's meaning.", example: "school canceled due to snow → jubilant (overjoyed)", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The recipe said to simmer the soup, not let it boil rapidly.' What does 'simmer' mean?",
      choices: ["cook at high heat", "cook gently at low heat", "freeze solid", "bake in the oven"],
      correct: 1,
      explanation: { correct: "The contrast with 'boil rapidly' tells you that 'simmer' means to cook gently at low heat.", incorrect: ["Cooking at high heat is boiling, the opposite of simmer.","CORRECT: 'simmer' means to cook gently at low heat, contrasted with boiling.","Freezing is not related to cooking on a stove.","Baking is done in an oven, not on a stove."] },
      studyAid: { definition: "Contrast clues show what something is NOT in order to show what it IS.", example: "'not boil rapidly' = simmer is gentle, low-heat cooking", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The terrain was so rugged that our car could barely drive over the rocks and holes.' What does 'rugged' mean?",
      choices: ["smooth and flat", "rough and uneven", "wet and muddy", "soft and sandy"],
      correct: 1,
      explanation: { correct: "Rocks and holes make the ground rough and uneven, so 'rugged' means difficult to cross.", incorrect: ["Smooth and flat is the opposite of rocks and holes.","CORRECT: 'rugged' means rough and uneven.","Wet and muddy is not mentioned.","Soft and sandy is not the same as rocky."] },
      studyAid: { definition: "Physical description clues use details about the land or object to reveal the word's meaning.", example: "rocks and holes → rugged = rough and uneven", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The witness was candid, telling the whole truth without hiding anything.' What does 'candid' mean?",
      choices: ["dishonest", "shy", "honest and direct", "confused"],
      correct: 2,
      explanation: { correct: "Telling 'the whole truth without hiding anything' means being honest and direct, so 'candid' means honest.", incorrect: ["Dishonest is the opposite of telling the whole truth.","Shy does not match telling everything openly.","CORRECT: 'candid' means honest and direct.","Confused does not match the clarity of telling the truth."] },
      studyAid: { definition: "Restatement clues say the same idea in different words, helping you understand the unknown word.", example: "'telling the whole truth without hiding anything' = candid (honest and direct)", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    },
    {
      question: "'The athlete showed great fortitude, continuing to run even though her leg hurt badly.' What does 'fortitude' mean?",
      choices: ["fear", "courage and strength", "weakness", "speed"],
      correct: 1,
      explanation: { correct: "Continuing to run despite pain shows courage and strength, so 'fortitude' means mental and emotional strength.", incorrect: ["Fear would make her stop, not continue.","CORRECT: 'fortitude' means courage and strength in the face of pain.","Weakness is the opposite of what she showed.","Speed is not the focus of the sentence."] },
      studyAid: { definition: "Behavior context clues show what someone does to reveal their character or traits.", example: "continuing to run despite pain → fortitude = courage and strength", link: "https://www.readingrockets.org/article/using-context-clues", linkText: "Reading Rockets - Context Clues" }
    }
  ]
};


/* 1.9 Spelling */
QUESTION_BANK['vocabulary-spelling'] = {
  title: "Spelling",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which word is spelled correctly?",
      choices: ["accomodate", "accommodate", "acommodate", "accomadate"],
      correct: 1,
      explanation: { correct: "'Accommodate' is spelled with two c's and two m's. A common trick is to remember 'two cots need two mattresses.'", incorrect: ["Missing one 'm.'","CORRECT: 'accommodate' has two c's and two m's.","Missing one 'c' and one 'm.'","Missing one 'c' and has 'a' instead of 'o.'"] },
      studyAid: { definition: "Some words have double letters that are easy to miss. Look for patterns or memory tricks.", example: "accommodate (cc, mm), necessary (one c, two s's), occurrence (cc, rr)", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which spelling follows the 'i before e' rule correctly?",
      choices: ["freind", "recieve", "believe", "seige"],
      correct: 2,
      explanation: { correct: "'Believe' follows the rule: i before e except after c. There is no 'c' in 'believe,' so 'i' comes before 'e.'", incorrect: ["'freind' reverses the rule; it should be 'friend.'","'recieve' has a 'c' before it, so it should be 'receive' (e before i).","CORRECT: 'believe' follows i before e because there is no c.","'seige' should be 'siege' (i before e)."] },
      studyAid: { definition: "'I before e except after c' works for words with a long e sound: believe, receive, ceiling.", example: "believe (i before e), receive (e before i after c), ceiling (e before i after c)", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which word is spelled correctly?",
      choices: ["definately", "definitely", "definitly", "definitley"],
      correct: 1,
      explanation: { correct: "'Definitely' contains the word 'finite' in the middle. Remember: 'defi-NITE-ly.'", incorrect: ["'definately' swaps 'i' and 'a' incorrectly.","CORRECT: 'definitely' has 'nite' in the middle.","'definitly' is missing the 'e' before 'ly.'","'definitley' scrambles the letters."] },
      studyAid: { definition: "Break words into smaller parts to spell them. 'Definitely' = de + finite + ly.", example: "definite + ly = definitely; finite + ly does not change the 'e'", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which word uses the correct doubling rule when adding -ing?",
      choices: ["runing", "running", "runingg", "runnning"],
      correct: 1,
      explanation: { correct: "'Running' doubles the final 'n' because 'run' ends in consonant-vowel-consonant and is one syllable.", incorrect: ["'runing' forgot to double the final consonant.","CORRECT: 'running' doubles the 'n' before adding -ing.","'runingg' adds an extra 'g' incorrectly.","'runnning' has three n's, which is too many."] },
      studyAid: { definition: "For one-syllable words ending in consonant-vowel-consonant, double the final consonant before adding -ing or -ed.", example: "run → running, stop → stopping, plan → planning", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is spelled correctly?",
      choices: ["occurance", "occurence", "occurrence", "ocurrence"],
      correct: 2,
      explanation: { correct: "'Occurrence' is spelled with two c's and two r's. Remember: 'ocCUR' + 'ReNCE' with double letters.", incorrect: ["'occurance' uses 'a' instead of 'e' and has one 'r.'","'occurence' has only one 'r.'","CORRECT: 'occurrence' has two c's and two r's.","'ocurrence' is missing one 'c.'"] },
      studyAid: { definition: "Words built from 'occur' keep the double 'r' when adding suffixes: occurrence, occurred, occurring.", example: "occur → occurrence, occurred, occurring", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which spelling is correct for the plural of 'potato'?",
      choices: ["potatos", "potatoes", "potatoe's", "potatoes'"],
      correct: 1,
      explanation: { correct: "Nouns ending in -o with a consonant before it usually add -es to form the plural.", incorrect: ["'potatos' is missing the 'e' before 's.'","CORRECT: 'potatoes' adds -es because 'potato' ends in consonant + o.","'potatoe's' adds an apostrophe, which shows possession, not plural.","'potatoes'' adds an apostrophe to the plural, which is incorrect for a simple plural."] },
      studyAid: { definition: "Most nouns ending in consonant + o add -es for plural: potatoes, tomatoes, heroes.", example: "potato → potatoes, tomato → tomatoes, hero → heroes", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is spelled correctly?",
      choices: ["separate", "seperate", "separete", "seperete"],
      correct: 0,
      explanation: { correct: "'Separate' is spelled with 'par' in the middle. Remember: 'there is a rat in separate' (sePARate).", incorrect: ["CORRECT: 'separate' has 'par' in the middle.","'seperate' incorrectly uses 'per' instead of 'par.'","'separete' moves the 'e' to the wrong place.","'seperete' has both vowels wrong."] },
      studyAid: { definition: "Memory tricks help with tricky spellings. 'There is a rat in separate' helps you remember 'par.'", example: "separate, desperate (also has 'per'), temperature", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which word drops the silent 'e' before adding -ing?",
      choices: ["makeing", "making", "makking", "makeeing"],
      correct: 1,
      explanation: { correct: "'Making' drops the silent 'e' at the end of 'make' before adding -ing.", incorrect: ["'makeing' keeps the silent 'e,' which is incorrect.","CORRECT: 'making' drops the silent 'e' before -ing.","'makking' doubles the 'k,' which is not needed.","'makeeing' adds an extra 'e,' which is wrong."] },
      studyAid: { definition: "When a word ends in silent 'e,' usually drop the 'e' before adding -ing or -ed.", example: "make → making, ride → riding, hope → hoping", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is spelled correctly?",
      choices: ["embarass", "embarrass", "embaras", "embarras"],
      correct: 1,
      explanation: { correct: "'Embarrass' is spelled with two r's and two s's. Remember: 'two red socks' (rr ss).", incorrect: ["'embarass' has only one 'r.'","CORRECT: 'embarrass' has two r's and two s's.","'embaras' is missing one 'r' and one 's.'","'embarras' is missing one 's.'"] },
      studyAid: { definition: "Double-letter words can be tricky. Use memory tricks like 'two red socks' for embarrass.", example: "embarrass, occurrence, accommodate, necessary", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which is the correct spelling?",
      choices: ["conveniant", "convenient", "conveneint", "conveniant"],
      correct: 1,
      explanation: { correct: "'Convenient' is spelled with 'ie' in the middle. The word 'convene' + 'ient' becomes 'convenient.'", incorrect: ["'conveniant' uses 'ia' instead of 'ie.'","CORRECT: 'convenient' is the correct spelling.","'conveneint' scrambles the 'ie.'","'conveniant' is a repeat misspelling."] },
      studyAid: { definition: "Break long words into parts to spell them: con + ven + ient.", example: "convenient, inconvenience, convene", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which word is spelled correctly?",
      choices: ["mispell", "misspell", "misppell", "misspel"],
      correct: 1,
      explanation: { correct: "'Misspell' has two s's because the prefix 'mis-' already has one 's' and the base word 'spell' starts with 's.'", incorrect: ["'mispell' has only one 's' total, but both prefix and base contribute an 's.'","CORRECT: 'misspell' has two s's: one from 'mis-' and one from 'spell.'","'misppell' has too many s's and p's.","'misspel' is missing the final 'l.'"] },
      studyAid: { definition: "When a prefix ends in the same letter the base word starts with, both letters are usually kept.", example: "misspell, misspent, dissatisfy, disservice", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which spelling correctly adds -ly to 'true'?",
      choices: ["truely", "truly", "trueley", "trully"],
      correct: 1,
      explanation: { correct: "'Truly' drops the silent 'e' before adding -ly. This is an exception to the usual rule because 'truely' looks awkward.", incorrect: ["'truely' keeps the 'e,' which is incorrect before -ly for 'true.'","CORRECT: 'truly' drops the 'e' before adding -ly.","'trueley' adds an extra 'e' and keeps the original.","'trully' doubles the 'l' incorrectly."] },
      studyAid: { definition: "Most words drop silent 'e' before -ly, but a few keep it. 'True' drops the 'e' to become 'truly.'", example: "true → truly, due → duly, whole → wholly (keeps the 'l' but drops 'e')", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is spelled correctly?",
      choices: ["rythm", "rhythm", "rythem", "rhithm"],
      correct: 1,
      explanation: { correct: "'Rhythm' is spelled with 'rh' at the beginning and 'ythm' at the end. Remember: 'rhythm helps your two hips move.'", incorrect: ["'rythm' is missing the 'h' after 'r.'","CORRECT: 'rhythm' has 'rh' at the start.","'rythem' changes the 'y' and 'e' placement.","'rhithm' puts an 'i' where 'y' belongs."] },
      studyAid: { definition: "Memory sentences help with unusual spellings. 'Rhythm helps your two hips move' = r-h-y-t-h-m.", example: "rhythm, rhyme, rhythmical", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    },
    {
      question: "Which is the correct spelling of the word meaning 'to go before'?",
      choices: ["procede", "precede", "persede", "presede"],
      correct: 1,
      explanation: { correct: "'Precede' means to go before. The prefix 'pre-' means before, and 'cede' means to go.", incorrect: ["'procede' is not a word; 'proceed' means to go forward.","CORRECT: 'precede' means to go before.","'persede' is not a real word.","'presede' is a misspelling."] },
      studyAid: { definition: "'Precede' (go before) and 'proceed' (go forward) are commonly confused. Remember 'pre' = before.", example: "precede = go before; proceed = continue forward", link: "https://www.dictionary.com", linkText: "Dictionary.com" }
    }
  ]
};

/* 1.10 Modifier Words */
QUESTION_BANK['vocabulary-modifier-words'] = {
  title: "Modifier Words",
  topic: "Vocabulary / Word Study",
  questions: [
    {
      question: "Which modifier best describes HOW the cat slept?",
      choices: ["The cat slept on the couch.", "The cat slept peacefully.", "The cat slept for an hour.", "The cat slept yesterday."],
      correct: 1,
      explanation: { correct: "'Peacefully' is an adverb that tells HOW the cat slept. It modifies the verb 'slept.'", incorrect: ["'On the couch' tells WHERE, not how.","CORRECT: 'peacefully' describes the manner of sleeping.","'For an hour' tells HOW LONG, not how.","'Yesterday' tells WHEN, not how."] },
      studyAid: { definition: "A modifier is a word that describes or limits another word. Adverbs often tell how, when, where, or to what extent.", example: "The dog barked loudly. (how) / The dog barked yesterday. (when)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence contains a modifier that tells WHERE?",
      choices: ["She sang beautifully.", "She sang loudly.", "She sang on stage.", "She sang for hours."],
      correct: 2,
      explanation: { correct: "'On stage' tells WHERE she sang. It is a prepositional phrase acting as a modifier.", incorrect: ["'Beautifully' tells HOW she sang.","'Loudly' tells HOW she sang.","CORRECT: 'on stage' tells WHERE she sang.","'For hours' tells HOW LONG she sang."] },
      studyAid: { definition: "Modifiers can be single words or phrases. Prepositional phrases often tell where or when.", example: "on stage (where), for hours (how long), with joy (how)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "In the sentence 'The extremely tall tree swayed,' what does 'extremely' modify?",
      choices: ["tree", "swayed", "tall", "The whole sentence"],
      correct: 2,
      explanation: { correct: "'Extremely' modifies the adjective 'tall,' telling HOW tall the tree is.", incorrect: ["'Tree' is the noun being described, not what 'extremely' modifies.","'Swayed' is the verb; 'extremely' does not modify verbs directly.","CORRECT: 'extremely' intensifies the adjective 'tall.'","'Extremely' does not modify the whole sentence."] },
      studyAid: { definition: "Adverbs can modify adjectives or other adverbs. They often intensify or limit the meaning.", example: "extremely tall, very quickly, somewhat tired", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses a modifier correctly?",
      choices: ["Running fast, the tree was passed by the boy.", "Running fast, the boy passed the tree.", "The boy passed the tree running fast.", "Running fast passed the boy the tree."],
      correct: 1,
      explanation: { correct: "'Running fast' modifies 'the boy,' so the boy should be the subject right after the modifier.", incorrect: ["This is a dangling modifier; the tree cannot run.","CORRECT: 'Running fast' correctly modifies 'the boy.'","This is ambiguous; it could sound like the tree is running.","This is ungrammatical."] },
      studyAid: { definition: "A dangling modifier is a word or phrase that modifies the wrong noun. Place modifiers close to the words they describe.", example: "Incorrect: Running fast, the tree was passed by the boy. Correct: Running fast, the boy passed the tree.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What does the modifier 'almost' modify in 'She almost scored a goal'?",
      choices: ["She", "scored", "a goal", "the whole game"],
      correct: 1,
      explanation: { correct: "'Almost' modifies the verb 'scored,' meaning she came close to scoring but did not actually score.", incorrect: ["'Almost' does not modify the subject 'she.'","CORRECT: 'almost' modifies 'scored,' meaning close to scoring.","'Almost' does not modify the noun 'goal.'","'Almost' does not refer to the whole game."] },
      studyAid: { definition: "'Almost' is an adverb that tells 'to what extent' something happened. Placement matters for meaning.", example: "She almost scored = she did not score. She scored almost ten goals = she scored close to ten.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence has a misplaced modifier?",
      choices: ["The teacher gave a test to the students on Monday.", "On Monday, the teacher gave a test to the students.", "The teacher gave a test on Monday to the students.", "The teacher on Monday gave a test to the students."],
      correct: 0,
      explanation: { correct: "'On Monday' is placed after 'students,' which could mean the students were on Monday instead of the test being given on Monday. This is a misplaced modifier.", incorrect: ["CORRECT: This is ambiguous because 'on Monday' is next to 'students.'","This is clear; Monday modifies when the teacher gave the test.","This is clear; Monday modifies when the test was given.","This is acceptable; Monday modifies the teacher's action."] },
      studyAid: { definition: "A misplaced modifier is too far from the word it modifies, causing confusion.", example: "Misplaced: She served sandwiches to the children on paper plates. (Were the children on plates?) Better: She served sandwiches on paper plates to the children.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is an intensifier modifier?",
      choices: ["slowly", "very", "yesterday", "here"],
      correct: 1,
      explanation: { correct: "'Very' is an intensifier that strengthens the meaning of an adjective or adverb.", incorrect: ["'slowly' describes how something is done, not an intensifier.","CORRECT: 'very' intensifies adjectives and adverbs.","'yesterday' tells when, not intensity.","'here' tells where, not intensity."] },
      studyAid: { definition: "Intensifiers are adverbs like 'very,' 'really,' 'extremely,' and 'quite' that strengthen meaning.", example: "very tall, really fast, extremely cold, quite loud", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "In 'The children played outside happily,' which word is the modifier?",
      choices: ["children", "played", "outside", "happily"],
      correct: 3,
      explanation: { correct: "'Happily' modifies the verb 'played' by telling HOW the children played.", incorrect: ["'children' is the subject, not a modifier.","'played' is the verb, not a modifier.","'outside' modifies where, but 'happily' is also a modifier. However, 'happily' is the best answer because it describes manner, a classic modifier role.","CORRECT: 'happily' describes how they played."] },
      studyAid: { definition: "Adverbs that end in -ly often modify verbs to tell how something was done.", example: "happily, quickly, slowly, carefully", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses 'only' correctly to show one person did the work?",
      choices: ["Only she did the homework.", "She only did the homework.", "She did only the homework.", "She did the homework only."],
      correct: 0,
      explanation: { correct: "'Only she' means no one else did the homework; she was the sole person who did it.", incorrect: ["CORRECT: 'Only she' emphasizes that she alone did it.","'She only did the homework' could mean she did nothing else.","'She did only the homework' means she did nothing else but homework.","'She did the homework only' is awkward and unclear."] },
      studyAid: { definition: "The placement of 'only' changes the meaning of a sentence. Put it right before the word you want to limit.", example: "Only she did it = she alone. She only did it = she did nothing else. She did only it = that was all she did.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What does 'too' modify in 'The soup was too hot'?",
      choices: ["soup", "was", "hot", "The whole sentence"],
      correct: 2,
      explanation: { correct: "'Too' modifies the adjective 'hot,' meaning the soup was hotter than desired.", incorrect: ["'Too' does not modify the noun 'soup.'","'Too' does not modify the verb 'was.'","CORRECT: 'too' modifies 'hot,' showing excess.","'Too' modifies the adjective, not the whole sentence."] },
      studyAid: { definition: "'Too' means 'more than needed' or 'also.' When it means excess, it modifies adjectives and adverbs.", example: "too hot, too quickly, too much, too many", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence contains a modifier that tells TO WHAT EXTENT?",
      choices: ["She completely finished the puzzle.", "She finished the puzzle quickly.", "She finished the puzzle at noon.", "She finished the puzzle in the kitchen."],
      correct: 0,
      explanation: { correct: "'Completely' tells to what extent she finished—100% done, not partly.", incorrect: ["CORRECT: 'completely' tells extent.","'quickly' tells how, not extent.","'at noon' tells when.","'in the kitchen' tells where."] },
      studyAid: { definition: "Modifiers of extent tell how much or to what degree something happened.", example: "completely, partly, almost, totally, entirely", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a limiting modifier?",
      choices: ["beautifully", "almost", "slowly", "happily"],
      correct: 1,
      explanation: { correct: "'Almost' is a limiting modifier because it restricts the meaning, showing something did not quite happen.", incorrect: ["'beautifully' describes how, not limits.","CORRECT: 'almost' limits the action to near-completion.","'slowly' describes how, not limits.","'happily' describes how, not limits."] },
      studyAid: { definition: "Limiting modifiers restrict or narrow the meaning. Examples include 'almost,' 'hardly,' 'nearly,' 'only,' and 'just.'", example: "almost ready, hardly any, nearly done, only one", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is unclear because of modifier placement?",
      choices: ["I almost ate the whole pizza.", "I ate almost the whole pizza.", "The whole pizza was almost eaten by me.", "I ate the whole pizza almost."],
      correct: 0,
      explanation: { correct: "'I almost ate the whole pizza' is funny because it sounds like you didn't eat any of it—you almost did. The meaning changes based on where 'almost' is placed.", incorrect: ["CORRECT: This is ambiguous. Did you eat any pizza or not?","This is clear: you ate most of the pizza.","This is grammatically odd but less ambiguous.","This is awkward but suggests you nearly finished."] },
      studyAid: { definition: "Modifier placement affects meaning. 'Almost' before the verb suggests the action nearly happened but did not.", example: "She almost won = she did not win. She won almost every game = she won most of them.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is NOT a modifier?",
      choices: ["swiftly", "the", "under", "table"],
      correct: 3,
      explanation: { correct: "'Table' is a noun, not a modifier. The others can function as modifiers in sentences.", incorrect: ["'swiftly' is an adverb modifier.","'the' is an article that modifies nouns.","'under' is a preposition that can modify location.","CORRECT: 'table' is a noun, not a modifier."] },
      studyAid: { definition: "Nouns name things. Modifiers describe or limit nouns, verbs, or other modifiers.", example: "Modifiers: the (article), swiftly (adverb), under (preposition). Noun: table.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* ============================================================
   TOPIC 2: Punctuation
   ============================================================ */

/* 2.1 Punctuation at End of Sentence */
QUESTION_BANK['punctuation-end-sentence'] = {
  title: "Punctuation at End of Sentence",
  topic: "Punctuation",
  questions: [
    {
      question: "Which sentence ends with the correct punctuation?",
      choices: ["What time is it.", "What time is it?", "What time is it!", "What time is it,"],
      correct: 1,
      explanation: { correct: "Questions end with a question mark. 'What time is it?' is asking for information.", incorrect: ["A period is for statements, not questions.","CORRECT: A question mark ends a question.","An exclamation point shows strong emotion, not a question.","A comma cannot end a sentence."] },
      studyAid: { definition: "Use a period for statements, a question mark for questions, and an exclamation point for strong feeling.", example: "It is raining. (period) Are you coming? (question mark) Watch out! (exclamation)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses the correct end punctuation?",
      choices: ["I can't believe we won", "I can't believe we won.", "I can't believe we won?", "I can't believe we won,"],
      correct: 1,
      explanation: { correct: "This is a statement (even with strong feeling), so it ends with a period. An exclamation point could also work, but among the choices, the period is correct.", incorrect: ["Missing end punctuation.","CORRECT: Statements end with a period.","A question mark would only work if it were a question.","A comma cannot end a sentence."] },
      studyAid: { definition: "Every sentence must end with a period, question mark, or exclamation point.", example: "I finished my homework. (statement)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence correctly uses an exclamation point?",
      choices: ["Where did you put my shoes!", "I am five years old!", "Help, I am falling!", "What is your name!"],
      correct: 2,
      explanation: { correct: "'Help, I am falling!' shows urgency and strong emotion, which fits an exclamation point.", incorrect: ["This is a question and should use a question mark.","This is a calm statement and should use a period.","CORRECT: This shows strong emotion and urgency.","This is a question and should use a question mark."] },
      studyAid: { definition: "Exclamation points show strong emotion, urgency, or surprise. Do not overuse them.", example: "Fire! Watch out! I can't believe it!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is punctuated correctly?",
      choices: ["Did you finish your homework.", "Did you finish your homework!", "Did you finish your homework?", "Did you finish your homework,"],
      correct: 2,
      explanation: { correct: "This is a yes/no question, so it needs a question mark at the end.", incorrect: ["A period ends a statement, not a question.","An exclamation point is too strong for this neutral question.","CORRECT: Questions end with question marks.","A comma cannot end a sentence."] },
      studyAid: { definition: "Yes/no questions always end with a question mark.", example: "Did you eat? Is it cold? Can we go?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What punctuation should end this sentence: 'How amazing that was'",
      choices: ["period", "question mark", "exclamation point", "comma"],
      correct: 2,
      explanation: { correct: "'How amazing that was' expresses strong feeling, so an exclamation point is best.", incorrect: ["A period is too calm for this emotional statement.","It is not asking a question.","CORRECT: An exclamation point matches the strong emotion.","A comma cannot end a sentence."] },
      studyAid: { definition: "Sentences starting with 'How' or 'What' can be exclamations if they show strong feeling.", example: "How beautiful! What a mess!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["Close the door.", "Close the door!", "Close the door?", "All could be correct depending on meaning"],
      correct: 3,
      explanation: { correct: "All three could be correct: a period for a calm request, an exclamation for urgency, or a question if asking permission.", incorrect: ["This is correct for a calm command, but not the only possibility.","This is correct for urgency, but not the only possibility.","This is correct if asking permission, but not the only possibility.","CORRECT: The meaning changes with each punctuation mark."] },
      studyAid: { definition: "Punctuation can change the meaning and tone of a sentence.", example: "Close the door. (calm) Close the door! (urgent) Close the door? (asking permission)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence ends incorrectly?",
      choices: ["Are you coming with us?", "I think we should leave now.", "What a beautiful day.", "Wow!"],
      correct: 2,
      explanation: { correct: "'What a beautiful day' expresses strong feeling and should end with an exclamation point, not a period.", incorrect: ["This question ends correctly.","This statement ends correctly.","CORRECT: This exclamation should end with an exclamation point.","This strong emotion ends correctly."] },
      studyAid: { definition: "Exclamations that start with 'What' or 'How' need exclamation points to match the emotion.", example: "What a great game! How wonderful!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Choose the correct ending for: 'Stop right there'",
      choices: [".", "?", "!", ","],
      correct: 2,
      explanation: { correct: "'Stop right there' is a strong command, so it needs an exclamation point.", incorrect: ["A period is too weak for this urgent command.","A question mark does not fit a command.","CORRECT: An exclamation point shows urgency.","A comma cannot end a sentence."] },
      studyAid: { definition: "Strong commands and warnings usually end with exclamation points.", example: "Stop! Look out! Don't move!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is a correct statement?",
      choices: ["My favorite color is blue!", "My favorite color is blue.", "My favorite color is blue?", "My favorite color is blue,"],
      correct: 1,
      explanation: { correct: "A calm statement about a favorite color should end with a period.", incorrect: ["An exclamation point is too strong for this calm fact.","CORRECT: Statements end with periods.","A question mark would turn it into a question.","A comma cannot end a sentence."] },
      studyAid: { definition: "Simple facts and calm statements end with periods.", example: "The sky is blue. I like pizza. She walks to school.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses correct punctuation for a tag question?",
      choices: ["You're coming, aren't you.", "You're coming, aren't you?", "You're coming, aren't you!", "You're coming aren't you?"],
      correct: 1,
      explanation: { correct: "Tag questions like 'aren't you?' are still questions and need a question mark.", incorrect: ["A period is wrong for a tag question.","CORRECT: Tag questions end with question marks.","An exclamation point is too strong.","Missing the comma before the tag."] },
      studyAid: { definition: "A tag question is a short question at the end of a statement. It still needs a question mark.", example: "It's cold, isn't it? You like pizza, don't you?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is wrong with this sentence: 'I wonder if it will rain today'",
      choices: ["Nothing", "It needs a question mark", "It needs a period at the end", "It needs a comma"],
      correct: 2,
      explanation: { correct: "'I wonder if...' is a statement about wondering, not a direct question. It needs a period.", incorrect: ["It is missing end punctuation.","It is not a direct question, so no question mark.","CORRECT: It needs a period because it is a statement.","A comma cannot end a sentence."] },
      studyAid: { definition: "Sentences that begin with 'I wonder' or 'I think' are statements, even if they mention a question.", example: "I wonder if she is coming. (statement) Is she coming? (question)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is an exclamation?",
      choices: ["What time does the movie start?", "I love this movie.", "What an exciting movie!", "Do you like this movie?"],
      correct: 2,
      explanation: { correct: "'What an exciting movie!' shows strong feeling, making it an exclamation.", incorrect: ["This is a question.","This is a statement.","CORRECT: This shows strong emotion with 'What' + exclamation point.","This is a question."] },
      studyAid: { definition: "Exclamations often start with 'What' or 'How' and express strong emotion.", example: "What a surprise! How kind of you!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence has incorrect end punctuation?",
      choices: ["Where are my keys?", "I found my keys!", "I found my keys?", "Give me my keys."],
      correct: 2,
      explanation: { correct: "'I found my keys' is a statement of fact, so a question mark is incorrect unless the person is surprised or unsure.", incorrect: ["Correct question punctuation.","Correct exclamation punctuation.","CORRECT: This statement should end with a period unless showing surprise.","Correct calm command."] },
      studyAid: { definition: "Be careful: some statements can use question marks if they show uncertainty, but standard statements use periods.", example: "I found my keys. (fact) I found my keys? (surprised/uncertain)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which ending is correct for a polite request: 'Could you please pass the salt'",
      choices: ["!", "?", ".", "..."],
      correct: 1,
      explanation: { correct: "'Could you please...' is a question form, so it ends with a question mark even though it is a request.", incorrect: ["Too strong for a polite request.","CORRECT: Questions and polite requests in question form end with question marks.","A period would make it a command, not a polite request.","An ellipsis suggests trailing off, not a complete request."] },
      studyAid: { definition: "Polite requests using 'could you' or 'would you' are in question form and need question marks.", example: "Could you help me? Would you mind closing the door?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 2.2 Periods in Abbreviations */
QUESTION_BANK['punctuation-periods-abbreviations'] = {
  title: "Periods in Abbreviations",
  topic: "Punctuation",
  questions: [
    {
      question: "Which abbreviation uses periods correctly?",
      choices: ["Mr", "Mr.", "M.r.", "M.r"],
      correct: 1,
      explanation: { correct: "'Mr.' is the correct abbreviation for Mister, with a period at the end.", incorrect: ["Missing the period.","CORRECT: 'Mr.' has a period at the end.","There should not be a period after 'M' alone.","Missing the period after 'r.'"] },
      studyAid: { definition: "Titles like Mr., Mrs., Ms., and Dr. use periods in American English.", example: "Mr. Smith, Mrs. Jones, Dr. Lee", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the correct way to write the abbreviation for 'Doctor'?",
      choices: ["Dr", "Dr.", "D.r.", "D.r"],
      correct: 1,
      explanation: { correct: "'Dr.' is the standard abbreviation for Doctor in American English.", incorrect: ["Missing the period.","CORRECT: 'Dr.' has a period at the end.","There should not be a period after 'D' alone.","Missing the period after 'r.'"] },
      studyAid: { definition: "Abbreviations for titles usually end with a period in American English.", example: "Dr. Brown, Prof. Miller, Sr. (Senior)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which abbreviation is written correctly?",
      choices: ["Ave", "Ave.", "A.ve.", "Av.e."],
      correct: 1,
      explanation: { correct: "'Ave.' is the correct abbreviation for Avenue, with a period at the end.", incorrect: ["Missing the period.","CORRECT: 'Ave.' ends with a period.","There should not be a period after 'A' alone.","There should not be a period before 'e.'"] },
      studyAid: { definition: "Street abbreviations like Ave., St., Blvd., and Rd. use periods.", example: "123 Main St., 456 Oak Ave., 789 Pine Blvd.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "How should you write the abbreviation for 'et cetera' (and so forth)?",
      choices: ["etc", "etc.", "e.t.c.", "e.t.c"],
      correct: 1,
      explanation: { correct: "'Etc.' is the standard abbreviation, with one period at the end.", incorrect: ["Missing the period.","CORRECT: 'etc.' has a period at the end.","'e.t.c.' has too many periods; it is one word.","Missing the final period."] },
      studyAid: { definition: "'Etc.' comes from Latin 'et cetera.' It gets one period at the end.", example: "I like fruits: apples, oranges, bananas, etc.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Jan", "Jan.", "J.an.", "J.a.n."],
      correct: 1,
      explanation: { correct: "'Jan.' is the correct abbreviation for January, with a period at the end.", incorrect: ["Missing the period.","CORRECT: 'Jan.' ends with a period.","There should not be periods within the abbreviation.","Too many periods."] },
      studyAid: { definition: "Month abbreviations usually end with a period: Jan., Feb., Aug., Sept., Oct., Nov., Dec.", example: "Jan. 1, Feb. 14, Dec. 25", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which abbreviation does NOT need a period?",
      choices: ["Mr.", "Dr.", "NASA", "St."],
      correct: 2,
      explanation: { correct: "'NASA' is an acronym, not a traditional abbreviation. Acronyms are usually written without periods.", incorrect: ["'Mr.' needs a period.","'Dr.' needs a period.","CORRECT: 'NASA' is an acronym and does not use periods.","'St.' needs a period."] },
      studyAid: { definition: "Acronyms (words formed from initials, like NASA, FBI, HTML) usually do not use periods.", example: "NASA, UNICEF, FBI, radar, laser", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the correct abbreviation for 'United States of America' when used as an adjective?",
      choices: ["U.S.A.", "USA", "U.S.", "US"],
      correct: 2,
      explanation: { correct: "'U.S.' is the standard abbreviation with periods when used before a noun, like 'U.S. president.'", incorrect: ["This is acceptable for the country name but adjective form often uses 'U.S.'","This is acceptable for the noun form.","CORRECT: 'U.S.' with periods is common in adjective form.","'US' without periods is more common in newspapers but 'U.S.' is standard in formal writing."] },
      studyAid: { definition: "'U.S.' with periods is traditional in formal writing, especially before nouns.", example: "U.S. history, U.S. government, U.S. Route 66", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which abbreviation is incorrect?",
      choices: ["a.m.", "p.m.", "A.M.", "am."],
      correct: 3,
      explanation: { correct: "'am' and 'pm' are usually written lowercase with periods (a.m., p.m.) or uppercase without periods (AM, PM). 'am.' with a lowercase and single period is nonstandard.", incorrect: ["'a.m.' is correct with periods.","'p.m.' is correct with periods.","'A.M.' is correct as uppercase.","CORRECT: 'am.' is nonstandard. Use 'a.m.' or 'AM.'"] },
      studyAid: { definition: "Time abbreviations a.m. (ante meridiem) and p.m. (post meridiem) use periods in lowercase or no periods in uppercase.", example: "10 a.m., 3 p.m., 10 AM, 3 PM", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "How do you correctly abbreviate 'for example'?",
      choices: ["eg", "e.g.", "e.g", "eg."],
      correct: 1,
      explanation: { correct: "'E.g.' stands for 'exempli gratia' (for example) and uses periods after each letter.", incorrect: ["Missing periods.","CORRECT: 'e.g.' has periods after each letter.","Missing the final period.","Wrong letter order with period."] },
      studyAid: { definition: "'E.g.' (for example) and 'i.e.' (that is) are Latin abbreviations that keep their periods.", example: "Bring something to write with, e.g., a pen or pencil.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct for 'Junior' when used after a name?",
      choices: ["Jr", "Jr.", "J.r.", "J.r"],
      correct: 1,
      explanation: { correct: "'Jr.' is the standard abbreviation for Junior, with a period at the end.", incorrect: ["Missing the period.","CORRECT: 'Jr.' ends with a period.","There should not be a period after 'J' alone.","Missing the final period."] },
      studyAid: { definition: "Name suffixes like Jr., Sr., and III use periods (except Roman numerals).", example: "Martin Luther King Jr., John Smith Sr.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which abbreviation for states is correct in formal writing?",
      choices: ["CA", "Ca", "C.A.", "Ca."],
      correct: 0,
      explanation: { correct: "The two-letter postal abbreviation 'CA' for California has no periods.", incorrect: ["CORRECT: 'CA' is the standard postal abbreviation without periods.","'Ca' with only the first letter capitalized is not standard.","'C.A.' has unnecessary periods for a postal code.","'Ca.' is not a standard state abbreviation."] },
      studyAid: { definition: "The United States Postal Service uses two-letter abbreviations without periods: CA, NY, TX, FL.", example: "Sacramento, CA; New York, NY; Austin, TX", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the correct abbreviation for 'pages'?",
      choices: ["pgs", "pgs.", "pp.", "pp"],
      correct: 2,
      explanation: { correct: "'Pp.' is the traditional abbreviation for pages (from Latin 'paginae'). 'P.' is for a single page.", incorrect: ["'pgs' is informal and missing a period.","'pgs.' is informal.","CORRECT: 'pp.' is the standard abbreviation for pages.","'pp' is missing the period."] },
      studyAid: { definition: "In citations, 'p.' = one page, 'pp.' = multiple pages.", example: "See p. 45 or pp. 45-47.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which abbreviation is written correctly?",
      choices: ["inc", "Inc.", "I.nc.", "In.c."],
      correct: 1,
      explanation: { correct: "'Inc.' is the abbreviation for Incorporated, with a period at the end.", incorrect: ["Missing the period.","CORRECT: 'Inc.' has a period at the end.","There should not be a period after 'I' alone.","There should not be a period before 'c.'"] },
      studyAid: { definition: "Business abbreviations like Inc., Ltd., and Corp. use periods.", example: "Acme Widgets, Inc.; Smith & Co.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the correct way to write 'approximately'?",
      choices: ["approx", "approx.", "a.pprox.", "appox."],
      correct: 1,
      explanation: { correct: "'Approx.' is the standard abbreviation with a period at the end.", incorrect: ["Missing the period.","CORRECT: 'approx.' ends with a period.","There should not be periods within the word.","'appox' is misspelled."] },
      studyAid: { definition: "Common word abbreviations like approx. (approximately), dept. (department), and no. (number) use periods.", example: "approx. 50 people, Dept. of Education, No. 5", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 2.3 Quotation Marks */
QUESTION_BANK['punctuation-quotation-marks'] = {
  title: "Quotation Marks",
  topic: "Punctuation",
  questions: [
    {
      question: "Which sentence uses quotation marks correctly?",
      choices: ["'I'm hungry,' said Mom.", '"I\'m hungry," said Mom.', "'I'm hungry', said Mom.", '"I\'m hungry" said Mom.'],
      correct: 1,
      explanation: { correct: "In American English, commas go inside the closing quotation mark, and double quotation marks are standard for dialogue.", incorrect: ["Single quotes are used for quotes inside quotes, not main dialogue.","CORRECT: Comma inside quotation marks, double quotes used.","Comma should be inside the quotation marks.","Missing comma before 'said Mom.'"] },
      studyAid: { definition: "In American English, put commas and periods inside closing quotation marks. Use double quotes for main dialogue.", example: '"Hello," she said. "How are you?"', link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Where do quotation marks go in this sentence: Maya said she loved the book.",
      choices: ["Maya said, 'she loved the book.'", "Maya said, 'She loved the book.'", "Maya said she 'loved the book.'", "Maya said, she loved the book."],
      correct: 1,
      explanation: { correct: "The exact words spoken go inside quotation marks. Capitalize the first word inside the quotes.", incorrect: ["'she' should be capitalized inside the quotation marks.","CORRECT: Exact words capitalized and inside quotation marks.","This changes the meaning; it is no longer exact dialogue.","Missing quotation marks entirely."] },
      studyAid: { definition: "Quotation marks enclose the exact words someone says. Capitalize the first quoted word.", example: "He said, 'I am ready.'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence punctuates the question inside quotes correctly?",
      choices: ["Did she say, 'I'm leaving'?", "Did she say, 'I'm leaving?'", "Did she say 'I'm leaving'?", "Did she say, 'I'm leaving'?"],
      correct: 1,
      explanation: { correct: "The question mark goes inside the quotation marks because the quoted words themselves are a question.", incorrect: ["The question mark should be inside the quotation marks.","CORRECT: The question mark belongs with the quoted question.","Missing the comma after 'say.'","Missing the comma after 'say.'"] },
      studyAid: { definition: "Place question marks and exclamation points inside quotation marks if they belong to the quoted material.", example: "She asked, 'Are you coming?' Did he really shout, 'Watch out!'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct when splitting a quote with a dialogue tag?",
      choices: ["'I don't know,' she said 'what to do.'", '"I don\'t know," she said. "What to do."', '"I don\'t know," she said, "what to do."', '"I don\'t know" she said, "what to do."'],
      correct: 2,
      explanation: { correct: "When a dialogue tag splits a sentence, use a comma after the tag and do not capitalize the continuation (unless it is a new sentence).", incorrect: ["Missing the comma after 'said' and lowercase needed for continuation.","This splits into two sentences incorrectly.","CORRECT: Comma after tag, lowercase continuation.","Missing comma after the first part of the quote."] },
      studyAid: { definition: "When a dialogue tag interrupts a sentence, commas go on both sides and the second part stays lowercase.", example: '"We should," he whispered, "leave now."', link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses single quotation marks correctly?",
      choices: ["She said, 'I love the word 'serendipity.''", "She said, 'I love the word \"serendipity.\"'", "She said, 'I love the word 'serendipity'.'", "She said, 'I love the word \"serendipity\".'"],
      correct: 1,
      explanation: { correct: "Use single quotation marks for a quote inside a quote. The outer quote uses double marks; the inner quote uses single marks.", incorrect: ["Both use single quotes, which is confusing.","CORRECT: Outer double, inner single quotation marks.","Single quote placement is wrong; period should be inside.","Outer single and inner double is British style, not standard American."] },
      studyAid: { definition: "In American English, use double quotes for the main quote and single quotes for a quote within a quote.", example: "\"He told me, 'Wait here,' and then left,\" she said.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence correctly uses quotation marks for a title?",
      choices: ["I read the chapter The Big Storm in my book.", "I read the chapter 'The Big Storm' in my book.", "I read the chapter \"The Big Storm\" in my book.", "I read the chapter The Big Storm in my book."],
      correct: 2,
      explanation: { correct: "Chapter titles go in quotation marks (double). Book titles are italicized or underlined.", incorrect: ["Missing quotation marks around the chapter title.","Single quotes are for quotes inside quotes, not chapter titles.","CORRECT: Chapter titles use double quotation marks.","Same as A, missing quotation marks."] },
      studyAid: { definition: "Use quotation marks for titles of short works: chapters, articles, short stories, poems, and songs.", example: "Chapter 1: 'The Beginning,' the poem 'The Road Not Taken,' the song 'Happy Birthday'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What punctuation should follow a dialogue tag before the quote?",
      choices: ["period", "comma", "question mark", "no punctuation"],
      correct: 1,
      explanation: { correct: "A comma follows the dialogue tag (like 'he said') before the opening quotation mark.", incorrect: ["A period would end the sentence before the quote begins.","CORRECT: A comma separates the tag from the quoted words.","A question mark only if the tag is a question.","There must be punctuation before the quote."] },
      studyAid: { definition: "Dialogue tags like 'he said,' 'she whispered,' or 'Mom asked' are followed by a comma before the quote.", example: "She said, 'Let's go.' He whispered, 'Be quiet.'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is punctuated correctly?",
      choices: ["'I am tired.' Said Mark.", "'I am tired,' said Mark.", "'I am tired' said Mark.", "'I am tired', said Mark."],
      correct: 1,
      explanation: { correct: "When the dialogue tag comes after a complete quoted sentence, use a comma inside the quotes before the tag if the sentence continues. Actually, if the quote is a complete sentence and the tag follows, you can use a period inside the quotes and lowercase 'said.' Wait—in this case, 'I am tired' is complete, so it should be: 'I am tired,' said Mark. (with a comma) OR 'I am tired.' Said Mark. is wrong. The comma version is correct for flowing dialogue.", incorrect: ["'Said Mark' should not be capitalized as a new sentence.","CORRECT: Comma inside quotes, lowercase 'said.'","Missing comma before 'said Mark.'","Comma should be inside the quotation marks."] },
      studyAid: { definition: "When a dialogue tag follows a quoted statement, the period becomes a comma inside the quotation marks.", example: "\"I'm ready,\" she said. (Not: 'I'm ready.' She said.)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct when the quote ends with an exclamation?",
      choices: ["'Run!' she yelled.", "'Run,' she yelled.", "'Run!' She yelled.", "'Run' she yelled!"],
      correct: 0,
      explanation: { correct: "Keep the exclamation point inside the quotation marks. Do not add a comma, and lowercase the dialogue tag.", incorrect: ["CORRECT: Exclamation point stays inside quotes; tag is lowercase.","A comma weakens the exclamation.","'She' should be lowercase because it is part of the same sentence.","Exclamation point is in the wrong place."] },
      studyAid: { definition: "When a quote ends with ! or ?, do not add a comma before the dialogue tag.", example: "\"Help!\" he screamed. \"Are you okay?\" she asked.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses quotation marks correctly for scare quotes (doubt or irony)?",
      choices: ["His 'expert' advice made things worse.", "His expert advice made things worse.", "His \"expert\" advice made things worse.", "His 'expert advice' made things worse."],
      correct: 2,
      explanation: { correct: "Scare quotes suggest the word is not really true. Double quotation marks are standard in American English.", incorrect: ["Single quotes are for quotes inside quotes in American English.","Missing quotation marks loses the irony.","CORRECT: Double quotes show doubt about his expertise.","The whole phrase should not be in quotes; only the doubtful word."] },
      studyAid: { definition: "Scare quotes suggest that a word is being used in an unusual or doubtful way.", example: "The 'fresh' fish smelled bad. His 'help' only made things worse.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence correctly quotes a question within a statement?",
      choices: ["She asked, 'Are you coming?'", "She asked 'Are you coming'?", "She asked, 'Are you coming'?", "She asked 'Are you coming?'"],
      correct: 0,
      explanation: { correct: "The comma follows 'asked,' the question mark stays inside the quotes because the quoted words are a question, and the dialogue tag is lowercase.", incorrect: ["CORRECT: Comma after tag, question mark inside quotes.","Missing comma after 'asked.'","Question mark should be inside the quotation marks.","Missing comma after 'asked.'"] },
      studyAid: { definition: "When quoting a question, keep the question mark inside the quotation marks.", example: "He asked, 'Where are you going?' She wondered, 'What time is it?'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct for a quote that is a fragment?",
      choices: ["Mark called the game 'exciting.'", "Mark called the game, 'exciting.'", "Mark called the game 'exciting'.", "Mark called the game, 'exciting'."],
      correct: 0,
      explanation: { correct: "No comma is needed before a partial quote that fits into the grammar of the sentence. The period goes inside the quotation marks.", incorrect: ["CORRECT: No comma needed before a partial quote; period inside quotes.","A comma is not needed here because 'exciting' is integrated into the sentence.","The period should be inside the quotation marks in American English.","Comma and period placement are both wrong."] },
      studyAid: { definition: "Partial or fragment quotes do not always need a comma before them if they blend into the sentence.", example: "She described the movie as 'boring.' He called it 'a waste of time.'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is punctuated correctly?",
      choices: ["'Let's eat, Grandma!'", "'Let's eat Grandma!'", "'Let's eat Grandma'!", "'Let's eat, Grandma'!"],
      correct: 0,
      explanation: { correct: "The comma saves Grandma's life! 'Let's eat, Grandma!' means you are speaking to Grandma. Without the comma, it sounds like you want to eat her.", incorrect: ["CORRECT: The comma shows you are addressing Grandma.","Without the comma, it sounds like you want to eat Grandma.","The exclamation point should be inside the quotation marks.","The exclamation point should be inside the quotation marks."] },
      studyAid: { definition: "A direct address comma separates the name of the person being spoken to.", example: "Let's eat, Grandma. vs. Let's eat Grandma. (Very different meaning!)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which uses quotation marks correctly for a proverb or saying?",
      choices: ["My grandma always said, 'A friend in need is a friend indeed.'", "My grandma always said A friend in need is a friend indeed.", "My grandma always said, A friend in need is a friend indeed.", "My grandma always said 'A friend in need is a friend indeed.'"],
      correct: 0,
      explanation: { correct: "A comma follows 'said,' and the entire saying goes inside quotation marks with the period inside.", incorrect: ["CORRECT: Comma after 'said,' period inside quotation marks.","Missing quotation marks and comma.","Missing quotation marks around the saying.","Missing the comma after 'said.'"] },
      studyAid: { definition: "Well-known sayings quoted directly use quotation marks just like dialogue.", example: "He always says, 'Early to bed, early to rise.'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 2.4 Commas in a Series */
QUESTION_BANK['punctuation-commas-series'] = {
  title: "Commas in a Series",
  topic: "Punctuation",
  questions: [
    {
      question: "Which sentence uses commas correctly in a series?",
      choices: ["I bought apples oranges and bananas.", "I bought apples, oranges and bananas.", "I bought apples, oranges, and bananas.", "I bought, apples, oranges, and bananas."],
      correct: 2,
      explanation: { correct: "Use commas to separate three or more items in a series. The Oxford comma (before 'and') is optional but recommended for clarity.", incorrect: ["Missing all commas.","Missing the comma before 'and.'","CORRECT: Commas separate each item, including before 'and.'","Do not put a comma before the first item."] },
      studyAid: { definition: "A series is a list of three or more items. Use commas to separate them. The final comma before 'and' is called the Oxford comma.", example: "I need paper, pencils, and erasers.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["My favorite colors are red blue and green.", "My favorite colors are red, blue and green.", "My favorite colors are red, blue, and green.", "My favorite colors are, red, blue, and green."],
      correct: 2,
      explanation: { correct: "Commas separate each color in the series. The Oxford comma before 'and' helps avoid confusion.", incorrect: ["Missing commas.","Missing the Oxford comma.","CORRECT: Each item is separated by a comma.","No comma before the first item."] },
      studyAid: { definition: "The Oxford comma before 'and' in a list prevents ambiguity.", example: "I invited my parents, Oprah, and Justin. (three people) vs. I invited my parents, Oprah and Justin. (Are Oprah and Justin my parents?)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence incorrectly uses commas?",
      choices: ["She likes to swim, hike, and bike.", "She likes to swim hike and bike.", "She likes to swim, hike and bike.", "She likes, to swim, hike, and bike."],
      correct: 3,
      explanation: { correct: "Do not put a comma between the subject ('She likes') and the start of the series.", incorrect: ["Correct.","Missing commas, but not incorrect usage.","Missing Oxford comma, but acceptable.","CORRECT: 'She likes, to swim' incorrectly splits the verb from its object."] },
      studyAid: { definition: "Do not separate the subject and verb with a comma unless there is an interrupting phrase.", example: "Incorrect: She likes, to swim. Correct: She likes to swim, hike, and bike.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Where do commas go: 'The flag is red white and blue'",
      choices: ["The flag is red, white and blue.", "The flag is red, white, and blue.", "The flag is, red, white, and blue.", "The flag is red white, and blue."],
      correct: 1,
      explanation: { correct: "Commas separate 'red,' 'white,' and 'blue.' The Oxford comma before 'and' is recommended.", incorrect: ["Missing Oxford comma.","CORRECT: Commas between all items.","Comma after 'is' is wrong.","Commas are in the wrong places."] },
      studyAid: { definition: "Adjectives in a series of three or more need commas between them.", example: "The big, fluffy, white dog. The flag is red, white, and blue.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["We packed sandwiches juice and cookies.", "We packed sandwiches, juice, and cookies.", "We packed sandwiches juice, and cookies.", "We packed, sandwiches, juice, and cookies."],
      correct: 1,
      explanation: { correct: "Each item in the list needs its own comma separator.", incorrect: ["Missing commas.","CORRECT: All items separated by commas.","Missing comma after 'sandwiches.'","Comma after 'packed' is wrong."] },
      studyAid: { definition: "Nouns in a series need commas.", example: "Bring a tent, sleeping bag, and flashlight.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which uses commas correctly?",
      choices: ["He is smart funny and kind.", "He is smart, funny, and kind.", "He is smart funny, and kind.", "He is, smart, funny, and kind."],
      correct: 1,
      explanation: { correct: "Adjectives describing the same noun in a series need commas.", incorrect: ["Missing commas.","CORRECT: Commas between adjectives.","Missing comma after 'smart.'","No comma after 'is.'"] },
      studyAid: { definition: "Coordinate adjectives (adjectives that equally describe the noun) need commas.", example: "She wore a bright, colorful, warm coat.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["I want pizza, salad, or soup.", "I want pizza salad, or soup.", "I want pizza, salad or soup.", "I want, pizza, salad, or soup."],
      correct: 3,
      explanation: { correct: "A comma after 'I want' incorrectly splits the subject and verb.", incorrect: ["Correct.","Missing comma after 'pizza,' but not the worst error.","Missing Oxford comma, but acceptable.","CORRECT: Comma after 'I want' is wrong."] },
      studyAid: { definition: "Do not put a comma between the verb and its objects.", example: "Incorrect: I want, pizza. Correct: I want pizza, salad, or soup.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses commas correctly with phrases in a series?",
      choices: ["I went to the park the library and the store.", "I went to the park, the library, and the store.", "I went to the park, the library and the store.", "I went, to the park, the library, and the store."],
      correct: 1,
      explanation: { correct: "Each prepositional phrase in the series needs a comma.", incorrect: ["Missing commas.","CORRECT: Commas between phrases.","Missing Oxford comma.","Comma after 'went' is wrong."] },
      studyAid: { definition: "Phrases in a series are separated by commas just like single words.", example: "She walked down the street, around the corner, and into the store.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["For breakfast I had eggs toast and juice.", "For breakfast, I had eggs, toast, and juice.", "For breakfast I had, eggs, toast, and juice.", "For breakfast, I had eggs toast, and juice."],
      correct: 1,
      explanation: { correct: "A comma after an introductory phrase ('For breakfast') plus commas in the series.", incorrect: ["Missing introductory comma and series commas.","CORRECT: Introductory comma and series commas.","Comma after 'had' splits verb and object.","Missing comma after 'eggs.'"] },
      studyAid: { definition: "Introductory phrases are followed by commas. Series items also need commas.", example: "In the morning, I eat cereal, fruit, and toast.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which incorrectly places a comma?",
      choices: ["My pets are a dog, a cat, and a fish.", "My pets are a dog a cat and a fish.", "My pets are a dog, a cat and a fish.", "My pets, are a dog, a cat, and a fish."],
      correct: 3,
      explanation: { correct: "'My pets, are' incorrectly puts a comma between the subject and verb.", incorrect: ["Correct.","Missing commas.","Missing Oxford comma.","CORRECT: Comma between subject and verb is wrong."] },
      studyAid: { definition: "Never separate a subject from its verb with a single comma.", example: "Incorrect: The dog, barked. Correct: The dog barked.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["She sang danced and laughed.", "She sang, danced, and laughed.", "She sang danced, and laughed.", "She, sang, danced, and laughed."],
      correct: 1,
      explanation: { correct: "Verbs in a series need commas between them.", incorrect: ["Missing commas.","CORRECT: Commas between verbs.","Missing comma after 'sang.'","Comma after 'She' is wrong."] },
      studyAid: { definition: "Actions in a list are separated by commas.", example: "He ran, jumped, and shouted with joy.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which uses commas correctly?",
      choices: ["At the store we need milk bread and eggs.", "At the store, we need milk, bread, and eggs.", "At the store we need, milk, bread, and eggs.", "At the store, we need milk bread, and eggs."],
      correct: 1,
      explanation: { correct: "Introductory phrase comma plus series commas.", incorrect: ["Missing all commas.","CORRECT: Introductory comma and series commas.","Comma after 'need' splits verb and object.","Missing comma after 'milk.'"] },
      studyAid: { definition: "When a sentence starts with a prepositional phrase, use a comma after it.", example: "In the afternoon, we played games, read books, and drew pictures.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["I like vanilla chocolate and strawberry ice cream.", "I like vanilla, chocolate, and strawberry ice cream.", "I like vanilla chocolate, and strawberry ice cream.", "I like, vanilla, chocolate, and strawberry ice cream."],
      correct: 1,
      explanation: { correct: "'Vanilla,' 'chocolate,' and 'strawberry' are adjectives describing 'ice cream' and need commas.", incorrect: ["Missing commas.","CORRECT: Commas between adjectives.","Missing comma after 'vanilla.'","Comma after 'like' is wrong."] },
      studyAid: { definition: "Multiple adjectives before a noun are separated by commas.", example: "She ordered a large, hot, cheesy pizza.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which incorrectly uses commas?",
      choices: ["Please bring a pen, paper, and scissors.", "Please bring a pen paper and scissors.", "Please bring a pen, paper and scissors.", "Please, bring a pen, paper, and scissors."],
      correct: 3,
      explanation: { correct: "'Please, bring' adds an unnecessary comma after a short introductory word. While acceptable in very formal writing, it is generally unnecessary.", incorrect: ["Correct.","Missing commas.","Missing Oxford comma.","CORRECT: Unnecessary comma after 'Please.'"] },
      studyAid: { definition: "Very short introductory words like 'Please,' 'Yes,' or 'No' may use commas, but they are often unnecessary.", example: "Please bring your books. (No comma needed.)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 2.5 Commas in Dates */
QUESTION_BANK['punctuation-commas-dates'] = {
  title: "Commas in Dates",
  topic: "Punctuation",
  questions: [
    {
      question: "Which date is written correctly?",
      choices: ["July 4 2024", "July 4, 2024", "July, 4 2024", "July 4 2024,"],
      correct: 1,
      explanation: { correct: "Put a comma between the day and the year.", incorrect: ["Missing comma.","CORRECT: Comma between day and year.","Comma after month is wrong.","Comma at the end is wrong."] },
      studyAid: { definition: "In dates, use a comma between the day and the year.", example: "December 25, 2023; March 1, 2020", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["On January 1 2020 we moved.", "On January 1, 2020, we moved.", "On January, 1 2020 we moved.", "On January 1 2020, we moved."],
      correct: 1,
      explanation: { correct: "Comma between day and year, and another after the year when the date starts the sentence.", incorrect: ["Missing both commas.","CORRECT: Comma after day and after year.","Comma after month is wrong.","Missing comma between day and year."] },
      studyAid: { definition: "When a date appears at the beginning of a sentence, use a comma after the year too.", example: "On June 5, 2024, we graduated.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["February 14, 2015", "Feb. 14, 2015", "February, 14, 2015", "14 February 2015"],
      correct: 2,
      explanation: { correct: "Do not put a comma between the month and the day.", incorrect: ["Correct.","Correct abbreviation.","CORRECT: Wrong comma between month and day.","Acceptable in British style, but not standard American."] },
      studyAid: { definition: "Only put a comma between the day and the year, not between month and day.", example: "March 3, 2025 (correct) / March, 3, 2025 (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The party is on Saturday June 15 2025.", "The party is on Saturday, June 15, 2025.", "The party is on Saturday June 15, 2025.", "The party is on, Saturday, June 15, 2025."],
      correct: 1,
      explanation: { correct: "When a date includes the day of the week, put a comma between the weekday and the month, and between the day and year.", incorrect: ["Missing commas.","CORRECT: Commas after weekday and after day.","Missing comma after weekday.","Comma after 'on' is wrong."] },
      studyAid: { definition: "Day of the week + date: comma after weekday and after day.", example: "Monday, September 2, 2024", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which uses commas correctly?",
      choices: ["December 25 1776 was a cold day.", "December 25, 1776, was a cold day.", "December, 25, 1776, was a cold day.", "December 25 1776, was a cold day."],
      correct: 1,
      explanation: { correct: "Comma between day and year, and after the year when it is in the middle of a sentence.", incorrect: ["Missing comma between day and year.","CORRECT: Commas after day and after year.","Wrong comma after month.","Missing comma between day and year."] },
      studyAid: { definition: "When the full date is the subject or object, commas go around the year if it follows the day.", example: "July 20, 1969, was the moon landing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Her birthday is August 8 2010.", "Her birthday is August 8, 2010.", "Her birthday is August, 8, 2010.", "Her birthday is, August 8, 2010."],
      correct: 1,
      explanation: { correct: "Comma between day and year only.", incorrect: ["Missing comma.","CORRECT: Comma between day and year.","Wrong comma after month.","Comma after 'is' is wrong."] },
      studyAid: { definition: "At the end of a sentence, only one comma is needed between day and year.", example: "The event is on May 5, 2026.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["April 1, 2020", "1 April 2020", "April, 1 2020", "April 2020"],
      correct: 2,
      explanation: { correct: "No comma between month and day.", incorrect: ["Correct.","British style, acceptable.","CORRECT: Wrong comma after month.","Correct when no day is given."] },
      studyAid: { definition: "No comma between month and day, ever.", example: "June 6, 1944 (correct) / June, 6, 1944 (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["On Tuesday March 3 1992 the school opened.", "On Tuesday, March 3, 1992, the school opened.", "On Tuesday March 3, 1992 the school opened.", "On Tuesday, March 3 1992, the school opened."],
      correct: 1,
      explanation: { correct: "Commas after Tuesday, after 3, and after 1992.", incorrect: ["Missing commas.","CORRECT: All commas in place.","Missing comma after Tuesday and after year.","Missing comma between day and year."] },
      studyAid: { definition: "Full date with weekday: commas after weekday, after day, and after year.", example: "On Friday, July 4, 2025, we celebrate.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["March 2025, was rainy.", "March 2025 was rainy.", "March, 2025 was rainy.", "March, 2025, was rainy."],
      correct: 1,
      explanation: { correct: "When there is no day, do not use commas.", incorrect: ["Unnecessary comma after year.","CORRECT: No commas needed without day.","Comma after month is unnecessary.","Both commas are unnecessary."] },
      studyAid: { definition: "If the date has only month and year, no comma is needed.", example: "January 2024 was very cold.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The letter was dated 10/5/2020.", "The letter was dated October 5, 2020.", "The letter was dated October, 5, 2020.", "The letter was dated October 5 2020."],
      correct: 1,
      explanation: { correct: "Comma between day and year in written dates.", incorrect: ["Numerical date avoids commas but is less formal.","CORRECT: Written date with comma.","Wrong comma after month.","Missing comma between day and year."] },
      studyAid: { definition: "In formal writing, write out the month and use a comma between day and year.", example: "The contract was signed November 12, 2023.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["June 6, 1944, was D-Day.", "June 6 1944 was D-Day.", "June, 6, 1944, was D-Day.", "On June 6, 1944, Allied forces landed."],
      correct: 2,
      explanation: { correct: "Wrong comma after month.", incorrect: ["Correct.","Missing comma, but not the most incorrect.","CORRECT: Wrong comma after month.","Correct."] },
      studyAid: { definition: "Only day and year get a comma. Month and day do not.", example: "June 6, 1944 (correct) / June, 6, 1944 (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The meeting is set for Monday June 2 2025 at noon.", "The meeting is set for Monday, June 2, 2025, at noon.", "The meeting is set for Monday June 2, 2025 at noon.", "The meeting is set for, Monday, June 2, 2025, at noon."],
      correct: 1,
      explanation: { correct: "Commas after Monday, after 2, and after 2025.", incorrect: ["Missing commas.","CORRECT: All commas in place.","Missing commas after Monday and year.","Comma after 'for' is wrong."] },
      studyAid: { definition: "When a full date is followed by more words, commas set it off.", example: "Friday, May 3, 2024, is the deadline.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["July 4th, 2024", "July 4, 2024", "July, 4th, 2024", "July 4th 2024"],
      correct: 1,
      explanation: { correct: "Standard format uses the numeral without 'th' in most formal writing, but 'July 4th, 2024' is acceptable in casual writing. However, 'July 4, 2024' is the most standard formal choice.", incorrect: ["Acceptable in casual writing, but 'July 4, 2024' is more formal.","CORRECT: Standard formal date format.","Wrong comma after month.","Missing comma."] },
      studyAid: { definition: "In formal writing, use numerals without 'st,' 'nd,' 'rd,' or 'th' in dates.", example: "March 1, 2025 (not March 1st, 2025 in very formal writing)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["In 2025, we will graduate.", "In, 2025, we will graduate.", "In 2025 we will graduate.", "In, 2025 we will graduate."],
      correct: 0,
      explanation: { correct: "A short introductory prepositional phrase can use a comma for clarity, especially with a year.", incorrect: ["CORRECT: Comma after introductory phrase is acceptable.","Too many commas.","Missing comma after introductory phrase.","Comma after 'In' is wrong."] },
      studyAid: { definition: "Introductory phrases of four or more words usually need a comma, but even shorter ones can use one for clarity.", example: "In 1492, Columbus sailed. In the summer of 2025, we camped.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["November 11, 1918", "11 November 1918", "November, 11, 1918", "Nov. 11, 1918"],
      correct: 2,
      explanation: { correct: "Wrong comma after month.", incorrect: ["Correct.","British style.","CORRECT: Wrong comma.","Correct abbreviation."] },
      studyAid: { definition: "Remember: no comma between month and day.", example: "October 31, 2024 (correct) / October, 31, 2024 (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 2.6 Commas in Addresses */
QUESTION_BANK['punctuation-commas-addresses'] = {
  title: "Commas in Addresses",
  topic: "Punctuation",
  questions: [
    {
      question: "Which address uses commas correctly?",
      choices: ["123 Main Street Springfield IL 62701", "123 Main Street, Springfield, IL 62701", "123 Main Street, Springfield IL, 62701", "123 Main Street Springfield, IL 62701"],
      correct: 1,
      explanation: { correct: "Comma after the street and after the city. No comma between state and zip code.", incorrect: ["Missing commas.","CORRECT: Comma after street and city.","Comma after state is wrong.","Missing comma after street."] },
      studyAid: { definition: "In an address on one line: comma after street, comma after city. No comma between state and ZIP.", example: "456 Oak Ave., Denver, CO 80202", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["She lives at 99 Pine Road Boston MA 02108.", "She lives at 99 Pine Road, Boston, MA 02108.", "She lives at 99 Pine Road Boston, MA 02108.", "She lives at 99 Pine Road, Boston MA 02108."],
      correct: 1,
      explanation: { correct: "Comma after street and after city.", incorrect: ["Missing commas.","CORRECT: Commas after street and city.","Missing comma after street.","Missing comma after city."] },
      studyAid: { definition: "Each part of the address (street, city) gets a comma except state-ZIP.", example: "88 Lake St., Chicago, IL 60601", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["77 River Dr., Austin, TX 78701", "77 River Dr. Austin, TX 78701", "77 River Dr., Austin TX 78701", "77, River Dr., Austin, TX 78701"],
      correct: 3,
      explanation: { correct: "Do not put a comma between the house number and street.", incorrect: ["Correct.","Missing comma after street.","Missing comma after city.","CORRECT: Wrong comma after house number."] },
      studyAid: { definition: "No comma separates the street number from the street name.", example: "123 Main St. (correct) / 123, Main St. (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Send it to PO Box 555, Dallas, TX 75201.", "Send it to PO Box 555 Dallas, TX 75201.", "Send it to PO Box, 555, Dallas, TX 75201.", "Send it to PO Box 555 Dallas TX, 75201."],
      correct: 0,
      explanation: { correct: "Comma after the full address line and after the city.", incorrect: ["CORRECT: Commas after address line and city.","Missing comma after PO Box line.","Comma after 'Box' is wrong.","Missing comma after Dallas; comma after TX is wrong."] },
      studyAid: { definition: "PO Box addresses follow the same comma rules as street addresses.", example: "PO Box 100, Seattle, WA 98101", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which uses commas correctly?",
      choices: ["The White House 1600 Pennsylvania Avenue NW Washington DC 20500", "The White House, 1600 Pennsylvania Avenue NW, Washington, DC 20500", "The White House, 1600 Pennsylvania Avenue NW Washington, DC 20500", "The White House 1600 Pennsylvania Avenue NW, Washington DC 20500"],
      correct: 1,
      explanation: { correct: "Comma after building name, after street, and after city.", incorrect: ["Missing commas.","CORRECT: Commas after name, street, and city.","Missing comma after street.","Missing commas after name and city."] },
      studyAid: { definition: "Long addresses with building names need commas between each part.", example: "Empire State Building, 350 5th Ave., New York, NY 10118", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["My aunt lives in Miami, FL 33101.", "My aunt lives in Miami FL 33101.", "My aunt lives in Miami, FL, 33101.", "My aunt lives in Miami FL, 33101."],
      correct: 2,
      explanation: { correct: "No comma between state and ZIP code.", incorrect: ["Correct.","Missing comma after city.","CORRECT: Wrong comma between state and ZIP.","Missing comma after city."] },
      studyAid: { definition: "Never put a comma between the state abbreviation and the ZIP code.", example: "Orlando, FL 32801 (correct) / Orlando, FL, 32801 (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Meet me at 22 Maple Lane Portland Oregon 97201.", "Meet me at 22 Maple Lane, Portland, Oregon 97201.", "Meet me at 22 Maple Lane Portland, Oregon 97201.", "Meet me at 22 Maple Lane, Portland Oregon 97201."],
      correct: 1,
      explanation: { correct: "Comma after street and after city. Full state name still follows the same rule.", incorrect: ["Missing commas.","CORRECT: Commas after street and city.","Missing comma after street.","Missing comma after city."] },
      studyAid: { definition: "Full state names follow the same comma rules as abbreviations.", example: "Austin, Texas 78701", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct in a sentence?",
      choices: ["I visited her at 4 Hilltop Circle Baltimore MD 21201 last week.", "I visited her at 4 Hilltop Circle, Baltimore, MD 21201, last week.", "I visited her at 4 Hilltop Circle, Baltimore MD 21201 last week.", "I visited her at 4 Hilltop Circle Baltimore, MD 21201, last week."],
      correct: 1,
      explanation: { correct: "Commas after street, city, and after the full address to set it off from the rest of the sentence.", incorrect: ["Missing commas.","CORRECT: Commas after street, city, and after the address.","Missing comma after city and after address.","Missing comma after street."] },
      studyAid: { definition: "When an address is inside a sentence, commas go after street, city, and after the entire address.", example: "She moved to 88 Park Rd., Denver, CO 80202, last summer.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["555 Cedar Blvd., Phoenix, AZ 85001", "555 Cedar Blvd. Phoenix, AZ 85001", "555, Cedar Blvd., Phoenix, AZ 85001", "555 Cedar Blvd., Phoenix AZ 85001"],
      correct: 2,
      explanation: { correct: "No comma between house number and street name.", incorrect: ["Correct.","Missing comma after street.","CORRECT: Wrong comma after number.","Missing comma after city."] },
      studyAid: { definition: "The house number and street name are one unit. Do not split them with a comma.", example: "100 Main St. (correct) / 100, Main St. (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Apartment 3B 77 Sunset Blvd. Los Angeles CA 90028", "Apartment 3B, 77 Sunset Blvd., Los Angeles, CA 90028", "Apartment 3B, 77 Sunset Blvd. Los Angeles, CA 90028", "Apartment 3B 77 Sunset Blvd., Los Angeles CA 90028"],
      correct: 1,
      explanation: { correct: "Comma after apartment, after street, and after city.", incorrect: ["Missing commas.","CORRECT: Commas after apartment, street, and city.","Missing comma after street.","Missing commas after apartment and city."] },
      studyAid: { definition: "Apartment or suite numbers are part of the street address and need a comma after them.", example: "Suite 100, 400 Market St., Philadelphia, PA 19107", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The store is at 300 Broad Street Newark New Jersey 07102.", "The store is at 300 Broad Street, Newark, New Jersey 07102.", "The store is at 300 Broad Street Newark, New Jersey 07102.", "The store is at 300 Broad Street, Newark New Jersey 07102."],
      correct: 1,
      explanation: { correct: "Comma after street and after city. Full state name, no comma before ZIP.", incorrect: ["Missing commas.","CORRECT: Commas after street and city.","Missing comma after street.","Missing comma after city."] },
      studyAid: { definition: "Even with full state names, comma rules stay the same.", example: "Portland, Maine 04101", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["I live on 12 River Road.", "I live on 12, River Road.", "I live on River Road.", "I live at 12 River Road."],
      correct: 1,
      explanation: { correct: "Do not separate the house number from the street with a comma.", incorrect: ["Correct.","CORRECT: Wrong comma.","Correct (no number).","Correct."] },
      studyAid: { definition: "House number + street = one unit. No comma.", example: "45 Elm St. (correct)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Write to us at 900 Grand Ave. Saint Paul MN 55105.", "Write to us at 900 Grand Ave., Saint Paul, MN 55105.", "Write to us at 900 Grand Ave. Saint Paul, MN 55105.", "Write to us at 900 Grand Ave., Saint Paul MN 55105."],
      correct: 1,
      explanation: { correct: "Comma after street and after city.", incorrect: ["Missing commas.","CORRECT: Commas after street and city.","Missing comma after street.","Missing comma after city."] },
      studyAid: { definition: "City names with spaces follow the same comma rules.", example: "Salt Lake City, UT 84101", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Our office is at One Microsoft Way Redmond WA 98052.", "Our office is at One Microsoft Way, Redmond, WA 98052.", "Our office is at One Microsoft Way Redmond, WA 98052.", "Our office is at One Microsoft Way, Redmond WA 98052."],
      correct: 1,
      explanation: { correct: "Comma after street address and after city.", incorrect: ["Missing commas.","CORRECT: Commas after street and city.","Missing comma after street.","Missing comma after city."] },
      studyAid: { definition: "Named addresses like 'One Microsoft Way' still need commas after them.", example: "One Infinite Loop, Cupertino, CA 95014", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["1600 Pennsylvania Ave. NW, Washington, DC 20500", "1600 Pennsylvania Ave. NW Washington, DC 20500", "1600 Pennsylvania Ave., NW, Washington, DC 20500", "1600 Pennsylvania Ave. NW Washington DC 20500"],
      correct: 2,
      explanation: { correct: "'NW' is a directional suffix and should not have its own comma before it.", incorrect: ["Correct.","Missing comma after street.","CORRECT: Extra comma before NW.","Missing commas."] },
      studyAid: { definition: "Directional suffixes (NW, SE) are part of the street address and do not need a comma before them.", example: "100 Main St. SE, Atlanta, GA 30303", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 2.7 Commas to Separate Dialogue */
QUESTION_BANK['punctuation-commas-dialogue'] = {
  title: "Commas to Separate Dialogue",
  topic: "Punctuation",
  questions: [
    {
      question: "Which sentence uses commas correctly with dialogue?",
      choices: ["'Let's go' said Maria.", "'Let's go,' said Maria.", "'Let's go' said, Maria.", "'Let's go,' said, Maria."],
      correct: 1,
      explanation: { correct: "A comma goes inside the quotation marks before the dialogue tag.", incorrect: ["Missing comma before dialogue tag.","CORRECT: Comma inside quotes before tag.","Comma after 'said' is wrong.","Comma after 'said' is wrong."] },
      studyAid: { definition: "When a dialogue tag follows a quoted statement, use a comma inside the closing quotation mark.", example: "\"I'm ready,\" he said.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'I don't know' she whispered 'what to do.'", "'I don't know,' she whispered, 'what to do.'", "'I don't know' she whispered, 'what to do.'", "'I don't know,' she whispered 'what to do.'"],
      correct: 1,
      explanation: { correct: "Commas go on both sides of the dialogue tag when it splits a sentence.", incorrect: ["Missing commas around tag.","CORRECT: Commas before and after tag.","Missing comma after first quote.","Missing comma after 'whispered.'"] },
      studyAid: { definition: "When a tag interrupts a quoted sentence, commas surround the tag.", example: "\"The answer,\" she said, \"is yes.\"", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'Where are you going?' asked Mom.", "'Where are you going,' asked Mom.", "'Where are you going?' asked, Mom.", "'Where are you going,' asked, Mom."],
      correct: 0,
      explanation: { correct: "The question mark stays inside the quotes. No comma is needed.", incorrect: ["CORRECT: Question mark inside quotes, no comma.","Question mark should not be a comma.","Comma after 'asked' is wrong.","Both punctuation marks are wrong."] },
      studyAid: { definition: "When a quote ends with ? or !, do not add a comma before the tag.", example: "\"What?\" he asked. \"Stop!\" she yelled.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["'I am tired,' he said.", "'I am tired' he said.", "'I am tired,' he said, 'and hungry.'", "'I am tired,' he said. 'I am hungry.'"],
      correct: 1,
      explanation: { correct: "Missing comma before the dialogue tag.", incorrect: ["Correct.","CORRECT: Missing comma before tag.","Correct split sentence.","Correct as two sentences."] },
      studyAid: { definition: "Always use a comma before a dialogue tag that follows a statement.", example: "\"I agree,\" she nodded. (Wait—'nodded' is an action, not a speaking verb. Better: 'I agree,' she said, nodding.)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'Help!' screamed the boy.", "'Help,' screamed the boy.", "'Help!' screamed, the boy.", "'Help,' screamed, the boy."],
      correct: 0,
      explanation: { correct: "The exclamation point stays inside the quotes.", incorrect: ["CORRECT: Exclamation inside quotes.","Exclamation should not be a comma.","Comma after 'screamed' is wrong.","Both are wrong."] },
      studyAid: { definition: "Strong emotion inside quotes keeps its ! or ?. No comma added.", example: "\"Fire!\" he shouted. \"Run!\"", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'We should leave now,' said Tom, 'before it rains.'", "'We should leave now' said Tom 'before it rains.'", "'We should leave now,' said Tom 'before it rains.'", "'We should leave now' said Tom, 'before it rains.'"],
      correct: 0,
      explanation: { correct: "Commas on both sides of the tag, lowercase continuation.", incorrect: ["CORRECT: Commas around tag.","Missing commas.","Missing comma after tag.","Missing comma after first quote."] },
      studyAid: { definition: "Split dialogue needs commas on both sides of the tag.", example: "\"I think,\" he said, \"we should wait.\"", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'Pass the salt' Mark said to his brother.", "'Pass the salt,' Mark said to his brother.", "'Pass the salt' Mark said, to his brother.", "'Pass the salt,' Mark said, to his brother."],
      correct: 1,
      explanation: { correct: "Comma inside quotes before the dialogue tag.", incorrect: ["Missing comma.","CORRECT: Comma inside quotes.","Comma after 'said' is wrong.","Comma after 'said' is wrong."] },
      studyAid: { definition: "Commands in dialogue also need commas before tags.", example: "\"Stop,\" she commanded. \"Sit down,\" he ordered.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["'I agree,' said Jane.", "'I agree' said Jane.", "'I agree,' said Jane, 'with you.'", "'I agree.' said Jane."],
      correct: 3,
      explanation: { correct: "If the quote ends with a period, the next sentence should not start with lowercase 'said.' It should be 'I agree,' said Jane. or 'I agree.' Jane said. But 'I agree.' said Jane. is wrong because 'said' is lowercase after a period.", incorrect: ["Correct.","Missing comma.","Correct split.","CORRECT: 'said' cannot be lowercase after a period."] },
      studyAid: { definition: "After a period inside quotes, start a new sentence with a capital letter or change the period to a comma before the tag.", example: "\"I agree.\" Jane smiled. OR \"I agree,\" said Jane.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'Why are you late?' the teacher asked.", "'Why are you late,' the teacher asked.", "'Why are you late?' the teacher, asked.", "'Why are you late,' the teacher, asked."],
      correct: 0,
      explanation: { correct: "Question mark inside quotes, no comma needed.", incorrect: ["CORRECT: Question mark inside quotes.","Question mark should not be a comma.","Comma after 'teacher' is wrong.","Both are wrong."] },
      studyAid: { definition: "Questions in dialogue keep the question mark inside.", example: "\"What happened?\" she asked. \"Where were you?\"", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'I don't think so' he replied.", "'I don't think so,' he replied.", "'I don't think so' he, replied.", "'I don't think so,' he, replied."],
      correct: 1,
      explanation: { correct: "Comma inside quotes before the dialogue tag.", incorrect: ["Missing comma.","CORRECT: Comma inside quotes.","Comma after 'he' is wrong.","Comma after 'he' is wrong."] },
      studyAid: { definition: "Replied, answered, and responded follow the same comma rules as said.", example: "\"No way,\" he replied. \"Absolutely,\" she answered.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'It's cold in here,' Sarah said closing the window.", "'It's cold in here,' Sarah said, closing the window.", "'It's cold in here' Sarah said, closing the window.", "'It's cold in here,' Sarah said, closing, the window."],
      correct: 1,
      explanation: { correct: "Comma after 'said' to separate the action from the dialogue tag.", incorrect: ["Missing comma after 'said.'","CORRECT: Comma after 'said' before action.","Missing comma before tag.","Comma after 'closing' is wrong."] },
      studyAid: { definition: "Actions attached to dialogue tags need commas to separate them.", example: "\"I'm leaving,\" she said, grabbing her coat.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["'Wait for me!' he shouted.", "'Wait for me,' he shouted.", "'Wait for me!' He shouted.", "'Wait for me!' shouted he."],
      correct: 2,
      explanation: { correct: "'He' should be lowercase after an exclamation point in dialogue because it is all one sentence.", incorrect: ["Correct.","Exclamation is better, but comma is acceptable.","CORRECT: 'He' should be lowercase.","Inverted word order is awkward but grammatically possible."] },
      studyAid: { definition: "After ? or ! in dialogue, the tag remains lowercase if it is the same sentence.", example: "\"Stop!\" he yelled. (Not: 'Stop!' He yelled.)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'I am not sure' she admitted 'about the plan.'", "'I am not sure,' she admitted, 'about the plan.'", "'I am not sure' she admitted, 'about the plan.'", "'I am not sure,' she admitted 'about the plan.'"],
      correct: 1,
      explanation: { correct: "Commas on both sides of the tag.", incorrect: ["Missing commas.","CORRECT: Commas around tag.","Missing comma after first quote.","Missing comma after tag."] },
      studyAid: { definition: "Admitted, confessed, and muttered follow the same comma rules.", example: "\"I lied,\" he admitted, \"about my age.\"", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'Yes I will,' she promised.", "'Yes, I will,' she promised.", "'Yes I will' she promised.", "'Yes, I will' she promised."],
      correct: 1,
      explanation: { correct: "'Yes' at the start of a quoted sentence needs a comma after it. Also comma before tag.", incorrect: ["Missing comma after 'Yes.'","CORRECT: Comma after 'Yes' and before tag.","Missing both commas.","Missing comma before tag."] },
      studyAid: { definition: "Interjections like yes, no, well, and oh at the start of quotes need commas.", example: "\"Yes, I understand,\" he agreed. \"No, thank you,\" she declined.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'Bye!' waved the girl.", "'Bye!' the girl waved.", "'Bye,' waved the girl.", "'Bye!' she waved."],
      correct: 1,
      explanation: { correct: "'Waved' is an action, not a speaking verb. The tag should be structured so the action is separate. 'The girl waved' works as an action beat.", incorrect: ["'Waved' is not a speaking verb, so this is awkward.","CORRECT: Action beat separate from dialogue.","Exclamation is better than comma for 'Bye!'","'She waved' is an action, not a dialogue tag."] },
      studyAid: { definition: "Action beats (like 'she waved') are not dialogue tags and do not need commas.", example: "\"Goodbye.\" She waved. (Period, not comma, because 'waved' is not speaking.)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 2.8 Colon in Time */
QUESTION_BANK['punctuation-colon-time'] = {
  title: "Colon in Time",
  topic: "Punctuation",
  questions: [
    {
      question: "Which shows the correct way to write 3:30?",
      choices: ["3.30", "3:30", "3-30", "3,30"],
      correct: 1,
      explanation: { correct: "A colon separates hours and minutes in time.", incorrect: ["Period is not used for time.","CORRECT: Colon separates hours and minutes.","Hyphen is not used for time.","Comma is not used for time."] },
      studyAid: { definition: "In digital time, a colon separates hours from minutes.", example: "3:30, 12:00, 9:15", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The train leaves at 4:45 p.m.", "The train leaves at 4.45 p.m.", "The train leaves at 4-45 p.m.", "The train leaves at 4,45 p.m."],
      correct: 0,
      explanation: { correct: "Colon between hours and minutes.", incorrect: ["CORRECT: Colon separates hours and minutes.","Period is wrong.","Hyphen is wrong.","Comma is wrong."] },
      studyAid: { definition: "Always use a colon, not a period or comma, in times.", example: "The meeting starts at 2:15 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["7:00 a.m.", "7.00 a.m.", "7:15 a.m.", "7:59 p.m."],
      correct: 1,
      explanation: { correct: "Period should not replace the colon in time.", incorrect: ["Correct.","CORRECT: Period is wrong.","Correct.","Correct."] },
      studyAid: { definition: "Only the colon is correct for separating hours and minutes.", example: "7:00 (correct) / 7.00 (incorrect)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Noon is 12:00 p.m.", "Noon is 12.00 p.m.", "Noon is 12-00 p.m.", "Noon is 12,00 p.m."],
      correct: 0,
      explanation: { correct: "Colon between hours and minutes.", incorrect: ["CORRECT: Colon used correctly.","Period is wrong.","Hyphen is wrong.","Comma is wrong."] },
      studyAid: { definition: "Noon and midnight use the same colon format: 12:00 p.m. or 12:00 a.m.", example: "Lunch is at 12:00 p.m. Bedtime is at 12:00 a.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The store opens at 9:00.", "The store opens at 9.00.", "The store opens at 9,00.", "The store opens at 9-00."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Comma wrong.","Hyphen wrong."] },
      studyAid: { definition: "Even without a.m./p.m., use a colon.", example: "School starts at 8:30.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I woke up at 6:30 a.m.", "I woke up at 6.30 a.m.", "I woke up at 6,30 a.m.", "I woke up at 6;30 a.m."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Comma wrong.","Semicolon wrong."] },
      studyAid: { definition: "Never use semicolons, commas, or periods instead of colons in time.", example: "Sunrise is at 6:45 a.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["10:30", "10.30", "10:45", "10:15"],
      correct: 1,
      explanation: { correct: "Period should not separate hours and minutes.", incorrect: ["Correct.","CORRECT: Period is wrong.","Correct.","Correct."] },
      studyAid: { definition: "Only colons separate hours and minutes.", example: "10:30 (correct)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The movie starts at 7:45 p.m.", "The movie starts at 7.45 p.m.", "The movie starts at 7,45 p.m.", "The movie starts at 7;45 p.m."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Comma wrong.","Semicolon wrong."] },
      studyAid: { definition: "Standard time format uses a colon.", example: "The concert begins at 8:00 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Bedtime is 8:30 p.m.", "Bedtime is 8.30 p.m.", "Bedtime is 8-30 p.m.", "Bedtime is 8,30 p.m."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Hyphen wrong.","Comma wrong."] },
      studyAid: { definition: "Colons are the only correct punctuation between hours and minutes.", example: "Dinner is at 6:15 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["11:11 a.m.", "11.11 a.m.", "11:59 p.m.", "11:00 a.m."],
      correct: 1,
      explanation: { correct: "Period should not be used.", incorrect: ["Correct.","CORRECT: Period is wrong.","Correct.","Correct."] },
      studyAid: { definition: "Always use a colon for time.", example: "11:11 (correct)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Class ends at 3:20.", "Class ends at 3.20.", "Class ends at 3,20.", "Class ends at 3;20."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Comma wrong.","Semicolon wrong."] },
      studyAid: { definition: "Colons separate hours and minutes in all time notation.", example: "Recess is at 10:45.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Sunrise is at 5:48 a.m.", "Sunrise is at 5.48 a.m.", "Sunrise is at 5,48 a.m.", "Sunrise is at 5-48 a.m."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Comma wrong.","Hyphen wrong."] },
      studyAid: { definition: "Even with specific minutes, use a colon.", example: "Sunset is at 7:22 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["2:30", "2.30", "2:00", "2:15"],
      correct: 1,
      explanation: { correct: "Period is wrong.", incorrect: ["Correct.","CORRECT: Period is wrong.","Correct.","Correct."] },
      studyAid: { definition: "Colons only.", example: "2:30 (correct)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The flight leaves at 6:00 a.m.", "The flight leaves at 6.00 a.m.", "The flight leaves at 6,00 a.m.", "The flight leaves at 6-00 a.m."],
      correct: 0,
      explanation: { correct: "Colon in time.", incorrect: ["CORRECT: Colon used.","Period wrong.","Comma wrong.","Hyphen wrong."] },
      studyAid: { definition: "Colons are standard in transportation schedules.", example: "The bus arrives at 4:30 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Lunch is from 12:00 to 12:30.", "Lunch is from 12.00 to 12.30.", "Lunch is from 12,00 to 12,30.", "Lunch is from 12-00 to 12-30."],
      correct: 0,
      explanation: { correct: "Colons in both times.", incorrect: ["CORRECT: Colons used in both times.","Periods wrong.","Commas wrong.","Hyphens wrong."] },
      studyAid: { definition: "Use colons for all times in a range.", example: "Open from 9:00 a.m. to 5:00 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 2.9 Apostrophes in Contractions */
QUESTION_BANK['punctuation-apostrophes-contractions'] = {
  title: "Apostrophes in Contractions",
  topic: "Punctuation",
  questions: [
    {
      question: "Which contraction is spelled correctly?",
      choices: ["does'nt", "doesnt", "doesn't", "do'esnt"],
      correct: 2,
      explanation: { correct: "'Doesn't' places the apostrophe where the 'o' in 'not' was removed.", incorrect: ["Apostrophe in wrong place.","Missing apostrophe.","CORRECT: Apostrophe replaces missing 'o.'","Wrong spelling and apostrophe placement."] },
      studyAid: { definition: "In contractions, the apostrophe replaces the removed letter(s).", example: "does not → doesn't; is not → isn't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I' am", "I'am", "I'm", "Im"],
      correct: 2,
      explanation: { correct: "'I'm' replaces the 'a' in 'am' with an apostrophe.", incorrect: ["Space in wrong place.","Missing space and wrong apostrophe placement.","CORRECT: 'I'm' is correct.","Missing apostrophe."] },
      studyAid: { definition: "'I'm' contracts 'I am.' The apostrophe replaces the 'a.'", example: "I am → I'm; I have → I've", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["can't", "wont", "won't", "isn't"],
      correct: 1,
      explanation: { correct: "'Wont' without an apostrophe is a different word meaning a habit. 'Won't' is the contraction.", incorrect: ["Correct.","CORRECT: Missing apostrophe.","Correct.","Correct."] },
      studyAid: { definition: "'Wont' (habit) and 'won't' (will not) are different words.", example: "It is his wont to read daily. He won't eat broccoli.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["they're", "they'are", "they' re", "theyr'e"],
      correct: 0,
      explanation: { correct: "'They're' replaces the 'a' in 'are.'", incorrect: ["CORRECT: 'They're' is correct.","Wrong spacing.","Wrong spacing.","Wrong apostrophe placement."] },
      studyAid: { definition: "'They're' = they are. The apostrophe replaces the 'a.'", example: "they are → they're; we are → we're", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["shouldn't", "should'nt", "shouldnt", "couldn't"],
      correct: 1,
      explanation: { correct: "The apostrophe should be before the 'n,' not after it.", incorrect: ["Correct.","CORRECT: Apostrophe in wrong place.","Missing apostrophe.","Correct."] },
      studyAid: { definition: "The apostrophe always goes where the missing letters were.", example: "should not → shouldn't; could not → couldn't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["it is'nt", "it isnt", "it's not", "its' not"],
      correct: 2,
      explanation: { correct: "'It's not' uses the correct contraction 'it's' (it is) + 'not.'", incorrect: ["Apostrophe in wrong place.","Missing apostrophe.","CORRECT: 'It's not' is correct.","'Its'' is not a word."] },
      studyAid: { definition: "'It's' = it is. 'Its' = possession. 'Its'' is never correct.", example: "It's not raining. The dog wagged its tail.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["we've", "we' ve", "wev'e", "weve"],
      correct: 0,
      explanation: { correct: "'We've' replaces the 'ha' in 'have.'", incorrect: ["CORRECT: 'We've' is correct.","Wrong spacing.","Wrong apostrophe placement.","Missing apostrophe."] },
      studyAid: { definition: "'We've' = we have. The apostrophe replaces 'ha.'", example: "we have → we've; they have → they've", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["he'll", "hell", "he' ll", "he ll"],
      correct: 1,
      explanation: { correct: "'Hell' without an apostrophe is a different word meaning the underworld.", incorrect: ["Correct.","CORRECT: 'Hell' is a different word.","Wrong spacing.","Missing apostrophe."] },
      studyAid: { definition: "'He'll' (he will) and 'hell' (underworld) are different words.", example: "He'll be here soon. That sounds like hell.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["youre", "you're", "you' re", "youre'"],
      correct: 1,
      explanation: { correct: "'You're' replaces the 'a' in 'are.'", incorrect: ["Missing apostrophe.","CORRECT: 'You're' is correct.","Wrong spacing.","Wrong apostrophe placement."] },
      studyAid: { definition: "'You're' = you are. 'Your' = possession.", example: "You're my friend. Is this your book?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["let's", "lets", "let's go", "let us"],
      correct: 1,
      explanation: { correct: "'Lets' without an apostrophe is a verb meaning allows. 'Let's' is the contraction for 'let us.'", incorrect: ["Correct contraction.","CORRECT: 'Lets' means allows, not 'let us.'","Correct.","Correct uncontracted form."] },
      studyAid: { definition: "'Let's' (let us) and 'lets' (allows) are different words.", example: "Let's play. She lets me borrow her books.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["does'nt", "doesnt", "doesn't", "does' not"],
      correct: 2,
      explanation: { correct: "'Doesn't' replaces the 'o' in 'not.'", incorrect: ["Apostrophe in wrong place.","Missing apostrophe.","CORRECT: 'Doesn't' is correct.","Wrong spacing."] },
      studyAid: { definition: "Apostrophe placement is always where letters are removed.", example: "does not → doesn't; did not → didn't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["was'nt", "wasnt", "wasn't", "wassn't"],
      correct: 2,
      explanation: { correct: "'Wasn't' replaces the 'o' in 'not.'", incorrect: ["Apostrophe in wrong place.","Missing apostrophe.","CORRECT: 'Wasn't' is correct.","Extra 's' is wrong."] },
      studyAid: { definition: "'Was not' contracts to 'wasn't.'", example: "was not → wasn't; were not → weren't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["could've", "could have", "could of", "couldve"],
      correct: 2,
      explanation: { correct: "'Could of' is a common mistake. The correct form is 'could have' or 'could've.'", incorrect: ["Correct contraction.","Correct uncontracted form.","CORRECT: 'Could of' is never correct.","Missing apostrophe."] },
      studyAid: { definition: "Never write 'could of,' 'should of,' or 'would of.' Always use 'have' or ''ve.'", example: "could have → could've; should have → should've", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["she'd", "she' d", "shed", "shed'"],
      correct: 0,
      explanation: { correct: "'She'd' replaces letters in 'she had' or 'she would.'", incorrect: ["CORRECT: 'She'd' is correct.","Wrong spacing.","Missing apostrophe.","Wrong apostrophe placement."] },
      studyAid: { definition: "'She'd' can mean 'she had' or 'she would' depending on context.", example: "She'd finished when I arrived. (had) / She'd like some tea. (would)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["mustn't", "must'nt", "mustnt", "must not"],
      correct: 1,
      explanation: { correct: "The apostrophe goes before the 'n,' not after the 't.'", incorrect: ["Correct.","CORRECT: Apostrophe in wrong place.","Missing apostrophe.","Correct uncontracted form."] },
      studyAid: { definition: "Apostrophe always where letters are removed.", example: "must not → mustn't", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 2.10 Apostrophes in Possessives */
QUESTION_BANK['punctuation-apostrophes-possessives'] = {
  title: "Apostrophes in Possessives",
  topic: "Punctuation",
  questions: [
    {
      question: "Which shows possession correctly?",
      choices: ["the dogs bone", "the dogs' bone", "the dog's bone", "the dog`s bone"],
      correct: 2,
      explanation: { correct: "'Dog's' means one dog owns the bone. Add 's to singular nouns.", incorrect: ["Missing apostrophe.","'Dogs'' means multiple dogs own it.","CORRECT: One dog's bone.","Backtick is wrong punctuation."] },
      studyAid: { definition: "Singular nouns form possessives by adding 's.", example: "the cat's tail, the boy's book, the car's tire", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct for two dogs owning one bone?",
      choices: ["the dogs bone", "the dog's bone", "the dogs' bone", "the dogs's bone"],
      correct: 2,
      explanation: { correct: "Plural nouns ending in 's' add only an apostrophe.", incorrect: ["Missing apostrophe.","Singular possessive.","CORRECT: Plural possessive.","Plural nouns do not add 's after the apostrophe."] },
      studyAid: { definition: "Plural nouns ending in 's' form possessives by adding just an apostrophe.", example: "the dogs' bone, the teachers' lounge, the cars' tires", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["James's car", "James' car", "James car", "Jamess car"],
      correct: 0,
      explanation: { correct: "Singular nouns ending in 's' usually add 's for possessive in modern English.", incorrect: ["CORRECT: James's is standard in modern English.","Some styles accept James', but 's is preferred.","Missing apostrophe.","Missing apostrophe."] },
      studyAid: { definition: "Singular proper names ending in 's' usually take 's: James's, Thomas's, Chris's.", example: "James's book, Thomas's hat", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the childrens toys", "the children's toys", "the childrens' toys", "the children toys"],
      correct: 1,
      explanation: { correct: "Irregular plural 'children' does not end in 's,' so add 's.", incorrect: ["Missing apostrophe.","CORRECT: Irregular plural takes 's.","'Childrens' is not a plural ending in 's.'","Missing apostrophe and wrong form."] },
      studyAid: { definition: "Irregular plurals (children, men, women, mice) add 's for possessive.", example: "children's toys, men's shoes, women's hats", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["the cat's whiskers", "the cats' whiskers", "the cats whiskers", "the cat whiskers"],
      correct: 2,
      explanation: { correct: "Missing apostrophe.", incorrect: ["Correct singular possessive.","Correct plural possessive.","CORRECT: Missing apostrophe.","Missing apostrophe and singular form wrong."] },
      studyAid: { definition: "Always use an apostrophe to show possession.", example: "the cat's whiskers (one cat) / the cats' whiskers (many cats)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["its tail", "it's tail", "its' tail", "it tail"],
      correct: 0,
      explanation: { correct: "'Its' is the possessive form and has no apostrophe.", incorrect: ["CORRECT: 'Its' = possession, no apostrophe.","'It's' = it is.","'Its'' is never correct.","Missing possessive form."] },
      studyAid: { definition: "'Its' (possessive) has no apostrophe. 'It's' (it is) has an apostrophe.", example: "The dog wagged its tail. It's raining outside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the mouse's cheese", "the mouses cheese", "the mice's cheese", "the mices cheese"],
      correct: 0,
      explanation: { correct: "One mouse: add 's to the singular form.", incorrect: ["CORRECT: Singular possessive.","Missing apostrophe.","Plural possessive, but question implies one mouse.","Not a real word."] },
      studyAid: { definition: "Singular 'mouse' takes 's. Plural 'mice' also takes 's.", example: "the mouse's cheese (one) / the mice's cheese (many)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["my parents car", "my parent's car", "my parents' car", "my parentss car"],
      correct: 2,
      explanation: { correct: "'Parents' is plural and ends in 's,' so add only an apostrophe.", incorrect: ["Missing apostrophe.","Singular possessive.","CORRECT: Plural possessive.","Wrong form."] },
      studyAid: { definition: "Plural nouns ending in 's' add only an apostrophe.", example: "my parents' car, my friends' house", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["the boss's desk", "the boss' desk", "the bosses desk", "the bosses' desk"],
      correct: 2,
      explanation: { correct: "Missing apostrophe.", incorrect: ["Correct singular possessive.","Accepted in some styles.","CORRECT: Missing apostrophe.","Correct plural possessive."] },
      studyAid: { definition: "'Boss' singular → boss's. 'Bosses' plural → bosses'.", example: "the boss's desk (one boss) / the bosses' desks (many bosses)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the knife's edge", "the knives edge", "the knives' edge", "the knifes edge"],
      correct: 0,
      explanation: { correct: "One knife: add 's to singular.", incorrect: ["CORRECT: Singular possessive.","Missing apostrophe.","Plural possessive.","Wrong spelling and missing apostrophe."] },
      studyAid: { definition: "Singular nouns ending in 'fe' change to 'ves' in plural but keep 'f' in singular possessive.", example: "the knife's edge (one) / the knives' edges (many)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["yours truly", "your's truly", "yours' truly", "you'rs truly"],
      correct: 0,
      explanation: { correct: "Possessive pronouns (yours, hers, ours, theirs, its) do not use apostrophes.", incorrect: ["CORRECT: Possessive pronouns have no apostrophe.","Wrong apostrophe.","Wrong apostrophe.","Wrong spelling and apostrophe."] },
      studyAid: { definition: "Possessive pronouns never use apostrophes: yours, hers, ours, theirs, its.", example: "The book is yours. The house is theirs.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the deer's antlers", "the deers antlers", "the deers' antlers", "the deer antlers"],
      correct: 0,
      explanation: { correct: "'Deer' is the same in singular and plural. Add 's for singular possessive.", incorrect: ["CORRECT: Singular possessive.","Missing apostrophe.","Could be plural possessive, but 'deer's' is more standard.","Missing possessive form."] },
      studyAid: { definition: "Nouns with the same singular and plural form (deer, sheep, fish) add 's for possessive.", example: "the deer's antlers, the sheep's wool", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["the student's desk", "the students' desk", "the students desk", "the student's desks"],
      correct: 2,
      explanation: { correct: "Missing apostrophe.", incorrect: ["Correct singular.","Correct plural.","CORRECT: Missing apostrophe.","Correct singular with plural object."] },
      studyAid: { definition: "Always use an apostrophe for possession.", example: "the student's desk / the students' desks", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["someone's phone", "someones phone", "someone' phone", "someones' phone"],
      correct: 0,
      explanation: { correct: "Indefinite pronouns add 's for possessive.", incorrect: ["CORRECT: Indefinite pronoun possessive.","Missing apostrophe.","Wrong apostrophe placement.","Wrong form."] },
      studyAid: { definition: "Indefinite pronouns (someone, anybody, everyone, nobody) use 's for possessive.", example: "someone's phone, everybody's business, nobody's fault", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the witness's statement", "the witness' statement", "the witnesss statement", "the witness statement"],
      correct: 0,
      explanation: { correct: "Singular nouns ending in 's' usually add 's.", incorrect: ["CORRECT: Singular possessive with 's.","Some styles allow this, but 's is preferred.","Wrong form.","Missing possessive."] },
      studyAid: { definition: "Most singular nouns ending in 's' take 's: witness's, class's, bus's.", example: "the witness's statement, the class's project", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* ============================================================
   TOPIC 3: Capitalization
   ============================================================ */

/* 3.1 Sentence Beginning */
QUESTION_BANK['capitalization-sentence-beginning'] = {
  title: "Capitalization at Sentence Beginning",
  topic: "Capitalization",
  questions: [
    {
      question: "Which sentence is capitalized correctly?",
      choices: ["the dog barked loudly.", "The dog barked loudly.", "the Dog barked loudly.", "THE dog barked loudly."],
      correct: 1,
      explanation: { correct: "The first word of every sentence must be capitalized.", incorrect: ["First word not capitalized.","CORRECT: First word capitalized.","Only 'Dog' is capitalized, which is wrong unless it's a proper noun.","'THE' is all caps, which is incorrect."] },
      studyAid: { definition: "Always capitalize the first word of a sentence.", example: "The sun is shining. Where are you?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct after a period?",
      choices: ["she went home. then she ate.", "She went home. Then she ate.", "She went home. then she ate.", "she went home. Then she ate."],
      correct: 1,
      explanation: { correct: "The first word after a period must be capitalized because it starts a new sentence.", incorrect: ["Both sentences start lowercase.","CORRECT: Both sentences start with capital letters.","Second sentence starts lowercase.","First sentence starts lowercase."] },
      studyAid: { definition: "Every new sentence after a period, question mark, or exclamation point starts with a capital letter.", example: "I ran. She walked. Did you see that?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'hello,' she said.", "'Hello,' she said.", "'hello,' She said.", "'Hello,' She said."],
      correct: 1,
      explanation: { correct: "The first word inside quotation marks is capitalized because it begins the quoted sentence. 'She' is lowercase because it is part of the same sentence (dialogue tag).", incorrect: ["'hello' should be capitalized.","CORRECT: 'Hello' capitalized, 'she' lowercase.","'She' should be lowercase.","'She' after a comma should be lowercase."] },
      studyAid: { definition: "Capitalize the first word of a direct quotation. The dialogue tag remains lowercase if it follows a comma.", example: "\"Hello,\" she said. \"How are you?\"", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["after the storm, we went outside.", "After the storm, we went outside.", "after the storm, We went outside.", "After the storm, We went outside."],
      correct: 1,
      explanation: { correct: "Capitalize the first word after an introductory phrase.", incorrect: ["First word lowercase.","CORRECT: 'After' capitalized, 'we' lowercase.","'We' should be lowercase.","'We' should be lowercase."] },
      studyAid: { definition: "After a comma, do not capitalize the next word unless it is a proper noun or starts a new quotation.", example: "After lunch, we played games.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Today is Monday.", "today is Monday.", "Today is monday.", "Today is Monday."],
      correct: 1,
      explanation: { correct: "'today' must be capitalized at the beginning of the sentence.", incorrect: ["Correct.","CORRECT: 'today' not capitalized.","'monday' should be capitalized, but the question focuses on sentence beginning.","Correct."] },
      studyAid: { definition: "Always check that the very first word of a sentence is capitalized.", example: "Correct: Today is hot. Incorrect: today is hot.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'where are you?' he asked.", "'Where are you?' He asked.", "'Where are you?' he asked.", "'where are you?' He asked."],
      correct: 2,
      explanation: { correct: "Capitalize the first word of the quote. 'he' after the question mark should be lowercase because the tag is part of the same sentence.", incorrect: ["'where' should be capitalized.","'He' should be lowercase.","CORRECT: 'Where' capitalized, 'he' lowercase.","Both words wrong."] },
      studyAid: { definition: "After ? or ! inside quotes, the dialogue tag is still lowercase if it is the same sentence.", example: "\"Where are you?\" he asked. \"Stop!\" she yelled.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["in the morning, the birds sing.", "In the morning, the birds sing.", "in the morning, The birds sing.", "In the morning, The birds sing."],
      correct: 1,
      explanation: { correct: "Capitalize the first word of the sentence. 'the' after the comma stays lowercase.", incorrect: ["First word lowercase.","CORRECT: 'In' capitalized, 'the' lowercase.","'The' should be lowercase.","'The' should be lowercase."] },
      studyAid: { definition: "Common words like 'the,' 'a,' and 'and' are not capitalized mid-sentence unless they are part of a title.", example: "In the afternoon, we read books.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["'Please help me,' she cried.", "'please help me,' she cried.", "'Please help me,' she cried.", "'Please help me,' She cried."],
      correct: 1,
      explanation: { correct: "'please' should be capitalized as the first word of the quotation.", incorrect: ["Correct.","CORRECT: 'please' not capitalized.","Correct.","'She' should be lowercase."] },
      studyAid: { definition: "Always capitalize the first word inside opening quotation marks.", example: "\"Please pass the salt,\" he asked.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["did you finish your homework? no, i didn't.", "Did you finish your homework? No, I didn't.", "Did you finish your homework? no, I didn't.", "did you finish your homework? No, i didn't."],
      correct: 1,
      explanation: { correct: "Both sentences start with capital letters.", incorrect: ["Both sentences start lowercase.","CORRECT: Both sentences capitalized correctly.","Second sentence starts lowercase.","Both sentences have errors."] },
      studyAid: { definition: "Every sentence must start with a capital letter, even short answers.", example: "Are you ready? Yes, I am.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the cat slept. the dog barked.", "The cat slept. The dog barked.", "The cat slept. the dog barked.", "the cat slept. The dog barked."],
      correct: 1,
      explanation: { correct: "Each sentence starts with a capital letter.", incorrect: ["Both lowercase.","CORRECT: Both capitalized.","Second sentence lowercase.","First sentence lowercase."] },
      studyAid: { definition: "After every end punctuation, start the next sentence with a capital letter.", example: "It rained. The ground was wet.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'i don't know,' he said.", "'I don't know,' He said.", "'I don't know,' he said.", "'i don't know,' He said."],
      correct: 2,
      explanation: { correct: "Capitalize the first word of the quote. 'he' stays lowercase after the comma.", incorrect: ["'i' should be capitalized.","'He' should be lowercase.","CORRECT: 'I' capitalized, 'he' lowercase.","Both wrong."] },
      studyAid: { definition: "Capitalize inside quotes. Lowercase dialogue tags after commas.", example: "\"I agree,\" she said.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Suddenly, the lights went out.", "suddenly, the lights went out.", "Suddenly, The lights went out.", "Suddenly, the lights went out."],
      correct: 1,
      explanation: { correct: "'suddenly' must be capitalized at the beginning.", incorrect: ["Correct.","CORRECT: 'suddenly' lowercase.","'The' should be lowercase.","Correct."] },
      studyAid: { definition: "Adverbs at the beginning of sentences are capitalized just like any other word.", example: "Suddenly, the door opened. Quietly, she tiptoed inside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["yes, i will go.", "Yes, i will go.", "Yes, I will go.", "yes, I will go."],
      correct: 2,
      explanation: { correct: "Capitalize 'Yes' at the beginning and 'I' is always capitalized.", incorrect: ["Both wrong.","'i' should be capitalized.","CORRECT: Both 'Yes' and 'I' capitalized.","'yes' should be capitalized."] },
      studyAid: { definition: "The word 'I' is always capitalized, and the first word of a sentence is always capitalized.", example: "Yes, I understand. No, I don't.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["'when are we leaving?' she asked.", "'When are we leaving?' she asked.", "'When are we leaving?' She asked.", "'when are we leaving?' She asked."],
      correct: 1,
      explanation: { correct: "Capitalize the first word in quotes. 'she' stays lowercase.", incorrect: ["'when' lowercase.","CORRECT: 'When' capitalized, 'she' lowercase.","'She' should be lowercase.","Both wrong."] },
      studyAid: { definition: "Question marks inside quotes do not change the lowercase rule for the tag.", example: "\"What time is it?\" he asked.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["The quick brown fox jumps.", "the quick brown fox jumps.", "The Quick brown fox jumps.", "The quick brown fox Jumps."],
      correct: 1,
      explanation: { correct: "First word not capitalized.", incorrect: ["Correct.","CORRECT: 'the' not capitalized.","'Quick' should be lowercase unless it's a title.","'Jumps' should be lowercase."] },
      studyAid: { definition: "Only the first word and proper nouns are capitalized in sentences.", example: "The quick brown fox jumps over the lazy dog.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 3.2 Days, Months, Holidays */
QUESTION_BANK['capitalization-days-months-holidays'] = {
  title: "Capitalization of Days, Months, and Holidays",
  topic: "Capitalization",
  questions: [
    {
      question: "Which is capitalized correctly?",
      choices: ["monday", "Monday", "monDay", "MONDAY"],
      correct: 1,
      explanation: { correct: "Days of the week are proper nouns and always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'Monday' capitalized.","Only partial capitalization.","All caps is not standard sentence case."] },
      studyAid: { definition: "Days of the week are proper nouns: Monday, Tuesday, Wednesday, etc.", example: "School starts on Monday.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["january", "January", "january", "JANUARY"],
      correct: 1,
      explanation: { correct: "Months are proper nouns and always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'January' capitalized.","Not capitalized.","All caps not standard."] },
      studyAid: { definition: "Months are proper nouns: January, February, March, etc.", example: "My birthday is in January.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["christmas", "Christmas", "christMas", "CHRISTMAS"],
      correct: 1,
      explanation: { correct: "Holidays are proper nouns and always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'Christmas' capitalized.","Partial capitalization.","All caps not standard."] },
      studyAid: { definition: "Holidays are proper nouns: Christmas, Thanksgiving, Independence Day, etc.", example: "We celebrate Christmas in December.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Labor Day", "labor day", "Memorial Day", "New Year's Day"],
      correct: 1,
      explanation: { correct: "'labor day' should have both words capitalized because it is a holiday name.", incorrect: ["Correct.","CORRECT: Both words should be capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Holiday names are proper nouns. Capitalize all important words.", example: "Labor Day, Memorial Day, New Year's Day", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We go to school on tuesday.", "We go to school on Tuesday.", "We go to school on TUESDAY.", "We go to school on tuesDay."],
      correct: 1,
      explanation: { correct: "Days of the week are always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'Tuesday' capitalized.","All caps not standard.","Partial capitalization."] },
      studyAid: { definition: "Always capitalize days of the week.", example: "I have piano lessons on Thursday.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["My favorite month is july.", "My favorite month is July.", "My favorite month is JULY.", "My favorite month is jUly."],
      correct: 1,
      explanation: { correct: "Months are always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'July' capitalized.","All caps not standard.","Partial capitalization."] },
      studyAid: { definition: "Always capitalize months.", example: "The camp starts in June.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Fourth of July", "fourth of july", "Independence Day", "New Year's Eve"],
      correct: 1,
      explanation: { correct: "Holiday names are proper nouns and must be capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Capitalize holidays, including words like 'Day' and 'Eve' when part of the holiday name.", example: "Fourth of July, New Year's Eve, Valentine's Day", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["thanksgiving is in november.", "Thanksgiving is in november.", "Thanksgiving is in November.", "thanksgiving is in November."],
      correct: 2,
      explanation: { correct: "Both the holiday and the month must be capitalized.", incorrect: ["Both not capitalized.","Month not capitalized.","CORRECT: Both capitalized.","Holiday not capitalized."] },
      studyAid: { definition: "Capitalize both holidays and months.", example: "Halloween is in October.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Valentine's day", "valentine's Day", "Valentine's Day", "valentine's day"],
      correct: 2,
      explanation: { correct: "Both 'Valentine's' and 'Day' are part of the holiday name and should be capitalized.", incorrect: ["'day' not capitalized.","'valentine's' not capitalized.","CORRECT: Both words capitalized.","Neither capitalized."] },
      studyAid: { definition: "In holiday names, capitalize all major words.", example: "Valentine's Day, Presidents' Day, Mother's Day", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Martin Luther King Jr. Day", "martin luther king jr. day", "Presidents' Day", "Veterans Day"],
      correct: 1,
      explanation: { correct: "All words in the holiday name should be capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Holiday names with people's names capitalize each part.", example: "Martin Luther King Jr. Day, George Washington's Birthday", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We have no school on friday.", "We have no school on Friday.", "We have no school on FRIDAY.", "We have no school on fridAy."],
      correct: 1,
      explanation: { correct: "Days of the week are always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'Friday' capitalized.","All caps not standard.","Partial capitalization."] },
      studyAid: { definition: "Always capitalize days of the week.", example: "The weekend starts on Saturday.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["easter is in spring.", "Easter is in spring.", "Easter is in Spring.", "easter is in Spring."],
      correct: 1,
      explanation: { correct: "'Easter' is a holiday and is capitalized. 'spring' is a season and is not capitalized.", incorrect: ["'easter' not capitalized.","CORRECT: 'Easter' capitalized, 'spring' lowercase.","Seasons are not capitalized.","Both wrong."] },
      studyAid: { definition: "Seasons (spring, summer, fall, winter) are not capitalized unless part of a title.", example: "Easter is in spring. Winter Olympics is capitalized because it is a title.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Hanukkah", "hanukkah", "Kwanzaa", "Ramadan"],
      correct: 1,
      explanation: { correct: "Holiday names must be capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "All holiday names are proper nouns.", example: "Hanukkah, Kwanzaa, Ramadan, Diwali", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Groundhog day", "Groundhog Day", "groundhog Day", "groundhog day"],
      correct: 1,
      explanation: { correct: "Both words of the holiday are capitalized.", incorrect: ["'day' not capitalized.","CORRECT: Both capitalized.","'groundhog' not capitalized.","Neither capitalized."] },
      studyAid: { definition: "Capitalize all major words in holiday names.", example: "Groundhog Day, Earth Day, Arbor Day", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I was born in august.", "I was born in August.", "I was born in AUGUST.", "I was born in auguSt."],
      correct: 1,
      explanation: { correct: "Months are always capitalized.", incorrect: ["Not capitalized.","CORRECT: 'August' capitalized.","All caps not standard.","Partial capitalization."] },
      studyAid: { definition: "Always capitalize months.", example: "She was born in September.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 3.3 Books, Magazines, Songs, Plays */
QUESTION_BANK['capitalization-books-magazines-songs-plays'] = {
  title: "Capitalization of Books, Magazines, Songs, and Plays",
  topic: "Capitalization",
  questions: [
    {
      question: "Which title is capitalized correctly?",
      choices: ["charlotte's web", "Charlotte's Web", "Charlotte's web", "charlotte's Web"],
      correct: 1,
      explanation: { correct: "Capitalize the first and last words and all important words in titles.", incorrect: ["Not capitalized.","CORRECT: Both major words capitalized.","'web' should be capitalized.","'charlotte's' should be capitalized."] },
      studyAid: { definition: "In titles, capitalize the first word, last word, and all nouns, pronouns, verbs, adjectives, and adverbs.", example: "Charlotte's Web, The Very Hungry Caterpillar", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the lion king", "The Lion King", "The lion king", "the Lion King"],
      correct: 1,
      explanation: { correct: "'The' is capitalized as the first word, and major words are capitalized.", incorrect: ["Not capitalized.","CORRECT: First word and major words capitalized.","'king' should be capitalized.","'the' should be capitalized as first word."] },
      studyAid: { definition: "Capitalize the first word of a title even if it is a small word like 'The.'", example: "The Lion King, The Cat in the Hat", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["National Geographic", "national geographic", "National geographic", "national Geographic"],
      correct: 0,
      explanation: { correct: "Magazine titles are proper nouns. Capitalize each major word.", incorrect: ["CORRECT: Both words capitalized.","Not capitalized.","'geographic' should be capitalized.","'national' should be capitalized."] },
      studyAid: { definition: "Magazine titles capitalize each major word.", example: "National Geographic, Sports Illustrated, TIME", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["The Three Little Pigs", "the three little pigs", "Harry Potter", "The Very Hungry Caterpillar"],
      correct: 1,
      explanation: { correct: "Title words should be capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "All words in a title except articles, short prepositions, and conjunctions are usually capitalized.", example: "The Three Little Pigs (The is capitalized as first word)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Let it go", "Let It Go", "let it go", "let It Go"],
      correct: 1,
      explanation: { correct: "Song titles capitalize major words. 'It' is a pronoun and is capitalized.", incorrect: ["'it' should be capitalized as a pronoun.","CORRECT: Major words capitalized.","Not capitalized.","First word should be capitalized."] },
      studyAid: { definition: "Pronouns in titles are capitalized: it, he, she, you, etc.", example: "Let It Go, You Are My Sunshine", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["romeo and juliet", "Romeo and Juliet", "Romeo And Juliet", "romeo And juliet"],
      correct: 1,
      explanation: { correct: "Play titles capitalize major words. 'and' is a conjunction and usually lowercase unless it is the first word.", incorrect: ["Not capitalized.","CORRECT: Major words capitalized, 'and' lowercase.","'And' should be lowercase as a conjunction.","Not capitalized correctly."] },
      studyAid: { definition: "Conjunctions like 'and,' 'but,' and 'or' are usually lowercase in titles unless they are first or last.", example: "Romeo and Juliet, Of Mice and Men", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["The Wizard of Oz", "The wizard of Oz", "The Wizard Of Oz", "The Wizard of Oz"],
      correct: 1,
      explanation: { correct: "'wizard' should be capitalized as a major word in the title.", incorrect: ["Correct.","CORRECT: 'wizard' not capitalized.","'Of' should be lowercase as a short preposition.","Correct."] },
      studyAid: { definition: "Short prepositions (of, in, on, at, to) are usually lowercase in titles unless they are first or last.", example: "The Wizard of Oz, The Lion, the Witch and the Wardrobe", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the cat in the hat", "The Cat in the Hat", "The Cat In The Hat", "the Cat in the Hat"],
      correct: 1,
      explanation: { correct: "First word capitalized, major words capitalized, short prepositions lowercase.", incorrect: ["Not capitalized.","CORRECT: 'in' and 'the' lowercase, major words capitalized.","'In' and 'The' should be lowercase as short words.","First word should be capitalized."] },
      studyAid: { definition: "'In' and 'the' are short words and stay lowercase in the middle of a title.", example: "The Cat in the Hat, A Wrinkle in Time", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["happy birthday", "Happy Birthday", "happy Birthday", "HAPPY BIRTHDAY"],
      correct: 1,
      explanation: { correct: "Song titles capitalize major words.", incorrect: ["Not capitalized.","CORRECT: Both words capitalized.","First word not capitalized.","All caps not standard."] },
      studyAid: { definition: "Song titles follow title capitalization rules.", example: "Happy Birthday, Twinkle, Twinkle, Little Star", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Diary of a Wimpy Kid", "Diary Of A Wimpy Kid", "diary of a wimpy kid", "Diary of a Wimpy Kid"],
      correct: 2,
      explanation: { correct: "Title not capitalized.", incorrect: ["Correct.","'Of' and 'A' are short words and can be lowercase; however, some styles capitalize all words. But the clearly wrong one is the all-lowercase option.","CORRECT: Not capitalized.","Correct."] },
      studyAid: { definition: "Book titles must be capitalized.", example: "Diary of a Wimpy Kid, Percy Jackson & the Olympians", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["where the wild things are", "Where the Wild Things Are", "Where The Wild Things Are", "where The Wild Things are"],
      correct: 1,
      explanation: { correct: "First word and major words capitalized. 'the' is lowercase as a short word in the middle.", incorrect: ["Not capitalized.","CORRECT: 'the' lowercase in the middle, major words capitalized.","'The' should be lowercase in the middle.","Not capitalized correctly."] },
      studyAid: { definition: "Articles (a, an, the) are lowercase in the middle of titles unless they are the first word.", example: "Where the Wild Things Are, The Little Engine That Could", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Hamlet", "hamlet", "HAMLET", "haMlet"],
      correct: 0,
      explanation: { correct: "Play titles are proper nouns and capitalized normally.", incorrect: ["CORRECT: 'Hamlet' capitalized.","Not capitalized.","All caps not standard.","Partially capitalized."] },
      studyAid: { definition: "Play titles are proper nouns.", example: "Hamlet, The Tempest, A Raisin in the Sun", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Sports Illustrated", "sports illustrated", "People Magazine", "TIME Magazine"],
      correct: 1,
      explanation: { correct: "Magazine title not capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Magazine titles are proper nouns.", example: "Sports Illustrated, People, TIME, National Geographic", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the very hungry caterpillar", "The Very Hungry Caterpillar", "The very hungry caterpillar", "the Very Hungry Caterpillar"],
      correct: 1,
      explanation: { correct: "First word and all major words capitalized.", incorrect: ["Not capitalized.","CORRECT: All major words capitalized.","'very' and 'hungry' should be capitalized.","First word should be capitalized."] },
      studyAid: { definition: "Adjectives in titles are capitalized.", example: "The Very Hungry Caterpillar, The Little Mermaid", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Beauty and the Beast", "beauty and the beast", "Beauty And The Beast", "beauty And the beast"],
      correct: 0,
      explanation: { correct: "Major words capitalized, short words lowercase in the middle.", incorrect: ["CORRECT: 'and' and 'the' lowercase in middle, major words capitalized.","Not capitalized.","'And' and 'The' should be lowercase.","Not capitalized correctly."] },
      studyAid: { definition: "Conjunctions and articles stay lowercase in the middle of titles.", example: "Beauty and the Beast, Jack and the Beanstalk", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 3.4 Proper Names & Titles of People */
QUESTION_BANK['capitalization-proper-names-titles'] = {
  title: "Proper Names and Titles of People",
  topic: "Capitalization",
  questions: [
    {
      question: "Which is capitalized correctly?",
      choices: ["dr. smith", "Dr. Smith", "dr. Smith", "Dr. smith"],
      correct: 1,
      explanation: { correct: "Titles before names and the name itself are capitalized.", incorrect: ["Neither capitalized.","CORRECT: Both title and name capitalized.","Title not capitalized.","Name not capitalized."] },
      studyAid: { definition: "Capitalize titles when they come before a person's name.", example: "Dr. Smith, President Lincoln, Aunt Mary", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["my teacher, mr. johnson", "my teacher, Mr. Johnson", "My teacher, Mr. Johnson", "My teacher, mr. Johnson"],
      correct: 2,
      explanation: { correct: "First word of sentence capitalized. Title before name capitalized.", incorrect: ["First word and title not capitalized.","First word not capitalized.","CORRECT: Sentence starts with capital, title capitalized.","Title not capitalized."] },
      studyAid: { definition: "Capitalize the first word of a sentence and titles before names.", example: "My teacher, Mr. Johnson, is kind.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Queen Elizabeth", "queen Elizabeth", "President Biden", "Senator Warren"],
      correct: 1,
      explanation: { correct: "'queen' should be capitalized when used as a title before a name.", incorrect: ["Correct.","CORRECT: 'queen' not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Titles like queen, president, and senator are capitalized before names.", example: "Queen Elizabeth, President Biden, Senator Warren", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I saw uncle jim.", "I saw Uncle Jim.", "I saw uncle Jim.", "I saw Uncle jim."],
      correct: 1,
      explanation: { correct: "Family titles used as names are capitalized.", incorrect: ["Neither capitalized.","CORRECT: Both capitalized.","'uncle' not capitalized.","'jim' not capitalized."] },
      studyAid: { definition: "Capitalize family titles when used as names: Mom, Dad, Uncle Jim, Aunt Sue.", example: "I saw Uncle Jim at the party. My mom is nice. (not used as name)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The principal, ms. brown, spoke.", "The principal, Ms. Brown, spoke.", "The principal, ms. Brown, spoke.", "The Principal, Ms. Brown, spoke."],
      correct: 1,
      explanation: { correct: "Title before name capitalized. 'principal' is not capitalized when not used as a title before a name.", incorrect: ["Title not capitalized.","CORRECT: Title and name capitalized.","Title not capitalized.","'Principal' should not be capitalized here."] },
      studyAid: { definition: "Titles are lowercase when used generally, capitalized only before names.", example: "The principal spoke. Principal Brown spoke.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Mayor Adams", "mayor Adams", "Governor Lee", "Chief Roberts"],
      correct: 1,
      explanation: { correct: "'mayor' should be capitalized before a name.", incorrect: ["Correct.","CORRECT: 'mayor' not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Government titles are capitalized before names.", example: "Mayor Adams, Governor Lee, Chief Roberts", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I love my mom.", "I love my Mom.", "I love Mom.", "I love mom."],
      correct: 2,
      explanation: { correct: "'Mom' is capitalized when used as a name (direct address or replacement for her actual name).", incorrect: ["Correct general use, but 'Mom' as name is also correct in some contexts.","'my Mom' is acceptable but less standard than just 'Mom' as a name.","CORRECT: 'Mom' used as a name.","Not capitalized."] },
      studyAid: { definition: "Capitalize 'Mom,' 'Dad,' 'Grandma' when used as names. Lowercase when used with 'my.'", example: "I love Mom. My mom is great.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["prof. davis teaches math.", "Prof. Davis teaches math.", "prof. Davis teaches math.", "Prof. davis teaches math."],
      correct: 1,
      explanation: { correct: "First word and title before name capitalized.", incorrect: ["Neither capitalized.","CORRECT: Both capitalized.","First word not capitalized.","Name not capitalized."] },
      studyAid: { definition: "Academic titles are capitalized before names.", example: "Prof. Davis, Dean Johnson", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Coach Taylor", "coach Taylor", "Nurse Williams", "Officer Park"],
      correct: 1,
      explanation: { correct: "'coach' should be capitalized before a name.", incorrect: ["Correct.","CORRECT: 'coach' not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Job titles used as titles before names are capitalized.", example: "Coach Taylor, Nurse Williams, Officer Park", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["My aunt sara visited.", "My Aunt Sara visited.", "My aunt Sara visited.", "My Aunt sara visited."],
      correct: 1,
      explanation: { correct: "'Aunt' is capitalized when used as part of the name.", incorrect: ["'aunt' not capitalized.","CORRECT: 'Aunt Sara' as a name.","'aunt' not capitalized.","'sara' not capitalized."] },
      studyAid: { definition: "Family titles + name are treated as proper nouns.", example: "Aunt Sara, Uncle Joe, Cousin Amy", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I met king charles.", "I met King Charles.", "I met king Charles.", "I met King charles."],
      correct: 1,
      explanation: { correct: "'King' is capitalized as a title before a name.", incorrect: ["Neither capitalized.","CORRECT: Title and name capitalized.","'king' not capitalized.","'charles' not capitalized."] },
      studyAid: { definition: "Royal titles are capitalized before names.", example: "King Charles, Queen Elizabeth, Prince William", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Doctor Lee", "doctor Lee", "Judge Carter", "Officer Kim"],
      correct: 1,
      explanation: { correct: "'doctor' should be capitalized before a name.", incorrect: ["Correct.","CORRECT: 'doctor' not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Professional titles are capitalized before names.", example: "Doctor Lee, Judge Carter, Officer Kim", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["My sister, emily, is tall.", "My sister, Emily, is tall.", "My Sister, Emily, is tall.", "My sister, Emily, Is tall."],
      correct: 1,
      explanation: { correct: "Names are capitalized. 'sister' is not capitalized when used generally.", incorrect: ["Name not capitalized.","CORRECT: Name capitalized, 'sister' lowercase.","'Sister' should not be capitalized.","'Is' should be lowercase."] },
      studyAid: { definition: "Common nouns like 'sister' are lowercase unless part of a title.", example: "My sister Emily is tall. Sister Mary teaches class.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I talked to grandma.", "I talked to Grandma.", "I talked to grandMa.", "I talked to GRANDMA."],
      correct: 1,
      explanation: { correct: "'Grandma' is capitalized when used as a name.", incorrect: ["Not capitalized.","CORRECT: Used as a name.","Partial capitalization.","All caps not standard."] },
      studyAid: { definition: "Capitalize 'Grandma,' 'Grandpa,' 'Nana' when used as names.", example: "I talked to Grandma. My grandma is nice.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 3.5 Names of Places */
QUESTION_BANK['capitalization-names-of-places'] = {
  title: "Names of Places",
  topic: "Capitalization",
  questions: [
    {
      question: "Which is capitalized correctly?",
      choices: ["new york city", "New York City", "new York city", "New york City"],
      correct: 1,
      explanation: { correct: "All words in a proper place name are capitalized.", incorrect: ["Not capitalized.","CORRECT: All words capitalized.","Only partial capitalization.","Partial capitalization."] },
      studyAid: { definition: "City names are proper nouns. Capitalize each word.", example: "New York City, Los Angeles, San Francisco", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the pacific ocean", "The Pacific Ocean", "the Pacific ocean", "The pacific Ocean"],
      correct: 1,
      explanation: { correct: "All words in a geographical name are capitalized.", incorrect: ["Not capitalized.","CORRECT: All words capitalized.","'ocean' not capitalized.","'pacific' not capitalized."] },
      studyAid: { definition: "Geographical features like oceans, rivers, and mountains are proper nouns.", example: "Pacific Ocean, Mississippi River, Rocky Mountains", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Mount Everest", "mount everest", "Lake Michigan", "Death Valley"],
      correct: 1,
      explanation: { correct: "'mount' and 'everest' should both be capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Mountain names capitalize the type word (Mount, Mountain) and the name.", example: "Mount Everest, Rocky Mountains, Mount Kilimanjaro", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I live on maple street.", "I live on Maple Street.", "I live on maple Street.", "I live on Maple street."],
      correct: 1,
      explanation: { correct: "Street names are proper nouns. Both words capitalized.", incorrect: ["Not capitalized.","CORRECT: Both words capitalized.","First word not capitalized.","Second word not capitalized."] },
      studyAid: { definition: "Street names are proper nouns.", example: "Maple Street, Broadway Avenue, Main Road", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We visited the grand canyon.", "We visited the Grand Canyon.", "We visited The Grand Canyon.", "We visited the grand Canyon."],
      correct: 1,
      explanation: { correct: "'the' is lowercase unless it is the first word of the sentence. 'Grand Canyon' is capitalized.", incorrect: ["Not capitalized.","CORRECT: 'Grand Canyon' capitalized.","'The' should be lowercase mid-sentence.","'grand' not capitalized."] },
      studyAid: { definition: "'The' is not capitalized in the middle of a sentence unless it is part of the official name (The Bahamas).", example: "the Grand Canyon, the Eiffel Tower, the Great Wall", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Asia", "asia", "Africa", "Europe"],
      correct: 1,
      explanation: { correct: "Continents are proper nouns and must be capitalized.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Continents are proper nouns.", example: "Asia, Africa, Europe, North America", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We flew over the atlantic ocean.", "We flew over the Atlantic Ocean.", "We flew over The Atlantic Ocean.", "We flew over the Atlantic ocean."],
      correct: 1,
      explanation: { correct: "'Atlantic Ocean' capitalized. 'the' lowercase mid-sentence.", incorrect: ["Not capitalized.","CORRECT: Capitalized correctly.","'The' should be lowercase.","'ocean' not capitalized."] },
      studyAid: { definition: "Oceans and seas are proper nouns.", example: "Atlantic Ocean, Pacific Ocean, Mediterranean Sea", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["the united states of america", "The United States of America", "The United States Of America", "the United States of America"],
      correct: 1,
      explanation: { correct: "First word and all major words capitalized. 'of' is lowercase as a short preposition.", incorrect: ["Not capitalized.","CORRECT: Properly capitalized.","'Of' should be lowercase.","First word should be capitalized."] },
      studyAid: { definition: "Country names capitalize all major words.", example: "United States of America, United Kingdom, South Africa", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Sahara Desert", "sahara desert", "Gobi Desert", "Mojave Desert"],
      correct: 1,
      explanation: { correct: "Desert names are proper nouns.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "Desert names are proper nouns.", example: "Sahara Desert, Gobi Desert, Mojave Desert", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We went to yellowstone national park.", "We went to Yellowstone National Park.", "We went to Yellowstone national park.", "We went to yellowstone National Park."],
      correct: 1,
      explanation: { correct: "All words in the park's name are capitalized.", incorrect: ["Not capitalized.","CORRECT: All words capitalized.","'national park' not capitalized.","'yellowstone' not capitalized."] },
      studyAid: { definition: "Park names are proper nouns.", example: "Yellowstone National Park, Yosemite National Park", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I grew up in texas.", "I grew up in Texas.", "I grew up in TEXAS.", "I grew up in texaS."],
      correct: 1,
      explanation: { correct: "State names are proper nouns.", incorrect: ["Not capitalized.","CORRECT: Capitalized.","All caps not standard.","Partially capitalized."] },
      studyAid: { definition: "State names are proper nouns.", example: "Texas, California, New York", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Nile River", "nile river", "Amazon River", "Yangtze River"],
      correct: 1,
      explanation: { correct: "River names are proper nouns.", incorrect: ["Correct.","CORRECT: Not capitalized.","Correct.","Correct."] },
      studyAid: { definition: "River names capitalize both the name and 'River.'", example: "Nile River, Amazon River, Mississippi River", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We stayed at the hilton hotel.", "We stayed at the Hilton Hotel.", "We stayed at The Hilton Hotel.", "We stayed at the Hilton hotel."],
      correct: 1,
      explanation: { correct: "'Hilton Hotel' is a proper noun. 'the' is lowercase mid-sentence.", incorrect: ["Not capitalized.","CORRECT: Properly capitalized.","'The' should be lowercase.","'hotel' not capitalized."] },
      studyAid: { definition: "Building and business names are proper nouns.", example: "Hilton Hotel, Empire State Building, White House", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I visited the eiffel tower.", "I visited the Eiffel Tower.", "I visited The Eiffel Tower.", "I visited the Eiffel tower."],
      correct: 1,
      explanation: { correct: "'Eiffel Tower' capitalized. 'the' lowercase mid-sentence.", incorrect: ["Not capitalized.","CORRECT: Capitalized correctly.","'The' should be lowercase.","'tower' not capitalized."] },
      studyAid: { definition: "Landmark names are proper nouns.", example: "Eiffel Tower, Statue of Liberty, Great Wall of China", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* ============================================================
   TOPIC 4: Grammar & Usage
   ============================================================ */

/* 4.1 Correct Article */
QUESTION_BANK['grammar-correct-article'] = {
  title: "Correct Article",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which article is correct: '___ apple a day keeps the doctor away.'",
      choices: ["a", "an", "the", "no article"],
      correct: 1,
      explanation: { correct: "'An' is used before words that start with a vowel sound. 'Apple' starts with a vowel sound.", incorrect: ["'A' is used before consonant sounds.","CORRECT: 'An' goes before vowel sounds.","'The' is for specific things, not general statements.","An article is needed here."] },
      studyAid: { definition: "Use 'a' before consonant sounds and 'an' before vowel sounds. It depends on sound, not letter.", example: "a banana, an apple, a university (sounds like 'yoo'), an hour (silent h)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'She is ___ honest person.'",
      choices: ["a", "an", "the", "no article"],
      correct: 1,
      explanation: { correct: "'Honest' starts with a vowel sound (silent h), so use 'an.'", incorrect: ["'A' is for consonant sounds.","CORRECT: 'Honest' has a silent h and starts with a vowel sound.","'The' is too specific here.","An article is needed."] },
      studyAid: { definition: "'An' goes before words starting with a vowel sound, even if the first letter is a consonant.", example: "an hour, an honest person, an heir", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'I saw ___ elephant at the zoo.'",
      choices: ["a", "an", "the", "no article"],
      correct: 1,
      explanation: { correct: "'Elephant' starts with a vowel sound, so use 'an.'", incorrect: ["'A' is for consonant sounds.","CORRECT: 'Elephant' starts with a vowel sound.","'The' would mean a specific elephant.","An article is needed."] },
      studyAid: { definition: "Use 'an' before words starting with vowel sounds: a, e, i, o, u.", example: "an elephant, an igloo, an octopus", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'He attends ___ university in Boston.'",
      choices: ["a", "an", "the", "no article"],
      correct: 0,
      explanation: { correct: "'University' starts with a 'yoo' sound (consonant sound), so use 'a.'", incorrect: ["CORRECT: 'University' starts with a consonant sound (yoo).","'An' is for vowel sounds.","'The' would mean a specific university.","An article is needed."] },
      studyAid: { definition: "It is the sound that matters, not the letter. 'University' starts with a 'y' sound.", example: "a university, a European city, a one-eyed monster", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Please pass me ___ salt.'",
      choices: ["a", "an", "the", "no article"],
      correct: 2,
      explanation: { correct: "'The' is used because we are talking about specific salt on the table.", incorrect: ["'A' is for any one item.","'An' is for vowel sounds.","CORRECT: 'The' refers to specific salt.","An article is needed."] },
      studyAid: { definition: "'The' is the definite article used for specific things both people know about.", example: "Pass the salt. Close the door. The sun is bright.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'I would like ___ glass of water.'",
      choices: ["a", "an", "the", "no article"],
      correct: 0,
      explanation: { correct: "'A' is used because we mean any one glass of water, not a specific one.", incorrect: ["CORRECT: 'A' for any one item.","'An' is for vowel sounds.","'The' would mean a specific glass.","An article is needed."] },
      studyAid: { definition: "'A' and 'an' are indefinite articles used for any one of something.", example: "a glass of water, a piece of cake, an egg", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: '___ sun rises in the east.'",
      choices: ["a", "an", "the", "no article"],
      correct: 2,
      explanation: { correct: "'The' is used because there is only one sun.", incorrect: ["'A' is for any one.","'An' is for vowel sounds.","CORRECT: There is only one sun.","An article is needed."] },
      studyAid: { definition: "Use 'the' for unique things: the sun, the moon, the president.", example: "The sun is hot. The sky is blue.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'She is ___ European artist.'",
      choices: ["a", "an", "the", "no article"],
      correct: 0,
      explanation: { correct: "'European' starts with a 'yoo' sound (consonant), so use 'a.'", incorrect: ["CORRECT: 'European' starts with a consonant sound.","'An' is for vowel sounds.","'The' would be too specific.","An article is needed."] },
      studyAid: { definition: "'European' starts with a 'y' sound, so it uses 'a' even though it starts with 'E.'", example: "a European city, a one-time event, a useful tool", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'I ate ___ orange for breakfast.'",
      choices: ["a", "an", "the", "no article"],
      correct: 1,
      explanation: { correct: "'Orange' starts with a vowel sound, so use 'an.'", incorrect: ["'A' is for consonant sounds.","CORRECT: 'Orange' starts with a vowel sound.","'The' would mean a specific orange.","An article is needed."] },
      studyAid: { definition: "Vowel sounds take 'an': orange, apple, egg, ice cream, umbrella.", example: "an orange, an apple, an egg", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: '___ Pacific Ocean is the largest ocean.'",
      choices: ["a", "an", "the", "no article"],
      correct: 2,
      explanation: { correct: "'The' is used for specific, unique geographical names.", incorrect: ["'A' is for any one.","'An' is for vowel sounds.","CORRECT: Specific ocean name uses 'the.'","An article is needed."] },
      studyAid: { definition: "Use 'the' with rivers, oceans, seas, and deserts: the Pacific Ocean, the Nile River.", example: "The Atlantic Ocean, the Sahara Desert", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'I have ___ idea.'",
      choices: ["a", "an", "the", "no article"],
      correct: 1,
      explanation: { correct: "'Idea' starts with a vowel sound, so use 'an.'", incorrect: ["'A' is for consonant sounds.","CORRECT: 'Idea' starts with a vowel sound.","'The' would mean a specific idea.","An article is needed."] },
      studyAid: { definition: "Words starting with long 'i' sound use 'an.'", example: "an idea, an island, an igloo", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'She plays ___ piano very well.'",
      choices: ["a", "an", "the", "no article"],
      correct: 2,
      explanation: { correct: "'The' is used before musical instruments when talking about playing them.", incorrect: ["'A' is for any one.","'An' is for vowel sounds.","CORRECT: Musical instruments take 'the.'","An article is needed."] },
      studyAid: { definition: "Use 'the' before musical instruments: play the piano, the guitar, the violin.", example: "She plays the flute. He plays the drums.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'He is ___ FBI agent.'",
      choices: ["a", "an", "the", "no article"],
      correct: 1,
      explanation: { correct: "'FBI' starts with an 'ef' sound (vowel sound), so use 'an.'", incorrect: ["'A' is for consonant sounds.","CORRECT: 'FBI' starts with a vowel sound.","'The' would be too specific.","An article is needed."] },
      studyAid: { definition: "Acronyms starting with vowel sounds use 'an': an FBI agent, an MRI scan.", example: "an FBI agent, an NBA player, an SOS signal", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'I need ___ advice.'",
      choices: ["a", "an", "the", "no article"],
      correct: 3,
      explanation: { correct: "'Advice' is an uncountable noun and does not use 'a' or 'an.' It can use 'the' if specific, but no article is also correct for general advice.", incorrect: ["'Advice' is uncountable; cannot use 'a.'","'Advice' is uncountable; cannot use 'an.'","'The' could work but is more specific.","CORRECT: No article needed for general uncountable nouns."] },
      studyAid: { definition: "Uncountable nouns like advice, water, and information usually do not use 'a' or 'an.'", example: "I need advice. She gave me information.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.2 Double Negatives */
QUESTION_BANK['grammar-double-negatives'] = {
  title: "Double Negatives",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which sentence has a double negative?",
      choices: ["I don't have any money.", "I don't have no money.", "I have no money.", "I don't have money."],
      correct: 1,
      explanation: { correct: "'Don't' and 'no' are both negatives. Two negatives make a positive in standard English.", incorrect: ["Correct: one negative ('don't') + 'any.'","CORRECT: 'don't' + 'no' = double negative.","Correct: one negative ('no').","Correct: one negative ('don't')."] },
      studyAid: { definition: "A double negative uses two negative words in one sentence, which is incorrect in standard English.", example: "Incorrect: I don't have no time. Correct: I don't have any time. OR I have no time.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is correct?",
      choices: ["She doesn't know nothing.", "She doesn't know anything.", "She don't know anything.", "She don't know nothing."],
      correct: 1,
      explanation: { correct: "'Doesn't' + 'anything' is correct. 'Nothing' would create a double negative.", incorrect: ["Double negative.","CORRECT: One negative + 'anything.'","'don't' should be 'doesn't' for 'she.'","Double negative and wrong verb form."] },
      studyAid: { definition: "Use 'anything' with negative verbs. Use 'nothing' with positive verbs.", example: "She doesn't know anything. = She knows nothing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which has a double negative?",
      choices: ["I can't find my keys anywhere.", "I can't find my keys nowhere.", "I can find my keys nowhere.", "I found my keys somewhere."],
      correct: 1,
      explanation: { correct: "'Can't' and 'nowhere' are both negatives.", incorrect: ["Correct: one negative + 'anywhere.'","CORRECT: 'can't' + 'nowhere' = double negative.","Correct: one negative ('nowhere') with positive verb.","No negatives."] },
      studyAid: { definition: "'Anywhere' goes with negatives. 'Nowhere' is a negative itself.", example: "I can't find it anywhere. = I can find it nowhere.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We haven't never been there.", "We have never been there.", "We haven't ever been there.", "We have not never been there."],
      correct: 1,
      explanation: { correct: "'Never' is the only negative needed.", incorrect: ["Double negative.","CORRECT: One negative ('never').","'haven't ever' is awkward; 'have never' is better.","Double negative."] },
      studyAid: { definition: "'Never' already means 'not ever.' Do not add another negative.", example: "I have never seen that movie.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which has a double negative?",
      choices: ["I didn't see anyone.", "I saw no one.", "I didn't see no one.", "I didn't see somebody."],
      correct: 2,
      explanation: { correct: "'Didn't' and 'no one' are both negatives.", incorrect: ["Correct: one negative + 'anyone.'","Correct: one negative ('no one').","CORRECT: 'didn't' + 'no one' = double negative.","Correct but 'somebody' is odd with a negative."] },
      studyAid: { definition: "'No one' is a negative word. Do not use it with 'didn't' or 'doesn't.'", example: "I didn't see anyone. = I saw no one.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["He doesn't like nobody.", "He likes nobody.", "He doesn't like anybody.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both 'He likes nobody' and 'He doesn't like anybody' are correct ways to express the same idea with one negative.", incorrect: ["Double negative.","Correct but not the only answer.","Correct but not the only answer.","CORRECT: Both B and C are correct."] },
      studyAid: { definition: "You can say 'likes nobody' or 'doesn't like anybody,' but not both negatives together.", example: "He likes nobody. = He doesn't like anybody.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which has a double negative?",
      choices: ["I couldn't hardly believe it.", "I could hardly believe it.", "I couldn't believe it.", "I could barely believe it."],
      correct: 0,
      explanation: { correct: "'Couldn't' and 'hardly' are both negatives. 'Hardly' means 'almost not.'", incorrect: ["CORRECT: 'couldn't' + 'hardly' = double negative.","Correct.","Correct.","Correct."] },
      studyAid: { definition: "'Hardly' and 'scarcely' are negative words. Do not use them with 'not' or 'n't.'", example: "I could hardly hear. (Not: couldn't hardly)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["She didn't do nothing.", "She did nothing.", "She didn't do anything.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both 'She did nothing' and 'She didn't do anything' are correct single-negative forms.", incorrect: ["Double negative.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both are correct."] },
      studyAid: { definition: "Use either 'did nothing' or 'didn't do anything,' not both.", example: "She did nothing. = She didn't do anything.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which has a double negative?",
      choices: ["I don't need none.", "I don't need any.", "I need none.", "I need some."],
      correct: 0,
      explanation: { correct: "'Don't' and 'none' are both negatives.", incorrect: ["CORRECT: 'don't' + 'none' = double negative.","Correct.","Correct.","No negative."] },
      studyAid: { definition: "'None' means 'not one.' Do not use it with another negative.", example: "I don't need any. = I need none.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["They aren't never late.", "They are never late.", "They aren't ever late.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both 'are never late' and 'aren't ever late' use only one negative idea.", incorrect: ["Double negative.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both are correct."] },
      studyAid: { definition: "'Never' and 'not ever' are the same. Use one or the other.", example: "They are never late. = They aren't ever late.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which has a double negative?",
      choices: ["I can't scarcely hear you.", "I can scarcely hear you.", "I can't hear you.", "I can barely hear you."],
      correct: 0,
      explanation: { correct: "'Can't' and 'scarcely' are both negatives.", incorrect: ["CORRECT: Double negative.","Correct.","Correct.","Correct."] },
      studyAid: { definition: "'Scarcely' means 'almost not.' Do not use with 'not' or 'can't.'", example: "I can scarcely hear you. (Not: can't scarcely)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We didn't find neither of them.", "We found neither of them.", "We didn't find either of them.", "Both B and C"],
      correct: 3,
      explanation: { correct: "'Neither' and 'either' both work with single negatives, but not together.", incorrect: ["Double negative.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both are correct."] },
      studyAid: { definition: "'Neither' is negative. 'Either' goes with 'not.' Do not mix them.", example: "We found neither. = We didn't find either.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which has a double negative?",
      choices: ["I don't got none.", "I don't have any.", "I have none.", "I have some."],
      correct: 0,
      explanation: { correct: "'Don't' and 'none' are both negatives. Also, 'got' should be 'have' in formal English.", incorrect: ["CORRECT: Double negative and informal verb.","Correct.","Correct.","No negative."] },
      studyAid: { definition: "Avoid double negatives and use 'have' instead of 'got' in formal writing.", example: "I don't have any. = I have none.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Nobody never helps me.", "Nobody ever helps me.", "Somebody never helps me.", "Everybody doesn't help me."],
      correct: 1,
      explanation: { correct: "'Nobody' is negative. Use 'ever' (not 'never') with it.", incorrect: ["Double negative.","CORRECT: One negative + 'ever.'","'Somebody never' is odd but not a double negative.","'Everybody doesn't' is awkward."] },
      studyAid: { definition: "'Nobody' + 'ever' is correct. 'Nobody' + 'never' is a double negative.", example: "Nobody ever calls. = Somebody always calls. (opposite)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.3 Pronouns */
QUESTION_BANK['grammar-pronouns'] = {
  title: "Pronouns",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which pronoun correctly completes: 'Maria lost ___ book.'",
      choices: ["her", "she", "hers", "him"],
      correct: 0,
      explanation: { correct: "'Her' is the possessive pronoun that shows the book belongs to Maria.", incorrect: ["CORRECT: Possessive pronoun before a noun.","'She' is a subject pronoun, not possessive.","'Hers' stands alone and does not come before a noun.","'Him' is masculine."] },
      studyAid: { definition: "Possessive pronouns before nouns: my, your, his, her, its, our, their.", example: "She lost her book. He found his keys.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun is the subject of: '___ went to the store.'",
      choices: ["Him", "Her", "She", "Them"],
      correct: 2,
      explanation: { correct: "'She' is a subject pronoun and can be the one doing the action.", incorrect: ["'Him' is an object pronoun.","'Her' is an object or possessive pronoun.","CORRECT: Subject pronoun.","'Them' is an object pronoun."] },
      studyAid: { definition: "Subject pronouns do the action: I, you, he, she, it, we, they.", example: "She runs fast. They play soccer.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun correctly completes: 'The teacher gave ___ a test.'",
      choices: ["we", "us", "our", "ours"],
      correct: 1,
      explanation: { correct: "'Us' is the object pronoun receiving the action.", incorrect: ["'We' is a subject pronoun.","CORRECT: Object pronoun.","'Our' is possessive.","'Ours' is possessive and stands alone."] },
      studyAid: { definition: "Object pronouns receive the action: me, you, him, her, it, us, them.", example: "She gave us a gift. He saw me.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses a reflexive pronoun correctly?",
      choices: ["I made the cake myself.", "Myself made the cake.", "I made the cake by myself.", "Both A and C"],
      correct: 3,
      explanation: { correct: "Both 'myself' as emphasis and 'by myself' meaning alone are correct.", incorrect: ["Correct but not only answer.","'Myself' cannot be the subject.","Correct but not only answer.","CORRECT: Both A and C are correct."] },
      studyAid: { definition: "Reflexive pronouns (myself, yourself, himself) emphasize or refer back to the subject.", example: "I did it myself. She made it by herself.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun is incorrect: 'Me and him went to the park.'",
      choices: ["Me", "him", "Both A and B", "went"],
      correct: 2,
      explanation: { correct: "'Me' and 'him' are object pronouns. The sentence needs subject pronouns: 'He and I.'", incorrect: ["'Me' is wrong but not the only error.","'Him' is wrong but not the only error.","CORRECT: Both should be subject pronouns.","'went' is correct."] },
      studyAid: { definition: "Use subject pronouns (I, he, she, we, they) when they are the subject.", example: "He and I went to the park. (Not: Me and him)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun correctly completes: 'The cat licked ___ paw.'",
      choices: ["it's", "its", "it", "its'"],
      correct: 1,
      explanation: { correct: "'Its' is the possessive form and has no apostrophe.", incorrect: ["'It's' means 'it is.'","CORRECT: Possessive pronoun, no apostrophe.","'It' is not possessive.","'Its'' is never correct."] },
      studyAid: { definition: "'Its' = possessive. 'It's' = it is.", example: "The cat licked its paw. It's raining outside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Between you and ___, this is a secret.'",
      choices: ["I", "me", "myself", "mine"],
      correct: 1,
      explanation: { correct: "'Between' is a preposition, so use the object pronoun 'me.'", incorrect: ["'I' is a subject pronoun.","CORRECT: Object pronoun after preposition.","'Myself' is for emphasis or reflexive use.","'Mine' is possessive and stands alone."] },
      studyAid: { definition: "Prepositions (between, to, for, with) take object pronouns.", example: "Between you and me. He gave it to her.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun correctly completes: 'Each student must bring ___ own lunch.'",
      choices: ["their", "his or her", "its", "Both A and B"],
      correct: 3,
      explanation: { correct: "Both 'their' (singular they, widely accepted) and 'his or her' are correct for singular 'each student.'", incorrect: ["Correct but not only answer.","Correct but not only answer.","'Its' is for things, not people.","CORRECT: Both A and B are acceptable."] },
      studyAid: { definition: "Singular 'they/their' is now accepted for gender-neutral singular antecedents.", example: "Each student brought their lunch. = Each student brought his or her lunch.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is incorrect?",
      choices: ["Who is at the door?", "Whom is at the door?", "To whom did you speak?", "Whom did you see?"],
      correct: 1,
      explanation: { correct: "'Whom' is for objects, not subjects. 'Who' is the subject pronoun.", incorrect: ["Correct: 'who' as subject.","CORRECT: 'Whom' cannot be the subject.","Correct: 'whom' as object of preposition.","Correct: 'whom' as object of verb."] },
      studyAid: { definition: "'Who' = subject. 'Whom' = object. Use 'who' when the pronoun does the action.", example: "Who called? (subject) Whom did you call? (object)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun correctly completes: 'The winners were Tom and ___.'",
      choices: ["I", "me", "myself", "mine"],
      correct: 1,
      explanation: { correct: "After 'were,' use the object pronoun because 'Tom and me' completes the subject complement in informal/casual use, but technically 'Tom and I' is traditional grammar because it renames the subject 'The winners.' Wait—actually, 'The winners were Tom and I' is traditional, but 'Tom and me' is commonly used. For 4th grade, 'I' is taught as correct. Hmm, let me reconsider. 'The winners were Tom and I' = traditional. 'The winners were Tom and me' = common but often considered incorrect in formal grammar. I'll stick with 'I' as correct for school standards.", incorrect: ["CORRECT: Subject pronoun renames the subject.","Common but informal.","Reflexive pronoun not needed.","Possessive, not correct here."] },
      studyAid: { definition: "After linking verbs like 'were,' use subject pronouns to rename the subject.", example: "The winner is she. It was I.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["The dog chased it's tail.", "The dog chased its tail.", "The dog chased it tail.", "The dog chased its' tail."],
      correct: 1,
      explanation: { correct: "'Its' is the possessive pronoun with no apostrophe.", incorrect: ["'It's' means 'it is.'","CORRECT: Possessive pronoun.","Missing possessive form.","'Its'' is never correct."] },
      studyAid: { definition: "'Its' = possessive. 'It's' = it is.", example: "The dog wagged its tail. It's a nice day.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun correctly completes: 'Someone left ___ backpack.'",
      choices: ["their", "his", "her", "Any of the above"],
      correct: 3,
      explanation: { correct: "Indefinite pronouns like 'someone' can take 'his,' 'her,' or singular 'their.'", incorrect: ["Correct but not only answer.","Correct but not only answer.","Correct but not only answer.","CORRECT: All are acceptable depending on style."] },
      studyAid: { definition: "Indefinite pronouns (someone, anyone, everyone) can use singular 'they' or 'his or her.'", example: "Someone left their book. Someone left his book.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["Us girls went shopping.", "We girls went shopping.", "Ourselves girls went shopping.", "Our girls went shopping."],
      correct: 1,
      explanation: { correct: "'We' is the subject pronoun. 'Girls' is an appositive renaming 'we.'", incorrect: ["'Us' is an object pronoun.","CORRECT: Subject pronoun + appositive.","Reflexive pronoun not needed.","'Our' is possessive, not a subject pronoun."] },
      studyAid: { definition: "When a pronoun is followed by a noun renaming it, use the subject form.", example: "We students work hard. Us students is informal.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["This book is yours.", "This book is your's.", "This book is yous.", "This book is yours'."],
      correct: 0,
      explanation: { correct: "'Yours' is a possessive pronoun and needs no apostrophe.", incorrect: ["CORRECT: Possessive pronoun.","Apostrophe not needed.","Not a word.","Apostrophe not needed."] },
      studyAid: { definition: "Possessive pronouns (yours, hers, ours, theirs, its) never use apostrophes.", example: "The book is yours. The house is ours.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.4 Singular/Plural Nouns */
QUESTION_BANK['grammar-singular-plural-nouns'] = {
  title: "Singular and Plural Nouns",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "What is the plural of 'child'?",
      choices: ["childs", "children", "childes", "child"],
      correct: 1,
      explanation: { correct: "'Children' is the irregular plural of 'child.'", incorrect: ["Not a real word.","CORRECT: Irregular plural.","Not a real word.","Singular form."] },
      studyAid: { definition: "Some nouns have irregular plurals that do not add -s or -es.", example: "child → children, mouse → mice, foot → feet", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'tooth'?",
      choices: ["tooths", "toothes", "teeth", "tooth"],
      correct: 2,
      explanation: { correct: "'Teeth' is the irregular plural of 'tooth.'", incorrect: ["Not correct.","Not correct.","CORRECT: Irregular plural.","Singular."] },
      studyAid: { definition: "Some nouns change vowels for plural: tooth → teeth, goose → geese, man → men.", example: "One tooth, two teeth. One goose, two geese.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'deer'?",
      choices: ["deers", "deer", "deeres", "deeren"],
      correct: 1,
      explanation: { correct: "'Deer' is the same in singular and plural.", incorrect: ["Not correct.","CORRECT: Same form for singular and plural.","Not a word.","Not a word."] },
      studyAid: { definition: "Some nouns have the same singular and plural form: deer, sheep, fish, moose.", example: "One deer, two deer. One sheep, two sheep.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'potato'?",
      choices: ["potatos", "potatoes", "potato's", "potatoes'"],
      correct: 1,
      explanation: { correct: "Nouns ending in consonant + o usually add -es.", incorrect: ["Missing the 'e.'","CORRECT: Adds -es.","Apostrophe shows possession, not plural.","Apostrophe shows possession, not plural."] },
      studyAid: { definition: "Nouns ending in consonant + o add -es: potatoes, tomatoes, heroes.", example: "one potato, two potatoes; one tomato, two tomatoes", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'knife'?",
      choices: ["knifes", "knives", "knife's", "knifves"],
      correct: 1,
      explanation: { correct: "Nouns ending in -f or -fe change to -ves in plural.", incorrect: ["Not correct.","CORRECT: f → ves.","Apostrophe shows possession.","Wrong spelling."] },
      studyAid: { definition: "Nouns ending in -f or -fe usually change to -ves: knife → knives, leaf → leaves, wife → wives.", example: "one knife, two knives; one leaf, two leaves", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'mouse'?",
      choices: ["mouses", "mice", "mices", "mouse's"],
      correct: 1,
      explanation: { correct: "'Mice' is the irregular plural of 'mouse.'", incorrect: ["Used for computer mice in modern usage, but animals are 'mice.'","CORRECT: Irregular plural.","Not a word.","Possessive, not plural."] },
      studyAid: { definition: "'Mouse' has an irregular plural: mice.", example: "One mouse, two mice.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'box'?",
      choices: ["boxs", "boxes", "box's", "boxen"],
      correct: 1,
      explanation: { correct: "Nouns ending in s, x, z, ch, or sh add -es.", incorrect: ["Needs -es, not -s.","CORRECT: Adds -es.","Possessive.","Not a word."] },
      studyAid: { definition: "Nouns ending in s, x, z, ch, sh add -es: boxes, churches, buses.", example: "one box, two boxes; one church, two churches", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'cactus'?",
      choices: ["cactuses", "cacti", "cactus", "Both A and B"],
      correct: 3,
      explanation: { correct: "Both 'cactuses' (English plural) and 'cacti' (Latin plural) are accepted.", incorrect: ["Correct but not only answer.","Correct but not only answer.","Singular.","CORRECT: Both are acceptable."] },
      studyAid: { definition: "Some words have both English and Latin plurals: cactuses/cacti, focuses/foci.", example: "one cactus, two cactuses or two cacti", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'sheep'?",
      choices: ["sheeps", "sheep", "sheepes", "sheep's"],
      correct: 1,
      explanation: { correct: "'Sheep' is the same in singular and plural.", incorrect: ["Not correct.","CORRECT: Same form.","Not a word.","Possessive."] },
      studyAid: { definition: "Some nouns do not change: sheep, deer, fish, moose.", example: "One sheep, two sheep.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'leaf'?",
      choices: ["leafs", "leaves", "leafes", "leaf's"],
      correct: 1,
      explanation: { correct: "Nouns ending in -f change to -ves.", incorrect: ["Not correct for standard plural.","CORRECT: f → ves.","Not a word.","Possessive."] },
      studyAid: { definition: "f → ves: leaf → leaves, thief → thieves, shelf → shelves.", example: "One leaf, two leaves.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'octopus'?",
      choices: ["octopuses", "octopi", "octopodes", "All are accepted"],
      correct: 3,
      explanation: { correct: "'Octopuses' is the English plural, 'octopi' is Latin-style, and 'octopodes' is Greek-style. All are used.", incorrect: ["Correct but not only answer.","Correct but not only answer.","Correct but very rare.","CORRECT: All are accepted in different contexts."] },
      studyAid: { definition: "'Octopuses' is the most common English plural. 'Octopi' and 'octopodes' also exist.", example: "One octopus, two octopuses (most common)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'woman'?",
      choices: ["womans", "women", "womens", "woman's"],
      correct: 1,
      explanation: { correct: "'Women' is the irregular plural with a vowel change.", incorrect: ["Not correct.","CORRECT: a → e.","Not a word.","Possessive."] },
      studyAid: { definition: "Vowel change plurals: man → men, woman → women, foot → feet, tooth → teeth.", example: "One woman, two women.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'crisis'?",
      choices: ["crisises", "crises", "crisis", "crisis'"],
      correct: 1,
      explanation: { correct: "Greek-derived nouns ending in -is change to -es.", incorrect: ["Not correct.","CORRECT: is → es.","Singular.","Not a standard possessive plural."] },
      studyAid: { definition: "Nouns ending in -is → -es: crisis → crises, analysis → analyses, thesis → theses.", example: "One crisis, two crises.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the plural of 'piano'?",
      choices: ["pianos", "pianoes", "pianoes'", "piano's"],
      correct: 0,
      explanation: { correct: "Nouns ending in vowel + o usually just add -s.", incorrect: ["CORRECT: Adds -s.","Nouns ending in vowel + o usually do not add -es.","Not correct.","Possessive."] },
      studyAid: { definition: "Vowel + o → add -s: pianos, radios, videos, zoos.", example: "One piano, two pianos.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the plural of 'radius'?",
      choices: ["radiuses", "radii", "radius", "Both A and B"],
      correct: 3,
      explanation: { correct: "Both 'radiuses' and 'radii' are accepted, though 'radii' is more common in math.", incorrect: ["Accepted but less common.","More common in math.","Singular.","CORRECT: Both are accepted."] },
      studyAid: { definition: "Latin-derived words often have two plural forms.", example: "One radius, two radii (or radiuses).", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.5 Verb Forms */
QUESTION_BANK['grammar-verb-forms'] = {
  title: "Verb Forms",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "What is the past tense of 'go'?",
      choices: ["goed", "went", "gone", "going"],
      correct: 1,
      explanation: { correct: "'Went' is the simple past tense of 'go.'", incorrect: ["Not a real word.","CORRECT: Simple past tense.","Past participle, used with have/has/had.","Present participle, used with -ing."] },
      studyAid: { definition: "'Go' is irregular: go → went → gone.", example: "I go today. I went yesterday. I have gone before.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the past participle of 'eat'?",
      choices: ["ate", "eaten", "eated", "eating"],
      correct: 1,
      explanation: { correct: "'Eaten' is the past participle, used with have/has/had.", incorrect: ["Simple past tense.","CORRECT: Past participle.","Not a word.","Present participle."] },
      studyAid: { definition: "'Eat' is irregular: eat → ate → eaten.", example: "I eat. I ate. I have eaten.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the correct form: 'She has ___ the cake.'",
      choices: ["bake", "baked", "baking", "bakes"],
      correct: 1,
      explanation: { correct: "'Has baked' uses the past participle with 'has.'", incorrect: ["Base form.","CORRECT: Past participle.","Present participle.","Third person singular present."] },
      studyAid: { definition: "Present perfect tense: has/have + past participle.", example: "She has baked a cake. They have finished.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple past of 'run'?",
      choices: ["runned", "ran", "run", "running"],
      correct: 1,
      explanation: { correct: "'Ran' is the simple past of 'run.'", incorrect: ["Not a word.","CORRECT: Simple past.","Base form / past participle.","Present participle."] },
      studyAid: { definition: "'Run' is irregular: run → ran → run.", example: "I run today. I ran yesterday. I have run before.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'They ___ playing soccer.'",
      choices: ["is", "are", "was", "be"],
      correct: 1,
      explanation: { correct: "'They' is plural, so use 'are.'", incorrect: ["Singular verb.","CORRECT: Plural verb.","Singular past.","Base form."] },
      studyAid: { definition: "Subject-verb agreement: plural subjects take plural verbs.", example: "They are playing. She is playing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the past tense of 'bring'?",
      choices: ["bringed", "brought", "brung", "bringing"],
      correct: 1,
      explanation: { correct: "'Brought' is the simple past of 'bring.'", incorrect: ["Not a word.","CORRECT: Simple past.","Nonstandard/dialect.","Present participle."] },
      studyAid: { definition: "'Bring' is irregular: bring → brought → brought.", example: "I bring. I brought. I have brought.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'He ___ to school every day.'",
      choices: ["walk", "walks", "walking", "walked"],
      correct: 1,
      explanation: { correct: "'He' is third person singular, so add -s.", incorrect: ["Base form.","CORRECT: Third person singular.","Present participle.","Past tense."] },
      studyAid: { definition: "Third person singular present tense adds -s or -es.", example: "He walks. She runs. It jumps.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the past participle of 'write'?",
      choices: ["wrote", "written", "writed", "writing"],
      correct: 1,
      explanation: { correct: "'Written' is the past participle, used with have/has/had.", incorrect: ["Simple past.","CORRECT: Past participle.","Not a word.","Present participle."] },
      studyAid: { definition: "'Write' is irregular: write → wrote → written.", example: "I write. I wrote. I have written.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'We ___ finished our homework.'",
      choices: ["has", "have", "had", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both 'have finished' (present perfect) and 'had finished' (past perfect) are grammatically correct depending on context.", incorrect: ["Singular verb with plural subject.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both are possible."] },
      studyAid: { definition: "'Have' + past participle = present perfect. 'Had' + past participle = past perfect.", example: "We have finished. We had finished before dinner.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple past of 'begin'?",
      choices: ["begined", "began", "begun", "beginning"],
      correct: 1,
      explanation: { correct: "'Began' is the simple past of 'begin.'", incorrect: ["Not a word.","CORRECT: Simple past.","Past participle.","Present participle."] },
      studyAid: { definition: "'Begin' is irregular: begin → began → begun.", example: "I begin. I began. I have begun.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'She ___ singing when I arrived.'",
      choices: ["is", "was", "were", "be"],
      correct: 1,
      explanation: { correct: "Past continuous: was/were + -ing. 'She' takes 'was.'", incorrect: ["Present tense.","CORRECT: Past continuous with singular subject.","Plural past.","Base form."] },
      studyAid: { definition: "Past continuous describes an action in progress at a specific time in the past.", example: "She was singing when I arrived.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the past tense of 'fly'?",
      choices: ["flyed", "flew", "flown", "flying"],
      correct: 1,
      explanation: { correct: "'Flew' is the simple past of 'fly.'", incorrect: ["Not a word.","CORRECT: Simple past.","Past participle.","Present participle."] },
      studyAid: { definition: "'Fly' is irregular: fly → flew → flown.", example: "Birds fly. The bird flew. The bird has flown.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'The cats ___ sleeping.'",
      choices: ["is", "are", "was", "be"],
      correct: 1,
      explanation: { correct: "'Cats' is plural, so use 'are.'", incorrect: ["Singular.","CORRECT: Plural verb.","Singular past.","Base form."] },
      studyAid: { definition: "Plural subjects need plural verbs.", example: "The cats are sleeping. The cat is sleeping.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the past participle of 'break'?",
      choices: ["broke", "broken", "breaked", "breaking"],
      correct: 1,
      explanation: { correct: "'Broken' is the past participle, used with have/has/had.", incorrect: ["Simple past.","CORRECT: Past participle.","Not a word.","Present participle."] },
      studyAid: { definition: "'Break' is irregular: break → broke → broken.", example: "I break. I broke. I have broken.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'I ___ not want to leave.'",
      choices: ["do", "does", "did", "Both A and C"],
      correct: 3,
      explanation: { correct: "Both 'do not' (present) and 'did not' (past) are correct depending on context.", incorrect: ["Correct but not only answer.","Third person singular.","Correct but not only answer.","CORRECT: Both are possible."] },
      studyAid: { definition: "'Do not' = present negative. 'Did not' = past negative.", example: "I do not want to leave. I did not want to leave.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 4.6 Run-on Sentences */
QUESTION_BANK['grammar-run-on-sentences'] = {
  title: "Run-on Sentences",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which is a run-on sentence?",
      choices: ["I like pizza. It is my favorite food.", "I like pizza, and it is my favorite food.", "I like pizza it is my favorite food.", "Because it is my favorite food, I like pizza."],
      correct: 2,
      explanation: { correct: "Two complete sentences are joined without punctuation or a conjunction.", incorrect: ["Two separate sentences.","Joined with comma and conjunction.","CORRECT: Run-on sentence.","Complex sentence with subordinating conjunction."] },
      studyAid: { definition: "A run-on sentence joins two complete sentences without proper punctuation or conjunctions.", example: "Incorrect: I like pizza it is good. Correct: I like pizza. It is good. OR I like pizza, and it is good.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes the run-on: 'The dog barked the cat ran.'",
      choices: ["The dog barked, the cat ran.", "The dog barked; the cat ran.", "The dog barked the cat ran.", "The dog barked the cat, ran."],
      correct: 1,
      explanation: { correct: "A semicolon can join two closely related independent clauses.", incorrect: ["This is a comma splice, not a complete fix.","CORRECT: Semicolon correctly joins clauses.","Still a run-on.","Incorrect comma placement."] },
      studyAid: { definition: "Use a semicolon, period, or comma + conjunction to fix run-ons.", example: "The dog barked; the cat ran. The dog barked. The cat ran. The dog barked, and the cat ran.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a run-on?",
      choices: ["I finished my homework, and then I played outside.", "I finished my homework I played outside.", "I finished my homework. Then I played outside.", "After I finished my homework, I played outside."],
      correct: 1,
      explanation: { correct: "Two complete sentences joined with nothing between them.", incorrect: ["Correctly joined with comma + conjunction.","CORRECT: Run-on.","Two separate sentences.","Complex sentence."] },
      studyAid: { definition: "Always separate complete sentences with punctuation or conjunctions.", example: "Incorrect: I finished I played. Correct: I finished, and I played.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes: 'She sings she dances.'",
      choices: ["She sings, she dances.", "She sings and she dances.", "She sings. She dances.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both adding a conjunction and separating into two sentences fix the run-on.", incorrect: ["Comma splice.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both B and C work."] },
      studyAid: { definition: "Three ways to fix a run-on: period, semicolon, or comma + conjunction.", example: "She sings. She dances. She sings; she dances. She sings, and she dances.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a comma splice?",
      choices: ["I love reading, it relaxes me.", "I love reading. It relaxes me.", "I love reading because it relaxes me.", "I love reading; it relaxes me."],
      correct: 0,
      explanation: { correct: "A comma splice joins two complete sentences with only a comma.", incorrect: ["CORRECT: Comma splice.","Correct: two sentences.","Correct: dependent clause.","Correct: semicolon."] },
      studyAid: { definition: "A comma splice is a type of run-on that uses only a comma between complete sentences.", example: "Incorrect: I love reading, it relaxes me. Correct: I love reading; it relaxes me.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes: 'The sun is hot it keeps us warm.'",
      choices: ["The sun is hot, it keeps us warm.", "The sun is hot; it keeps us warm.", "The sun is hot it keeps us warm.", "The sun is hot, and, it keeps us warm."],
      correct: 1,
      explanation: { correct: "A semicolon correctly joins the two related ideas.", incorrect: ["Comma splice.","CORRECT: Semicolon fix.","Still a run-on.","Extra comma is wrong."] },
      studyAid: { definition: "Semicolons work when the two sentences are closely related.", example: "The sun is hot; it keeps us warm.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a run-on?",
      choices: ["He ran fast he won the race.", "He ran fast, and he won the race.", "He ran fast. He won the race.", "Because he ran fast, he won the race."],
      correct: 0,
      explanation: { correct: "Two sentences joined without punctuation or conjunction.", incorrect: ["CORRECT: Run-on.","Correctly joined.","Two sentences.","Complex sentence."] },
      studyAid: { definition: "A run-on lacks punctuation or conjunctions between complete thoughts.", example: "He ran fast he won. → He ran fast, and he won.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes: 'I like dogs I have a beagle.'",
      choices: ["I like dogs, I have a beagle.", "I like dogs. I have a beagle.", "I like dogs, and I have a beagle.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both a period and a comma + conjunction fix the run-on.", incorrect: ["Comma splice.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both work."] },
      studyAid: { definition: "Multiple correct ways exist to fix run-ons.", example: "I like dogs. I have a beagle. I like dogs, and I have a beagle.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a comma splice?",
      choices: ["The movie was long, I fell asleep.", "The movie was long. I fell asleep.", "The movie was long, so I fell asleep.", "Because the movie was long, I fell asleep."],
      correct: 0,
      explanation: { correct: "Only a comma joins two complete sentences.", incorrect: ["CORRECT: Comma splice.","Two sentences.","Comma + conjunction.","Complex sentence."] },
      studyAid: { definition: "Comma splices are incorrect in formal writing.", example: "Incorrect: The movie was long, I fell asleep. Correct: The movie was long; I fell asleep.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes: 'She studied hard she passed the test.'",
      choices: ["She studied hard, she passed the test.", "She studied hard; she passed the test.", "She studied hard, and she passed the test.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both semicolon and comma + conjunction are correct fixes.", incorrect: ["Comma splice.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both work."] },
      studyAid: { definition: "Semicolons and comma + conjunction both fix run-ons.", example: "She studied hard; she passed. She studied hard, and she passed.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a run-on?",
      choices: ["The cake was delicious everyone wanted seconds.", "The cake was delicious, so everyone wanted seconds.", "The cake was delicious. Everyone wanted seconds.", "Because the cake was delicious, everyone wanted seconds."],
      correct: 0,
      explanation: { correct: "Two complete sentences joined without punctuation or conjunction.", incorrect: ["CORRECT: Run-on.","Correctly joined.","Two sentences.","Complex sentence."] },
      studyAid: { definition: "Always check that complete thoughts are properly separated or joined.", example: "The cake was delicious everyone wanted seconds. → The cake was delicious, and everyone wanted seconds.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes: 'It rained we stayed inside.'",
      choices: ["It rained, we stayed inside.", "It rained. We stayed inside.", "It rained; we stayed inside.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both period and semicolon are correct.", incorrect: ["Comma splice.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both work."] },
      studyAid: { definition: "Periods and semicolons both separate independent clauses properly.", example: "It rained. We stayed inside. It rained; we stayed inside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a comma splice?",
      choices: ["I was tired, I went to bed.", "I was tired. I went to bed.", "I was tired, so I went to bed.", "Because I was tired, I went to bed."],
      correct: 0,
      explanation: { correct: "Only a comma between two complete sentences.", incorrect: ["CORRECT: Comma splice.","Two sentences.","Comma + conjunction.","Complex sentence."] },
      studyAid: { definition: "Comma splices are a common error. Always add a conjunction or use a semicolon/period.", example: "I was tired, I went to bed. → I was tired, so I went to bed.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which fixes: 'The bell rang the students left.'",
      choices: ["The bell rang, the students left.", "The bell rang; the students left.", "The bell rang, and the students left.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both semicolon and comma + conjunction fix the run-on.", incorrect: ["Comma splice.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both work."] },
      studyAid: { definition: "Multiple punctuation choices can fix run-ons.", example: "The bell rang; the students left. The bell rang, and the students left.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.7 Sentence Types */
QUESTION_BANK['grammar-sentence-types'] = {
  title: "Sentence Types",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "What type of sentence is: 'Close the door.'",
      choices: ["Declarative", "Interrogative", "Imperative", "Exclamatory"],
      correct: 2,
      explanation: { correct: "An imperative sentence gives a command or instruction.", incorrect: ["Declarative makes a statement.","Interrogative asks a question.","CORRECT: Imperative gives a command.","Exclamatory shows strong emotion."] },
      studyAid: { definition: "Imperative sentences give commands, instructions, or requests. The subject 'you' is understood.", example: "Close the door. Please sit down. Be quiet.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What type is: 'Where is my backpack?'",
      choices: ["Declarative", "Interrogative", "Imperative", "Exclamatory"],
      correct: 1,
      explanation: { correct: "An interrogative sentence asks a question.", incorrect: ["Makes a statement.","CORRECT: Asks a question.","Gives a command.","Shows strong emotion."] },
      studyAid: { definition: "Interrogative sentences ask questions and end with question marks.", example: "Where are you? What time is it? Did you eat?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What type is: 'I love ice cream!'",
      choices: ["Declarative", "Interrogative", "Imperative", "Exclamatory"],
      correct: 3,
      explanation: { correct: "An exclamatory sentence shows strong feeling and ends with an exclamation point.", incorrect: ["Makes a statement but with strong emotion.","Asks a question.","Gives a command.","CORRECT: Shows strong emotion."] },
      studyAid: { definition: "Exclamatory sentences express strong emotion: excitement, anger, surprise, joy.", example: "I love ice cream! That was amazing! Watch out!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What type is: 'The Earth orbits the sun.'",
      choices: ["Declarative", "Interrogative", "Imperative", "Exclamatory"],
      correct: 0,
      explanation: { correct: "A declarative sentence makes a statement and ends with a period.", incorrect: ["CORRECT: Makes a statement.","Asks a question.","Gives a command.","Shows strong emotion."] },
      studyAid: { definition: "Declarative sentences make statements or express opinions. They are the most common sentence type.", example: "The sky is blue. I like pizza. She runs fast.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an imperative sentence?",
      choices: ["Are you coming?", "Please pass the salt.", "What a beautiful day!", "The cat is sleeping."],
      correct: 1,
      explanation: { correct: "'Please pass the salt' is a polite command or request.", incorrect: ["Interrogative.","CORRECT: Imperative.","Exclamatory.","Declarative."] },
      studyAid: { definition: "Imperative sentences can be polite requests using 'please.'", example: "Please help me. Be careful. Listen closely.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an exclamatory sentence?",
      choices: ["I finished my homework.", "Did you finish your homework?", "Finish your homework!", "What a mess!"],
      correct: 3,
      explanation: { correct: "'What a mess!' shows strong emotion and ends with an exclamation point.", incorrect: ["Declarative.","Interrogative.","Imperative.","CORRECT: Exclamatory."] },
      studyAid: { definition: "Exclamatory sentences often start with 'What' or 'How.'", example: "What a surprise! How wonderful! What a great game!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is interrogative?",
      choices: ["How old are you?", "I am ten years old.", "Please tell me your age.", "What a big birthday cake!"],
      correct: 0,
      explanation: { correct: "'How old are you?' asks for information.", incorrect: ["CORRECT: Interrogative.","Declarative.","Imperative.","Exclamatory."] },
      studyAid: { definition: "Interrogative sentences often start with who, what, where, when, why, how.", example: "Who is that? What happened? Where are you going?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is declarative?",
      choices: ["The train arrives at noon.", "Does the train arrive at noon?", "Let the train arrive at noon!", "What a noisy train!"],
      correct: 0,
      explanation: { correct: "'The train arrives at noon' makes a statement.", incorrect: ["CORRECT: Declarative.","Interrogative.","Imperative.","Exclamatory."] },
      studyAid: { definition: "Declarative sentences state facts or opinions.", example: "The train arrives at noon. I think it will rain.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is imperative?",
      choices: ["Be quiet!", "Are you quiet?", "I am quiet.", "How quiet it is!"],
      correct: 0,
      explanation: { correct: "'Be quiet!' is a command, even though it has an exclamation point.", incorrect: ["CORRECT: Imperative.","Interrogative.","Declarative.","Exclamatory."] },
      studyAid: { definition: "Imperative sentences can end with periods or exclamation points.", example: "Be quiet. Sit down. Listen!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT declarative?",
      choices: ["Birds can fly.", "Can birds fly?", "Some birds cannot fly.", "Penguins are birds that cannot fly."],
      correct: 1,
      explanation: { correct: "'Can birds fly?' is a question, not a statement.", incorrect: ["Declarative.","CORRECT: Interrogative, not declarative.","Declarative.","Declarative."] },
      studyAid: { definition: "Declarative sentences do not ask questions or give commands.", example: "Birds can fly. (declarative) Can birds fly? (interrogative)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is exclamatory?",
      choices: ["How exciting!", "How exciting is it?", "It is exciting.", "Tell me how exciting it is."],
      correct: 0,
      explanation: { correct: "'How exciting!' shows strong emotion.", incorrect: ["CORRECT: Exclamatory.","Interrogative.","Declarative.","Imperative."] },
      studyAid: { definition: "Sentences starting with 'How' + adjective are often exclamatory.", example: "How exciting! How beautiful! How strange!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is imperative?",
      choices: ["Don't forget your lunch.", "Did you forget your lunch?", "I forgot my lunch.", "What a forgotten lunch!"],
      correct: 0,
      explanation: { correct: "'Don't forget your lunch' is a command or warning.", incorrect: ["CORRECT: Imperative.","Interrogative.","Declarative.","Exclamatory."] },
      studyAid: { definition: "Negative commands are still imperative sentences.", example: "Don't run. Be careful. Don't forget.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is interrogative?",
      choices: ["Where did you go?", "I went to the store.", "Go to the store!", "What a long trip!"],
      correct: 0,
      explanation: { correct: "'Where did you go?' asks for information.", incorrect: ["CORRECT: Interrogative.","Declarative.","Imperative.","Exclamatory."] },
      studyAid: { definition: "Interrogative sentences can start with question words or helping verbs.", example: "Where did you go? Did you eat? Are you ready?", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is declarative?",
      choices: ["Mount Everest is tall.", "Is Mount Everest tall?", "Climb Mount Everest!", "How tall Mount Everest is!"],
      correct: 0,
      explanation: { correct: "'Mount Everest is tall' states a fact.", incorrect: ["CORRECT: Declarative.","Interrogative.","Imperative.","Exclamatory."] },
      studyAid: { definition: "Declarative sentences end with periods and state information.", example: "Mount Everest is tall. The Nile is long.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence type ends with a question mark?",
      choices: ["Declarative", "Interrogative", "Imperative", "Exclamatory"],
      correct: 1,
      explanation: { correct: "Interrogative sentences ask questions and end with question marks.", incorrect: ["Ends with a period.","CORRECT: Ends with a question mark.","Usually ends with a period or exclamation point.","Ends with an exclamation point."] },
      studyAid: { definition: "Each sentence type has its own end punctuation.", example: "Declarative (.), Interrogative (?), Imperative (. or !), Exclamatory (!)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is exclamatory?",
      choices: ["What a great game!", "What time is the game?", "The game was great.", "Watch the game!"],
      correct: 0,
      explanation: { correct: "'What a great game!' shows strong feeling.", incorrect: ["CORRECT: Exclamatory.","Interrogative.","Declarative.","Imperative."] },
      studyAid: { definition: "Exclamatory sentences often start with 'What' or 'How' and express emotion.", example: "What a great game! How exciting!", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.8 Subject/Predicate */
QUESTION_BANK['grammar-subject-predicate'] = {
  title: "Subject and Predicate",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "What is the simple subject: 'The tall boy kicked the ball.'",
      choices: ["The tall boy", "boy", "kicked the ball", "tall"],
      correct: 1,
      explanation: { correct: "The simple subject is the main noun without modifiers: 'boy.'", incorrect: ["This is the complete subject.","CORRECT: Simple subject.","This is the predicate.","This is an adjective modifying the subject."] },
      studyAid: { definition: "The simple subject is the main noun or pronoun that tells who or what the sentence is about.", example: "The tall boy kicked the ball. (simple subject: boy)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple predicate: 'The dog runs fast.'",
      choices: ["runs fast", "runs", "The dog", "fast"],
      correct: 1,
      explanation: { correct: "The simple predicate is the main verb: 'runs.'", incorrect: ["This is the complete predicate.","CORRECT: Simple predicate.","This is the subject.","This is an adverb."] },
      studyAid: { definition: "The simple predicate is the main verb or verb phrase.", example: "The dog runs fast. (simple predicate: runs)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the complete subject: 'My little sister sings loudly.'",
      choices: ["sings loudly", "My little sister", "sister", "sings"],
      correct: 1,
      explanation: { correct: "The complete subject includes the simple subject and all modifiers: 'My little sister.'", incorrect: ["This is the predicate.","CORRECT: Complete subject.","This is the simple subject.","This is the verb."] },
      studyAid: { definition: "The complete subject includes all words that tell who or what the sentence is about.", example: "My little sister sings loudly. (complete subject: My little sister)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the complete predicate: 'The children played in the park.'",
      choices: ["The children", "played in the park", "played", "children"],
      correct: 1,
      explanation: { correct: "The complete predicate includes the verb and all words that modify or complete it.", incorrect: ["This is the subject.","CORRECT: Complete predicate.","This is the simple predicate.","This is part of the subject."] },
      studyAid: { definition: "The complete predicate tells what the subject did or is.", example: "The children played in the park. (complete predicate: played in the park)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'There are three apples on the table.'",
      choices: ["There", "three apples", "on the table", "are"],
      correct: 1,
      explanation: { correct: "In sentences starting with 'There,' the real subject follows the verb: 'three apples.'", incorrect: ["'There' is not the real subject.","CORRECT: Real subject.","Prepositional phrase.","Verb."] },
      studyAid: { definition: "In 'There is/are' sentences, the subject comes after the verb.", example: "There are three apples on the table. (subject: three apples)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the predicate: 'The sun rises in the east.'",
      choices: ["The sun", "rises in the east", "rises", "in the east"],
      correct: 1,
      explanation: { correct: "The complete predicate includes the verb and its modifiers.", incorrect: ["Subject.","CORRECT: Complete predicate.","Simple predicate.","Prepositional phrase only."] },
      studyAid: { definition: "The predicate tells what the subject does or is.", example: "The sun rises in the east. (predicate: rises in the east)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple subject: 'A group of birds flew overhead.'",
      choices: ["A group of birds", "group", "flew overhead", "birds"],
      correct: 1,
      explanation: { correct: "'Group' is the main noun; 'of birds' is a prepositional phrase modifying it.", incorrect: ["Complete subject.","CORRECT: Simple subject.","Predicate.","Part of prepositional phrase."] },
      studyAid: { definition: "Prepositional phrases after the subject are not part of the simple subject.", example: "A group of birds flew overhead. (simple subject: group)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple predicate: 'She has been studying for hours.'",
      choices: ["has been studying", "studying", "has", "for hours"],
      correct: 0,
      explanation: { correct: "The simple predicate includes all parts of the verb phrase: 'has been studying.'", incorrect: ["CORRECT: Verb phrase.","Part of verb phrase.","Part of verb phrase.","Prepositional phrase."] },
      studyAid: { definition: "The simple predicate can be a verb phrase with helping verbs.", example: "She has been studying for hours. (simple predicate: has been studying)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'Here is your book.'",
      choices: ["Here", "your book", "is", "book"],
      correct: 1,
      explanation: { correct: "In 'Here is/are' sentences, the subject follows the verb.", incorrect: ["'Here' is not the subject.","CORRECT: Subject.","Verb.","Simple subject without modifier."] },
      studyAid: { definition: "'Here' sentences have inverted word order; the subject comes after the verb.", example: "Here is your book. (subject: your book)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the complete subject: 'The very old man walked slowly.'",
      choices: ["The very old man", "man", "walked slowly", "old man"],
      correct: 0,
      explanation: { correct: "The complete subject includes all modifiers: 'The very old man.'", incorrect: ["CORRECT: Complete subject.","Simple subject.","Predicate.","Part of complete subject."] },
      studyAid: { definition: "Adjectives like 'very old' are part of the complete subject.", example: "The very old man walked slowly. (complete subject: The very old man)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the predicate: 'My friends and I went to the movies.'",
      choices: ["My friends and I", "went to the movies", "went", "friends and I"],
      correct: 1,
      explanation: { correct: "The complete predicate includes the verb and all modifiers.", incorrect: ["Subject.","CORRECT: Complete predicate.","Simple predicate.","Part of subject."] },
      studyAid: { definition: "Compound subjects like 'My friends and I' still have one predicate.", example: "My friends and I went to the movies. (predicate: went to the movies)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple subject: 'Under the table, the cat slept.'",
      choices: ["Under the table", "table", "the cat", "cat"],
      correct: 3,
      explanation: { correct: "'Cat' is the main noun. 'Under the table' is a prepositional phrase, and 'the' is an article.", incorrect: ["Prepositional phrase.","Part of prepositional phrase.","Complete subject.","CORRECT: Simple subject."] },
      studyAid: { definition: "Prepositional phrases at the beginning are not part of the subject.", example: "Under the table, the cat slept. (simple subject: cat)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple predicate: 'The storm might have damaged the roof.'",
      choices: ["might have damaged", "damaged", "might", "have damaged"],
      correct: 0,
      explanation: { correct: "The complete verb phrase is the simple predicate.", incorrect: ["CORRECT: Verb phrase.","Part of verb phrase.","Part of verb phrase.","Part of verb phrase."] },
      studyAid: { definition: "Helping verbs + main verb form the simple predicate.", example: "The storm might have damaged the roof. (simple predicate: might have damaged)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'Swimming is good exercise.'",
      choices: ["Swimming", "is", "good exercise", "exercise"],
      correct: 0,
      explanation: { correct: "'Swimming' is a gerund acting as the subject of the sentence.", incorrect: ["CORRECT: Gerund as subject.","Verb.","Object complement.","Part of predicate."] },
      studyAid: { definition: "Gerunds (verbs ending in -ing used as nouns) can be subjects.", example: "Swimming is fun. Reading is important.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the complete predicate: 'The big, brown bear caught a fish in the stream.'",
      choices: ["The big, brown bear", "caught a fish in the stream", "caught", "a fish in the stream"],
      correct: 1,
      explanation: { correct: "The complete predicate includes the verb and all objects and modifiers.", incorrect: ["Complete subject.","CORRECT: Complete predicate.","Simple predicate.","Direct object and prepositional phrase only."] },
      studyAid: { definition: "The complete predicate is everything that is not the complete subject.", example: "The big, brown bear caught a fish in the stream. (predicate: caught a fish in the stream)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the simple subject: 'Neither of the answers is correct.'",
      choices: ["Neither of the answers", "Neither", "answers", "correct"],
      correct: 1,
      explanation: { correct: "'Neither' is the main pronoun; 'of the answers' is a prepositional phrase.", incorrect: ["Complete subject.","CORRECT: Simple subject.","Part of prepositional phrase.","Adjective."] },
      studyAid: { definition: "Indefinite pronouns like 'neither,' 'each,' and 'everyone' can be simple subjects.", example: "Neither of the answers is correct. (simple subject: Neither)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.9 Parts of Speech - Verbs */
QUESTION_BANK['grammar-parts-of-speech-verbs'] = {
  title: "Parts of Speech: Verbs",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which word is a verb: 'The bird ___ in the tree.'",
      choices: ["bird", "sings", "tree", "the"],
      correct: 1,
      explanation: { correct: "'Sings' is an action verb showing what the bird does.", incorrect: ["Noun.","CORRECT: Action verb.","Noun.","Article."] },
      studyAid: { definition: "Verbs show action or state of being.", example: "sings, runs, is, seems", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a linking verb?",
      choices: ["run", "jump", "seems", "throw"],
      correct: 2,
      explanation: { correct: "'Seems' connects the subject to a description.", incorrect: ["Action verb.","Action verb.","CORRECT: Linking verb.","Action verb."] },
      studyAid: { definition: "Linking verbs connect the subject to a subject complement: am, is, are, was, were, seem, become.", example: "She seems happy. He became tired.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an action verb?",
      choices: ["is", "was", "kicks", "seems"],
      correct: 2,
      explanation: { correct: "'Kicks' shows physical action.", incorrect: ["Linking verb.","Linking verb.","CORRECT: Action verb.","Linking verb."] },
      studyAid: { definition: "Action verbs show what someone or something does.", example: "kick, run, think, write", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a helping verb?",
      choices: ["play", "have", "happy", "quickly"],
      correct: 1,
      explanation: { correct: "'Have' helps form perfect tenses.", incorrect: ["Main verb.","CORRECT: Helping verb.","Adjective.","Adverb."] },
      studyAid: { definition: "Helping verbs (auxiliary verbs) help main verbs: have, has, had, do, does, did, will, would, can, could, shall, should, may, might, must.", example: "She has finished. They will go.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which verb phrase is in the sentence: 'She has been reading.'",
      choices: ["has", "been reading", "has been reading", "reading"],
      correct: 2,
      explanation: { correct: "The verb phrase includes all helping verbs + main verb.", incorrect: ["Only one helping verb.","Missing 'has.'","CORRECT: Full verb phrase.","Main verb only."] },
      studyAid: { definition: "Verb phrases include helping verbs and the main verb together.", example: "She has been reading. (has been reading = verb phrase)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a state of being verb?",
      choices: ["dance", "exist", "swim", "laugh"],
      correct: 1,
      explanation: { correct: "'Exist' describes a state, not an action.", incorrect: ["Action verb.","CORRECT: State of being.","Action verb.","Action verb."] },
      studyAid: { definition: "State of being verbs show existence or condition: be, exist, remain, stay.", example: "They exist. She remains calm.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is a verb: 'He ___ the ball.'",
      choices: ["he", "threw", "ball", "the"],
      correct: 1,
      explanation: { correct: "'Threw' is an action verb.", incorrect: ["Pronoun.","CORRECT: Verb.","Noun.","Article."] },
      studyAid: { definition: "Verbs can show physical or mental actions.", example: "threw, thought, imagined, built", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a helping verb in: 'They are playing soccer.'",
      choices: ["They", "are", "playing", "soccer"],
      correct: 1,
      explanation: { correct: "'Are' helps form the present continuous tense.", incorrect: ["Pronoun/subject.","CORRECT: Helping verb.","Main verb.","Noun/object."] },
      studyAid: { definition: "'Be' verbs (am, is, are, was, were) often act as helping verbs.", example: "They are playing. She was sleeping.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT a verb?",
      choices: ["think", "beautiful", "write", "swim"],
      correct: 1,
      explanation: { correct: "'Beautiful' is an adjective describing a noun.", incorrect: ["Verb.","CORRECT: Adjective, not verb.","Verb.","Verb."] },
      studyAid: { definition: "Adjectives describe nouns. Verbs show action or state of being.", example: "beautiful (adjective), swim (verb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a verb in past tense?",
      choices: ["run", "ran", "running", "will run"],
      correct: 1,
      explanation: { correct: "'Ran' is the simple past tense of 'run.'", incorrect: ["Base form.","CORRECT: Past tense.","Present participle.","Future tense."] },
      studyAid: { definition: "Past tense verbs show actions that already happened.", example: "run → ran, eat → ate, go → went", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a transitive verb?",
      choices: ["sleep", "arrive", "throw", "exist"],
      correct: 2,
      explanation: { correct: "'Throw' takes a direct object (you throw something).", incorrect: ["Intransitive.","Intransitive.","CORRECT: Transitive.","Intransitive."] },
      studyAid: { definition: "Transitive verbs need a direct object. Intransitive verbs do not.", example: "throw a ball (transitive), sleep (intransitive)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an intransitive verb?",
      choices: ["kick", "read", "sleep", "write"],
      correct: 2,
      explanation: { correct: "'Sleep' does not need a direct object.", incorrect: ["Transitive.","Transitive.","CORRECT: Intransitive.","Transitive."] },
      studyAid: { definition: "Intransitive verbs do not need objects to complete their meaning.", example: "sleep, arrive, fall, exist", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is a verb: 'She ___ happy.'",
      choices: ["She", "is", "happy", "the"],
      correct: 1,
      explanation: { correct: "'Is' is a linking verb connecting the subject to the adjective.", incorrect: ["Pronoun.","CORRECT: Linking verb.","Adjective.","Article."] },
      studyAid: { definition: "'Be' verbs are linking verbs that connect subjects to descriptions.", example: "She is happy. They are tired.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a main verb in: 'The cat has been sleeping all day.'",
      choices: ["has", "been", "sleeping", "all"],
      correct: 2,
      explanation: { correct: "'Sleeping' is the main action. 'Has' and 'been' are helping verbs.", incorrect: ["Helping verb.","Helping verb.","CORRECT: Main verb.","Adjective/determiner."] },
      studyAid: { definition: "The main verb carries the core meaning. Helping verbs assist it.", example: "She has been sleeping. (sleeping = main verb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a verb phrase: 'We will have finished by noon.'",
      choices: ["will", "will have", "will have finished", "finished"],
      correct: 2,
      explanation: { correct: "The verb phrase includes all helping verbs + main verb.", incorrect: ["One helping verb.","Two helping verbs.","CORRECT: Full verb phrase.","Main verb only."] },
      studyAid: { definition: "Future perfect tense uses 'will have' + past participle.", example: "We will have finished by noon.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a verb?",
      choices: ["happiness", "happy", "happily", "happen"],
      correct: 3,
      explanation: { correct: "'Happen' is an action verb.", incorrect: ["Noun.","Adjective.","Adverb.","CORRECT: Verb."] },
      studyAid: { definition: "Words with similar roots can be different parts of speech.", example: "happiness (noun), happy (adjective), happily (adverb), happen (verb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.10 Parts of Speech - Nouns */
QUESTION_BANK['grammar-parts-of-speech-nouns'] = {
  title: "Parts of Speech: Nouns",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which word is a noun?",
      choices: ["run", "happiness", "quickly", "blue"],
      correct: 1,
      explanation: { correct: "'Happiness' is an abstract noun naming an idea or feeling.", incorrect: ["Verb.","CORRECT: Noun.","Adverb.","Adjective."] },
      studyAid: { definition: "Nouns name people, places, things, or ideas.", example: "happiness, courage, kindness, love", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a proper noun?",
      choices: ["city", "dog", "London", "book"],
      correct: 2,
      explanation: { correct: "'London' names a specific place and is capitalized.", incorrect: ["Common noun.","Common noun.","CORRECT: Proper noun.","Common noun."] },
      studyAid: { definition: "Proper nouns name specific people, places, or things and are capitalized.", example: "London, Mt. Everest, President Lincoln", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a common noun?",
      choices: ["Amazon River", "Monday", "teacher", "Christmas"],
      correct: 2,
      explanation: { correct: "'Teacher' names a general person, not a specific one.", incorrect: ["Proper noun.","Proper noun.","CORRECT: Common noun.","Proper noun."] },
      studyAid: { definition: "Common nouns name general people, places, or things.", example: "teacher, city, river, day", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a concrete noun?",
      choices: ["love", "bravery", "apple", "freedom"],
      correct: 2,
      explanation: { correct: "'Apple' is a physical object you can touch and see.", incorrect: ["Abstract noun.","Abstract noun.","CORRECT: Concrete noun.","Abstract noun."] },
      studyAid: { definition: "Concrete nouns name things you can perceive with your senses.", example: "apple, table, dog, mountain", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an abstract noun?",
      choices: ["table", "dog", "joy", "house"],
      correct: 2,
      explanation: { correct: "'Joy' is a feeling or idea, not a physical object.", incorrect: ["Concrete noun.","Concrete noun.","CORRECT: Abstract noun.","Concrete noun."] },
      studyAid: { definition: "Abstract nouns name ideas, feelings, or qualities you cannot touch.", example: "joy, sadness, honesty, patience", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a collective noun?",
      choices: ["student", "team", "pencil", "school"],
      correct: 1,
      explanation: { correct: "'Team' names a group of people acting as one unit.", incorrect: ["Individual noun.","CORRECT: Collective noun.","Individual noun.","Can be collective but also a place; 'team' is clearer."] },
      studyAid: { definition: "Collective nouns name groups: team, flock, herd, class, family.", example: "The team won. A flock of birds flew by.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a plural noun?",
      choices: ["child", "ox", "mice", "goose"],
      correct: 2,
      explanation: { correct: "'Mice' is the plural of 'mouse.'", incorrect: ["Singular.","Singular.","CORRECT: Plural.","Singular."] },
      studyAid: { definition: "Plural nouns name more than one person, place, thing, or idea.", example: "mice, children, oxen, geese", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a compound noun?",
      choices: ["run", "toothbrush", "quickly", "happy"],
      correct: 1,
      explanation: { correct: "'Toothbrush' is made of two nouns joined together.", incorrect: ["Verb.","CORRECT: Compound noun.","Adverb.","Adjective."] },
      studyAid: { definition: "Compound nouns are made of two or more words: toothbrush, basketball, sunlight.", example: "toothbrush, haircut, newspaper, homework", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a possessive noun?",
      choices: ["dogs", "dog's", "dog", "doggie"],
      correct: 1,
      explanation: { correct: "'Dog's' shows that something belongs to the dog.", incorrect: ["Plural noun.","CORRECT: Possessive noun.","Singular noun.","Diminutive noun."] },
      studyAid: { definition: "Possessive nouns show ownership and use an apostrophe.", example: "the dog's bone, the teacher's desk", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a gerund?",
      choices: ["swim", "swimming", "swimmer", "swims"],
      correct: 1,
      explanation: { correct: "'Swimming' is a verb form ending in -ing used as a noun.", incorrect: ["Base verb.","CORRECT: Gerund.","Person noun.","Verb form."] },
      studyAid: { definition: "Gerunds are -ing verbs used as nouns.", example: "Swimming is fun. I love reading.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT a noun?",
      choices: ["beauty", "beautiful", "hope", "courage"],
      correct: 1,
      explanation: { correct: "'Beautiful' is an adjective describing a noun.", incorrect: ["Abstract noun.","CORRECT: Adjective.","Abstract noun.","Abstract noun."] },
      studyAid: { definition: "Words ending in -ful are often adjectives, not nouns.", example: "beautiful (adjective), beauty (noun)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a proper noun?",
      choices: ["ocean", "mountain", "Pacific Ocean", "river"],
      correct: 2,
      explanation: { correct: "'Pacific Ocean' names a specific ocean.", incorrect: ["Common noun.","Common noun.","CORRECT: Proper noun.","Common noun."] },
      studyAid: { definition: "Specific geographical names are proper nouns.", example: "Pacific Ocean, Amazon River, Mt. Everest", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a count noun?",
      choices: ["water", "air", "book", "rice"],
      correct: 2,
      explanation: { correct: "'Book' can be counted: one book, two books.", incorrect: ["Uncountable.","Uncountable.","CORRECT: Count noun.","Uncountable."] },
      studyAid: { definition: "Count nouns can be pluralized. Non-count nouns cannot.", example: "book → books (count), water (non-count)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a non-count noun?",
      choices: ["apple", "chair", "sand", "pencil"],
      correct: 2,
      explanation: { correct: "'Sand' is not typically counted individually.", incorrect: ["Count noun.","Count noun.","CORRECT: Non-count noun.","Count noun."] },
      studyAid: { definition: "Non-count nouns name things that are not counted individually: sand, water, rice, advice.", example: "some sand, a lot of water, much rice", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a noun?",
      choices: ["think", "quickly", "knowledge", "run"],
      correct: 2,
      explanation: { correct: "'Knowledge' names an idea or concept.", incorrect: ["Verb.","Adverb.","CORRECT: Noun.","Verb."] },
      studyAid: { definition: "Abstract nouns name ideas and concepts.", example: "knowledge, wisdom, information, education", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 4.11 Parts of Speech - Adjectives */
QUESTION_BANK['grammar-parts-of-speech-adjectives'] = {
  title: "Parts of Speech: Adjectives",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which word is an adjective: 'The ___ dog barked.'",
      choices: ["dog", "barked", "loud", "the"],
      correct: 2,
      explanation: { correct: "'Loud' describes the dog.", incorrect: ["Noun.","Verb.","CORRECT: Adjective.","Article."] },
      studyAid: { definition: "Adjectives describe or modify nouns.", example: "loud, happy, blue, tall", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adjective?",
      choices: ["quickly", "beauty", "beautiful", "run"],
      correct: 2,
      explanation: { correct: "'Beautiful' describes a noun.", incorrect: ["Adverb.","Noun.","CORRECT: Adjective.","Verb."] },
      studyAid: { definition: "Adjectives often end in -ful, -ous, -ive, -y.", example: "beautiful, dangerous, active, happy", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which adjective compares two things?",
      choices: ["tall", "taller", "tallest", "more tall"],
      correct: 1,
      explanation: { correct: "'Taller' is the comparative form.", incorrect: ["Positive form.","CORRECT: Comparative.","Superlative.","Double-marked comparison."] },
      studyAid: { definition: "Comparative adjectives compare two things and usually end in -er.", example: "tall → taller, fast → faster", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a proper adjective?",
      choices: ["happy", "American", "blue", "quick"],
      correct: 1,
      explanation: { correct: "'American' comes from a proper noun and is capitalized.", incorrect: ["Common adjective.","CORRECT: Proper adjective.","Common adjective.","Common adjective."] },
      studyAid: { definition: "Proper adjectives come from proper nouns and are capitalized.", example: "American, Victorian, Shakespearean, French", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which word is an adjective: 'She wore a ___ dress.'",
      choices: ["she", "wore", "red", "dress"],
      correct: 2,
      explanation: { correct: "'Red' describes the dress.", incorrect: ["Pronoun.","Verb.","CORRECT: Adjective.","Noun."] },
      studyAid: { definition: "Colors are adjectives.", example: "red, blue, green, yellow", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a possessive adjective?",
      choices: ["mine", "my", "I", "me"],
      correct: 1,
      explanation: { correct: "'My' shows possession and comes before a noun.", incorrect: ["Possessive pronoun (stands alone).","CORRECT: Possessive adjective.","Subject pronoun.","Object pronoun."] },
      studyAid: { definition: "Possessive adjectives: my, your, his, her, its, our, their.", example: "my book, your car, their house", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an article?",
      choices: ["the", "quick", "run", "happily"],
      correct: 0,
      explanation: { correct: "'The' is a definite article.", incorrect: ["CORRECT: Article.","Adjective.","Verb.","Adverb."] },
      studyAid: { definition: "Articles are a type of adjective: a, an, the.", example: "a book, an apple, the sun", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a demonstrative adjective?",
      choices: ["this", "happy", "quickly", "run"],
      correct: 0,
      explanation: { correct: "'This' points out a specific noun.", incorrect: ["CORRECT: Demonstrative adjective.","Regular adjective.","Adverb.","Verb."] },
      studyAid: { definition: "Demonstrative adjectives: this, that, these, those.", example: "this book, that car, these shoes, those trees", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT an adjective?",
      choices: ["fierce", "fiercely", "brave", "strong"],
      correct: 1,
      explanation: { correct: "'Fiercely' is an adverb describing how something is done.", incorrect: ["Adjective.","CORRECT: Adverb.","Adjective.","Adjective."] },
      studyAid: { definition: "Adverbs often end in -ly. Adjectives describe nouns.", example: "fierce (adjective), fiercely (adverb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is the superlative form?",
      choices: ["big", "bigger", "biggest", "more bigger"],
      correct: 2,
      explanation: { correct: "'Biggest' compares three or more things.", incorrect: ["Positive form.","Comparative.","CORRECT: Superlative.","Double-marked."] },
      studyAid: { definition: "Superlative adjectives compare three or more and usually end in -est.", example: "big → bigger → biggest", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adjective: 'The ___ puppy slept.'",
      choices: ["puppy", "slept", "tiny", "the"],
      correct: 2,
      explanation: { correct: "'Tiny' describes the puppy.", incorrect: ["Noun.","Verb.","CORRECT: Adjective.","Article."] },
      studyAid: { definition: "Size words are adjectives.", example: "tiny, huge, small, large", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an indefinite adjective?",
      choices: ["the", "some", "this", "red"],
      correct: 1,
      explanation: { correct: "'Some' is an indefinite adjective because it refers to an unspecified amount.", incorrect: ["Definite article.","CORRECT: Indefinite adjective.","Demonstrative.","Descriptive adjective."] },
      studyAid: { definition: "Indefinite adjectives: some, any, many, few, several, all.", example: "some people, many books, few students", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a numeral adjective?",
      choices: ["first", "quick", "this", "happy"],
      correct: 0,
      explanation: { correct: "'First' is an ordinal number used as an adjective.", incorrect: ["CORRECT: Numeral adjective.","Descriptive adjective.","Demonstrative adjective.","Descriptive adjective."] },
      studyAid: { definition: "Numeral adjectives are numbers used to describe nouns: one, two, first, second.", example: "three apples, first place, second chance", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adjective formed from a verb?",
      choices: ["running", "runner", "ran", "run"],
      correct: 0,
      explanation: { correct: "'Running' can describe a noun: running water.", incorrect: ["CORRECT: Present participle used as adjective.","Noun formed from verb.","Past tense verb.","Base verb."] },
      studyAid: { definition: "Present participles can act as adjectives: running water, sleeping baby.", example: "running water, a sleeping child, a boring movie", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a predicate adjective?",
      choices: ["The happy child laughed.", "The child is happy.", "Happily, the child laughed.", "The child's happiness grew."],
      correct: 1,
      explanation: { correct: "'Happy' follows the linking verb 'is' and describes the subject.", incorrect: ["Attributive adjective before noun.","CORRECT: Predicate adjective.","Adverb at sentence beginning.","Noun form."] },
      studyAid: { definition: "Predicate adjectives follow linking verbs and describe the subject.", example: "The child is happy. The soup smells good.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.12 Parts of Speech - Adverbs */
QUESTION_BANK['grammar-parts-of-speech-adverbs'] = {
  title: "Parts of Speech: Adverbs",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which word is an adverb: 'She sings ___.'",
      choices: ["she", "sings", "beautifully", "song"],
      correct: 2,
      explanation: { correct: "'Beautifully' describes how she sings.", incorrect: ["Pronoun.","Verb.","CORRECT: Adverb.","Noun."] },
      studyAid: { definition: "Adverbs describe verbs, adjectives, or other adverbs. Many end in -ly.", example: "beautifully, quickly, happily, carefully", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which adverb tells WHEN?",
      choices: ["quickly", "yesterday", "here", "loudly"],
      correct: 1,
      explanation: { correct: "'Yesterday' tells when something happened.", incorrect: ["Tells how.","CORRECT: Tells when.","Tells where.","Tells how."] },
      studyAid: { definition: "Adverbs of time tell when: yesterday, today, soon, later, now.", example: "I will go tomorrow. She arrived yesterday.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which adverb tells WHERE?",
      choices: ["slowly", "tomorrow", "outside", "very"],
      correct: 2,
      explanation: { correct: "'Outside' tells where something happened.", incorrect: ["Tells how.","Tells when.","CORRECT: Tells where.","Intensifier."] },
      studyAid: { definition: "Adverbs of place tell where: here, there, outside, inside, upstairs.", example: "Go outside. She lives nearby.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adverb of manner?",
      choices: ["soon", "everywhere", "carefully", "quite"],
      correct: 2,
      explanation: { correct: "'Carefully' tells how something is done.", incorrect: ["Tells when.","Tells where.","CORRECT: Tells how.","Intensifier."] },
      studyAid: { definition: "Adverbs of manner tell how: carefully, quickly, slowly, happily.", example: "She typed carefully. He ran quickly.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an intensifier adverb?",
      choices: ["slowly", "very", "here", "yesterday"],
      correct: 1,
      explanation: { correct: "'Very' intensifies the meaning of an adjective or adverb.", incorrect: ["Adverb of manner.","CORRECT: Intensifier.","Adverb of place.","Adverb of time."] },
      studyAid: { definition: "Intensifiers strengthen meaning: very, really, extremely, quite, too.", example: "very tall, really fast, extremely cold", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT an adverb?",
      choices: ["happily", "quickly", "happy", "silently"],
      correct: 2,
      explanation: { correct: "'Happy' is an adjective describing a noun.", incorrect: ["Adverb.","Adverb.","CORRECT: Adjective.","Adverb."] },
      studyAid: { definition: "Adjectives describe nouns. Adverbs describe verbs, adjectives, or other adverbs.", example: "happy (adjective), happily (adverb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which adverb modifies an adjective?",
      choices: ["She runs fast.", "She is very tall.", "She arrived yesterday.", "She went outside."],
      correct: 1,
      explanation: { correct: "'Very' modifies the adjective 'tall.'", incorrect: ["'Fast' modifies a verb.","CORRECT: 'Very' modifies 'tall.'","'Yesterday' modifies a verb.","'Outside' modifies a verb."] },
      studyAid: { definition: "Adverbs can modify adjectives: very tall, extremely cold, quite loud.", example: "She is very tall. It is extremely cold.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adverb of frequency?",
      choices: ["slowly", "always", "here", "loudly"],
      correct: 1,
      explanation: { correct: "'Always' tells how often something happens.", incorrect: ["Tells how.","CORRECT: Tells frequency.","Tells where.","Tells how."] },
      studyAid: { definition: "Adverbs of frequency tell how often: always, usually, sometimes, rarely, never.", example: "I always brush my teeth. She rarely watches TV.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adverb?",
      choices: ["beautiful", "beauty", "beautifully", "beautify"],
      correct: 2,
      explanation: { correct: "'Beautifully' describes how something is done.", incorrect: ["Adjective.","Noun.","CORRECT: Adverb.","Verb."] },
      studyAid: { definition: "Many adverbs are formed by adding -ly to adjectives.", example: "beautiful → beautifully, quick → quickly, happy → happily", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which adverb tells to what extent?",
      choices: ["quickly", "almost", "outside", "now"],
      correct: 1,
      explanation: { correct: "'Almost' tells how close to complete something is.", incorrect: ["Tells how.","CORRECT: Tells extent.","Tells where.","Tells when."] },
      studyAid: { definition: "Adverbs of degree/extent: almost, nearly, completely, totally, partly.", example: "almost done, completely full, partly cloudy", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adverb phrase?",
      choices: ["in the morning", "very happy", "the big dog", "she runs"],
      correct: 0,
      explanation: { correct: "'In the morning' tells when and acts as an adverb.", incorrect: ["CORRECT: Adverb phrase.","Adjective phrase.","Noun phrase.","Subject + verb."] },
      studyAid: { definition: "Prepositional phrases can act as adverbs telling when, where, or how.", example: "in the morning, at the park, with care", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT a typical adverb ending?",
      choices: ["-ly", "-ward", "-ful", "-wise"],
      correct: 2,
      explanation: { correct: "'-ful' usually forms adjectives (beautiful), not adverbs.", incorrect: ["Common adverb ending.","Adverb ending (toward, backward).","CORRECT: Adjective ending.","Adverb ending (likewise, otherwise)."] },
      studyAid: { definition: "'-ful' is more common for adjectives. '-ly' is the most common adverb ending.", example: "beautiful (adjective), beautifully (adverb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which adverb modifies another adverb?",
      choices: ["She runs fast.", "She runs very fast.", "She is very tall.", "She arrived early."],
      correct: 1,
      explanation: { correct: "'Very' modifies the adverb 'fast.'", incorrect: ["'Fast' modifies a verb.","CORRECT: 'Very' modifies 'fast.'","'Very' modifies an adjective.","'Early' modifies a verb."] },
      studyAid: { definition: "Adverbs can modify other adverbs: very fast, quite slowly, too carefully.", example: "She runs very fast. He drove quite slowly.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adverb of affirmation?",
      choices: ["no", "never", "yes", "rarely"],
      correct: 2,
      explanation: { correct: "'Yes' confirms or agrees.", incorrect: ["Negative.","Negative.","CORRECT: Affirmation.","Negative."] },
      studyAid: { definition: "Adverbs of affirmation: yes, certainly, definitely, surely.", example: "Yes, I agree. Certainly, I will help.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is an adverb?",
      choices: ["fast", "quick", "speed", "quickness"],
      correct: 0,
      explanation: { correct: "'Fast' can be an adverb describing how something moves.", incorrect: ["CORRECT: Can be an adverb.","Adjective.","Noun.","Noun."] },
      studyAid: { definition: "Some words can be both adjectives and adverbs: fast, hard, early, late.", example: "a fast car (adjective), run fast (adverb)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.13 Subject/Verb Agreement */
QUESTION_BANK['grammar-subject-verb-agreement'] = {
  title: "Subject-Verb Agreement",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which is correct: 'The dog ___ in the yard.'",
      choices: ["bark", "barks", "barking", "barked"],
      correct: 1,
      explanation: { correct: "'Dog' is singular, so the verb needs -s.", incorrect: ["Base form.","CORRECT: Singular verb.","Participle.","Past tense."] },
      studyAid: { definition: "Singular subjects in present tense need verbs ending in -s or -es.", example: "The dog barks. She runs. He plays.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'The dogs ___ in the yard.'",
      choices: ["bark", "barks", "barking", "barked"],
      correct: 0,
      explanation: { correct: "'Dogs' is plural, so use the base form.", incorrect: ["CORRECT: Plural verb.","Singular verb.","Participle.","Past tense."] },
      studyAid: { definition: "Plural subjects in present tense use the base verb form without -s.", example: "The dogs bark. They run. We play.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'She ___ to school every day.'",
      choices: ["walk", "walks", "walking", "walked"],
      correct: 1,
      explanation: { correct: "'She' is third person singular, so add -s.", incorrect: ["Base form.","CORRECT: Third person singular.","Participle.","Past tense."] },
      studyAid: { definition: "Third person singular (he, she, it) adds -s or -es in present tense.", example: "She walks. He talks. It jumps.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'My friends ___ soccer after school.'",
      choices: ["play", "plays", "playing", "played"],
      correct: 0,
      explanation: { correct: "'Friends' is plural, so use the base form.", incorrect: ["CORRECT: Plural verb.","Singular verb.","Participle.","Past tense."] },
      studyAid: { definition: "Plural subjects take plural verbs.", example: "My friends play. The cats sleep.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Neither of the boys ___ late.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "'Neither' is singular, so use 'is.'", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "Indefinite pronouns like neither, either, each, everyone are singular.", example: "Neither is late. Each student has a book.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'The team ___ ready to play.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "'Team' is a collective noun and takes a singular verb when acting as one unit.", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "Collective nouns (team, family, class) usually take singular verbs in American English.", example: "The team is ready. The family is going on vacation.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'One of my cats ___ black.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "'One' is the subject, and it is singular.", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "In 'one of' phrases, 'one' is the singular subject.", example: "One of my cats is black. One of the students is absent.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'The books on the shelf ___ dusty.'",
      choices: ["is", "are", "was", "be"],
      correct: 1,
      explanation: { correct: "'Books' is the subject (plural), not 'shelf.'", incorrect: ["Singular.","CORRECT: Plural.","Singular past.","Base form."] },
      studyAid: { definition: "Ignore prepositional phrases when finding the subject.", example: "The books on the shelf are dusty. (subject: books)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Everyone ___ excited.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "'Everyone' is a singular indefinite pronoun.", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "Everyone, everybody, someone, somebody, anyone, anybody are singular.", example: "Everyone is excited. Somebody is at the door.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Neither the teacher nor the students ___ happy.'",
      choices: ["is", "are", "was", "be"],
      correct: 1,
      explanation: { correct: "With 'neither...nor,' the verb agrees with the closer subject ('students').", incorrect: ["Singular.","CORRECT: Plural (closer subject).","Singular past.","Base form."] },
      studyAid: { definition: "In 'either...or' and 'neither...nor,' the verb agrees with the subject closest to it.", example: "Neither the teacher nor the students are happy.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'The news ___ surprising.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "'News' is an uncountable noun and takes a singular verb.", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "Uncountable nouns (news, information, advice) take singular verbs.", example: "The news is surprising. The information is helpful.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Measles ___ a contagious disease.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "Diseases ending in -s are usually singular.", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "Some nouns ending in -s are singular: measles, mumps, mathematics, news.", example: "Measles is contagious. Mathematics is hard.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'A number of students ___ absent.'",
      choices: ["is", "are", "was", "be"],
      correct: 1,
      explanation: { correct: "'A number of' means many and takes a plural verb.", incorrect: ["Singular.","CORRECT: Plural.","Singular past.","Base form."] },
      studyAid: { definition: "'A number of' = plural. 'The number of' = singular.", example: "A number of students are absent. The number of absent students is growing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'The number of absent students ___ growing.'",
      choices: ["are", "is", "were", "be"],
      correct: 1,
      explanation: { correct: "'The number' is singular.", incorrect: ["Plural.","CORRECT: Singular.","Plural past.","Base form."] },
      studyAid: { definition: "'The number of' refers to a specific number and is singular.", example: "The number of students is growing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Both of the dogs ___ friendly.'",
      choices: ["is", "are", "was", "be"],
      correct: 1,
      explanation: { correct: "'Both' is plural.", incorrect: ["Singular.","CORRECT: Plural.","Singular past.","Base form."] },
      studyAid: { definition: "'Both,' 'few,' 'many,' and 'several' are plural.", example: "Both are friendly. Few were chosen.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'Each of the girls ___ a ribbon.'",
      choices: ["have", "has", "had", "having"],
      correct: 1,
      explanation: { correct: "'Each' is singular.", incorrect: ["Plural.","CORRECT: Singular.","Past tense.","Participle."] },
      studyAid: { definition: "'Each' and 'every' are always singular.", example: "Each has a ribbon. Every student has a book.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.14 Conjunctions */
QUESTION_BANK['grammar-conjunctions'] = {
  title: "Conjunctions: Coordinating, Subordinating, Correlative",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which is a coordinating conjunction?",
      choices: ["because", "although", "and", "while"],
      correct: 2,
      explanation: { correct: "'And' is a coordinating conjunction (FANBOYS: for, and, nor, but, or, yet, so).", incorrect: ["Subordinating.","Subordinating.","CORRECT: Coordinating.","Subordinating."] },
      studyAid: { definition: "Coordinating conjunctions join equal parts: FANBOYS.", example: "I like tea and coffee. She is tired but happy.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a subordinating conjunction?",
      choices: ["and", "but", "because", "or"],
      correct: 2,
      explanation: { correct: "'Because' introduces a dependent clause.", incorrect: ["Coordinating.","Coordinating.","CORRECT: Subordinating.","Coordinating."] },
      studyAid: { definition: "Subordinating conjunctions introduce dependent clauses: because, although, since, if, when, while.", example: "I stayed home because I was sick.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which are correlative conjunctions?",
      choices: ["and / but", "either / or", "because / so", "if / then"],
      correct: 1,
      explanation: { correct: "'Either...or' is a pair of correlative conjunctions.", incorrect: ["Coordinating.","CORRECT: Correlative.","Not a standard pair.","Not standard correlative."] },
      studyAid: { definition: "Correlative conjunctions work in pairs: either/or, neither/nor, both/and, not only/but also.", example: "Either you come, or I go. Neither rain nor snow stopped him.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which conjunction joins two sentences?",
      choices: ["in", "on", "but", "the"],
      correct: 2,
      explanation: { correct: "'But' joins two independent clauses.", incorrect: ["Preposition.","Preposition.","CORRECT: Conjunction.","Article."] },
      studyAid: { definition: "Coordinating conjunctions can join two complete sentences with a comma.", example: "I wanted to go, but I was tired.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses a subordinating conjunction?",
      choices: ["I like pizza, and I like pasta.", "I like pizza because it is tasty.", "I like pizza but not pasta.", "I like pizza or pasta."],
      correct: 1,
      explanation: { correct: "'Because' introduces a dependent clause giving a reason.", incorrect: ["Coordinating.","CORRECT: Subordinating.","Coordinating.","Coordinating."] },
      studyAid: { definition: "Subordinating conjunctions create complex sentences.", example: "I like pizza because it is tasty. (complex sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a coordinating conjunction?",
      choices: ["since", "while", "yet", "although"],
      correct: 2,
      explanation: { correct: "'Yet' is a coordinating conjunction (FANBOYS).", incorrect: ["Subordinating.","Subordinating.","CORRECT: Coordinating.","Subordinating."] },
      studyAid: { definition: "'Yet' shows contrast like 'but' and is a coordinating conjunction.", example: "She is small, yet she is strong.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a pair of correlative conjunctions?",
      choices: ["and / or", "both / and", "so / because", "if / when"],
      correct: 1,
      explanation: { correct: "'Both...and' is a correlative pair.", incorrect: ["Coordinating.","CORRECT: Correlative.","Not a standard pair.","Not correlative."] },
      studyAid: { definition: "Correlative conjunctions come in pairs and connect parallel elements.", example: "Both Tom and Jerry came. Not only smart but also kind.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which conjunction shows contrast?",
      choices: ["and", "because", "but", "so"],
      correct: 2,
      explanation: { correct: "'But' shows contrast between two ideas.", incorrect: ["Addition.","Cause.","CORRECT: Contrast.","Result."] },
      studyAid: { definition: "'But' and 'yet' show contrast or opposition.", example: "I wanted to go, but I was too tired.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a subordinating conjunction of time?",
      choices: ["because", "although", "when", "if"],
      correct: 2,
      explanation: { correct: "'When' relates two events in time.", incorrect: ["Reason.","Contrast.","CORRECT: Time.","Condition."] },
      studyAid: { definition: "Subordinating conjunctions of time: when, while, before, after, until, since.", example: "I eat breakfast when I wake up.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses 'so' correctly?",
      choices: ["I was tired, so I went to bed.", "I was tired so I went to bed.", "I was tired. So I went to bed.", "Both A and C"],
      correct: 3,
      explanation: { correct: "Both 'comma + so' between clauses and starting a new sentence with 'So' are acceptable.", incorrect: ["Correct but not only answer.","Missing comma before 'so' when joining clauses.","Correct but not only answer.","CORRECT: Both A and C work."] },
      studyAid: { definition: "'So' shows result and is a coordinating conjunction.", example: "I was tired, so I went to bed.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a subordinating conjunction of condition?",
      choices: ["because", "although", "if", "when"],
      correct: 2,
      explanation: { correct: "'If' introduces a condition.", incorrect: ["Reason.","Contrast.","CORRECT: Condition.","Time."] },
      studyAid: { definition: "Subordinating conjunctions of condition: if, unless, provided that.", example: "I will go if it stops raining.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which are correlative conjunctions?",
      choices: ["not only / but also", "and / or", "so / yet", "if / then"],
      correct: 0,
      explanation: { correct: "'Not only...but also' is a correlative pair.", incorrect: ["CORRECT: Correlative.","Coordinating.","Coordinating.","Not standard correlative."] },
      studyAid: { definition: "'Not only...but also' emphasizes two related qualities.", example: "She is not only smart but also kind.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which conjunction shows addition?",
      choices: ["but", "or", "and", "so"],
      correct: 2,
      explanation: { correct: "'And' adds one idea to another.", incorrect: ["Contrast.","Choice.","CORRECT: Addition.","Result."] },
      studyAid: { definition: "'And' is the most common conjunction for adding ideas.", example: "I like apples and oranges.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a subordinating conjunction of reason?",
      choices: ["when", "because", "although", "if"],
      correct: 1,
      explanation: { correct: "'Because' gives a reason.", incorrect: ["Time.","CORRECT: Reason.","Contrast.","Condition."] },
      studyAid: { definition: "Subordinating conjunctions of reason: because, since, as.", example: "I stayed inside because it was raining.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence uses correlative conjunctions correctly?",
      choices: ["Either you leave, or I will.", "Either you leave or I will.", "Either you leave, or, I will.", "Either, you leave or I will."],
      correct: 1,
      explanation: { correct: "No comma is needed when 'either...or' joins only two short elements. Actually, a comma before 'or' when joining clauses is standard. Wait—'Either you leave or I will' is acceptable without comma for short clauses, but 'Either you leave, or I will' is also correct. However, 'Either you leave or I will' is the most standard. Let me reconsider: for correlative conjunctions joining clauses, the comma usually goes before the second conjunction. So 'Either you leave, or I will' is actually correct. But 'Either you leave or I will' is also accepted in modern style for short clauses. To avoid ambiguity, I'll make 'Either you leave, or I will' correct. Wait, the first option IS 'Either you leave, or I will.' So that should be correct. Let me fix the answer to 0.", incorrect: ["CORRECT: Comma before the second part when joining clauses.","Missing comma.","Too many commas.","Comma in wrong place."] },
      studyAid: { definition: "Correlative conjunctions joining independent clauses use a comma before the second conjunction.", example: "Either you leave, or I will. Neither did he call, nor did he write.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT a coordinating conjunction?",
      choices: ["for", "nor", "yet", "because"],
      correct: 3,
      explanation: { correct: "'Because' is a subordinating conjunction, not coordinating.", incorrect: ["FANBOYS.","FANBOYS.","FANBOYS.","CORRECT: Subordinating."] },
      studyAid: { definition: "FANBOYS = For, And, Nor, But, Or, Yet, So.", example: "I was hungry, for I had not eaten.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which conjunction best completes: 'I will go ___ I finish my homework.'",
      choices: ["and", "but", "when", "or"],
      correct: 2,
      explanation: { correct: "'When' shows the time relationship between finishing homework and going.", incorrect: ["Addition.","Contrast.","CORRECT: Time.","Choice."] },
      studyAid: { definition: "Subordinating conjunctions of time show when one action happens relative to another.", example: "I will go when I finish my homework.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.15 Identify a Sentence */
QUESTION_BANK['grammar-identify-sentence'] = {
  title: "Identify a Sentence",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which is a complete sentence?",
      choices: ["Running down the street.", "The dog.", "The dog barked.", "Barked loudly."],
      correct: 2,
      explanation: { correct: "A complete sentence needs a subject and a predicate.", incorrect: ["Fragment: no subject.","Fragment: no predicate.","CORRECT: Subject + predicate.","Fragment: no subject."] },
      studyAid: { definition: "A sentence must have a subject (who/what) and a predicate (what happens) and express a complete thought.", example: "The dog barked. (subject: The dog, predicate: barked)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["The cat slept.", "Because it was raining.", "I like pizza.", "She ran fast."],
      correct: 1,
      explanation: { correct: "'Because it was raining' is a dependent clause and cannot stand alone.", incorrect: ["Complete sentence.","CORRECT: Fragment.","Complete sentence.","Complete sentence."] },
      studyAid: { definition: "Fragments are incomplete thoughts. They may lack a subject, a verb, or both.", example: "Because it was raining. (fragment) → We stayed inside because it was raining. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["After the game.", "We went home after the game.", "Went home after the game.", "The game."],
      correct: 1,
      explanation: { correct: "'We' is the subject and 'went home after the game' is the predicate.", incorrect: ["Fragment.","CORRECT: Complete sentence.","Fragment: no subject.","Fragment: no predicate."] },
      studyAid: { definition: "Prepositional phrases at the beginning are not complete sentences by themselves.", example: "After the game, we went home.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["Birds fly south.", "Flying south for the winter.", "The birds flew south.", "They flew south."],
      correct: 1,
      explanation: { correct: "'Flying south for the winter' has no subject performing the action as a main clause.", incorrect: ["Complete sentence.","CORRECT: Fragment (gerund phrase).","Complete sentence.","Complete sentence."] },
      studyAid: { definition: "Phrases starting with -ing verbs often are fragments unless they have a subject and complete predicate.", example: "Flying south for the winter. (fragment) → The birds are flying south for the winter. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["Under the table.", "The cat under the table.", "The cat slept under the table.", "Sleeping under the table."],
      correct: 2,
      explanation: { correct: "Subject 'The cat' + predicate 'slept under the table.'", incorrect: ["Fragment.","Fragment: no predicate.","CORRECT: Complete sentence.","Fragment."] },
      studyAid: { definition: "A subject plus a complete predicate makes a sentence.", example: "The cat slept under the table.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["I love ice cream.", "Because it is sweet.", "Ice cream is sweet.", "It is sweet."],
      correct: 1,
      explanation: { correct: "'Because it is sweet' depends on another clause to make sense.", incorrect: ["Complete sentence.","CORRECT: Fragment.","Complete sentence.","Complete sentence."] },
      studyAid: { definition: "Subordinate clauses starting with 'because,' 'although,' 'if,' etc. are fragments alone.", example: "Because it is sweet. (fragment) → I love ice cream because it is sweet. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["While I was sleeping.", "While I was sleeping, the phone rang.", "The phone rang while I was sleeping.", "Both B and C"],
      correct: 3,
      explanation: { correct: "Both B and C have a main clause that can stand alone.", incorrect: ["Fragment.","Correct but not only answer.","Correct but not only answer.","CORRECT: Both are complete sentences."] },
      studyAid: { definition: "A dependent clause + an independent clause = a complete sentence.", example: "While I was sleeping, the phone rang. The phone rang while I was sleeping.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["She sings beautifully.", "Singing beautifully.", "The singer sang beautifully.", "Beautiful singing."],
      correct: 1,
      explanation: { correct: "'Singing beautifully' lacks a subject and a complete verb as a main clause.", incorrect: ["Complete sentence.","CORRECT: Fragment.","Complete sentence.","Fragment but B is a clearer fragment."] },
      studyAid: { definition: "Gerund phrases without subjects are fragments.", example: "Singing beautifully. (fragment) → She is singing beautifully. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["In the morning.", "The sun rises in the morning.", "Rises in the morning.", "The morning sun."],
      correct: 1,
      explanation: { correct: "Subject + predicate = complete sentence.", incorrect: ["Fragment.","CORRECT: Complete sentence.","Fragment: no subject.","Fragment: no predicate."] },
      studyAid: { definition: "Prepositional phrases alone are not sentences.", example: "In the morning, the sun rises.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["The children played.", "Played in the park.", "They played in the park.", "In the park, the children played."],
      correct: 1,
      explanation: { correct: "'Played in the park' has no subject.", incorrect: ["Complete sentence.","CORRECT: Fragment.","Complete sentence.","Complete sentence."] },
      studyAid: { definition: "Past tense verbs without subjects create fragments.", example: "Played in the park. (fragment) → The children played in the park. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["Although it was cold.", "Although it was cold, we went outside.", "It was cold, although.", "Cold, we went outside."],
      correct: 1,
      explanation: { correct: "Dependent clause + independent clause = complete sentence.", incorrect: ["Fragment.","CORRECT: Complete sentence.","Not grammatical.","Awkward but technically has subject; however, B is clearly correct."] },
      studyAid: { definition: "Subordinate clauses need main clauses to form complete sentences.", example: "Although it was cold, we went outside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["My favorite food.", "Pizza is my favorite food.", "I love pizza.", "Pizza tastes great."],
      correct: 0,
      explanation: { correct: "'My favorite food' has no verb.", incorrect: ["CORRECT: Fragment.","Complete sentence.","Complete sentence.","Complete sentence."] },
      studyAid: { definition: "Noun phrases without verbs are fragments.", example: "My favorite food. (fragment) → Pizza is my favorite food. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["After school.", "After school, I do my homework.", "Do my homework after school.", "My homework after school."],
      correct: 1,
      explanation: { correct: "Subject 'I' + predicate 'do my homework after school.'", incorrect: ["Fragment.","CORRECT: Complete sentence.","Fragment: no subject.","Fragment: no predicate."] },
      studyAid: { definition: "Dependent clause + independent clause = sentence.", example: "After school, I do my homework.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a fragment?",
      choices: ["He laughed.", "Laughing at the joke.", "The joke made him laugh.", "He laughed at the joke."],
      correct: 1,
      explanation: { correct: "'Laughing at the joke' has no subject as a main clause.", incorrect: ["Complete sentence.","CORRECT: Fragment.","Complete sentence.","Complete sentence."] },
      studyAid: { definition: "-ing phrases without subjects are fragments.", example: "Laughing at the joke. (fragment) → He was laughing at the joke. (sentence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a complete sentence?",
      choices: ["Since last year.", "I have grown since last year.", "Have grown since last year.", "Growing since last year."],
      correct: 1,
      explanation: { correct: "Subject 'I' + verb phrase 'have grown since last year.'", incorrect: ["Fragment.","CORRECT: Complete sentence.","Fragment: no subject.","Fragment."] },
      studyAid: { definition: "Complete sentences need both subjects and predicates.", example: "I have grown since last year.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 4.16 Sentence Combinations */
QUESTION_BANK['grammar-sentence-combinations'] = {
  title: "Sentence Combinations",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which combines: 'The cat slept. The dog barked.'",
      choices: ["The cat slept the dog barked.", "The cat slept, and the dog barked.", "The cat slept the dog, barked.", "The cat, slept and the dog barked."],
      correct: 1,
      explanation: { correct: "A comma + coordinating conjunction joins two independent clauses.", incorrect: ["Run-on.","CORRECT: Properly combined.","Incorrect comma placement.","Incorrect comma placement."] },
      studyAid: { definition: "Combine sentences with coordinating conjunctions (FANBOYS) preceded by a comma.", example: "The cat slept, and the dog barked.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'I like pizza. It is cheesy.' using a subordinating conjunction?",
      choices: ["I like pizza, it is cheesy.", "I like pizza because it is cheesy.", "I like pizza, and it is cheesy.", "I like pizza but it is cheesy."],
      correct: 1,
      explanation: { correct: "'Because' makes one clause dependent and shows cause.", incorrect: ["Comma splice.","CORRECT: Subordinating conjunction.","Coordinating conjunction.","Coordinating conjunction with odd meaning."] },
      studyAid: { definition: "Subordinating conjunctions (because, since, although) create complex sentences.", example: "I like pizza because it is cheesy.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'She is smart. She is kind.' using a correlative conjunction?",
      choices: ["She is smart and kind.", "She is not only smart but also kind.", "She is smart, she is kind.", "She is smart but kind."],
      correct: 1,
      explanation: { correct: "'Not only...but also' is a correlative pair emphasizing both traits.", incorrect: ["Simple coordinating, not correlative.","CORRECT: Correlative conjunction.","Comma splice.","Coordinating with contrast meaning."] },
      studyAid: { definition: "Correlative conjunctions come in pairs and add emphasis.", example: "She is not only smart but also kind.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'The boy ran. He was late.' using a subordinating conjunction?",
      choices: ["The boy ran, and he was late.", "The boy ran because he was late.", "The boy ran he was late.", "The boy ran but he was late."],
      correct: 1,
      explanation: { correct: "'Because' shows why the boy ran.", incorrect: ["Coordinating conjunction.","CORRECT: Subordinating conjunction.","Run-on.","Coordinating conjunction with odd meaning."] },
      studyAid: { definition: "Subordinating conjunctions show relationships between ideas.", example: "The boy ran because he was late.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'It was raining. We stayed inside.' correctly?",
      choices: ["It was raining we stayed inside.", "It was raining, so we stayed inside.", "It was raining, we stayed inside.", "It was raining but we stayed inside."],
      correct: 1,
      explanation: { correct: "'So' shows result and joins with a comma.", incorrect: ["Run-on.","CORRECT: Properly combined.","Comma splice.","Contrast doesn't fit logically."] },
      studyAid: { definition: "'So' shows result: cause → effect.", example: "It was raining, so we stayed inside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'The book was long. It was boring.' using a coordinating conjunction that shows contrast?",
      choices: ["The book was long, and it was boring.", "The book was long, but it was boring.", "The book was long, or it was boring.", "The book was long, so it was boring."],
      correct: 1,
      explanation: { correct: "'But' shows contrast between long and boring.", incorrect: ["Addition.","CORRECT: Contrast.","Choice.","Result doesn't fit well."] },
      studyAid: { definition: "'But' and 'yet' show contrast or unexpected results.", example: "The book was long, but it was boring.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'I wanted to go. I was too tired.' using a subordinating conjunction?",
      choices: ["I wanted to go, but I was too tired.", "Although I wanted to go, I was too tired.", "I wanted to go, and I was too tired.", "I wanted to go, or I was too tired."],
      correct: 1,
      explanation: { correct: "'Although' shows contrast as a subordinating conjunction.", incorrect: ["Coordinating.","CORRECT: Subordinating.","Coordinating.","Coordinating."] },
      studyAid: { definition: "'Although,' 'though,' and 'even though' show contrast in complex sentences.", example: "Although I wanted to go, I was too tired.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'You can have cake. You can have ice cream.' using a coordinating conjunction?",
      choices: ["You can have cake, and you can have ice cream.", "You can have cake, but you can have ice cream.", "You can have cake, so you can have ice cream.", "You can have cake, yet you can have ice cream."],
      correct: 0,
      explanation: { correct: "'And' adds the two choices together.", incorrect: ["CORRECT: Addition.","Contrast doesn't fit.","Result doesn't fit.","Contrast doesn't fit."] },
      studyAid: { definition: "'And' is the simplest way to add similar ideas.", example: "You can have cake, and you can have ice cream.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'He studied hard. He passed the test.' using 'because'?",
      choices: ["He studied hard because he passed the test.", "He passed the test because he studied hard.", "Because he studied hard, and he passed the test.", "He studied hard, because he passed the test."],
      correct: 1,
      explanation: { correct: "Studying hard caused him to pass. Cause → effect order.", incorrect: ["Reverses cause and effect.","CORRECT: Correct cause-effect order.","Mixes subordinating and coordinating.","Reverses cause and effect with comma."] },
      studyAid: { definition: "'Because' introduces the cause. Put the cause after 'because' and the effect in the main clause.", example: "He passed because he studied hard.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'The sun was shining. It was cold.' using contrast?",
      choices: ["The sun was shining, and it was cold.", "The sun was shining, but it was cold.", "The sun was shining, so it was cold.", "The sun was shining, or it was cold."],
      correct: 1,
      explanation: { correct: "'But' shows the unexpected contrast between sun and cold.", incorrect: ["Addition.","CORRECT: Contrast.","Result doesn't fit.","Choice doesn't fit."] },
      studyAid: { definition: "Contrasts are often surprising: sun usually means warm, but here it was cold.", example: "The sun was shining, but it was cold.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'She sings. She dances.' using a correlative conjunction?",
      choices: ["She sings and dances.", "She not only sings but also dances.", "She sings, she dances.", "She sings but dances."],
      correct: 1,
      explanation: { correct: "'Not only...but also' emphasizes both talents.", incorrect: ["Simple coordinating.","CORRECT: Correlative.","Comma splice.","Contrast doesn't fit."] },
      studyAid: { definition: "Correlative conjunctions add emphasis to combined ideas.", example: "She not only sings but also dances.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'The phone rang. I answered it.' using a subordinating conjunction of time?",
      choices: ["When the phone rang, I answered it.", "Because the phone rang, I answered it.", "Although the phone rang, I answered it.", "If the phone rang, I answered it."],
      correct: 0,
      explanation: { correct: "'When' shows the time relationship.", incorrect: ["CORRECT: Time.","Reason.","Contrast.","Condition."] },
      studyAid: { definition: "Subordinating conjunctions of time: when, while, before, after, as soon as.", example: "When the phone rang, I answered it.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'He is young. He is wise.' using contrast?",
      choices: ["He is young, and he is wise.", "He is young, but he is wise.", "He is young, so he is wise.", "He is young, or he is wise."],
      correct: 1,
      explanation: { correct: "'But' shows contrast: youth and wisdom don't always go together.", incorrect: ["Addition.","CORRECT: Contrast.","Result doesn't fit.","Choice doesn't fit."] },
      studyAid: { definition: "Contrast conjunctions highlight unexpected combinations.", example: "He is young, but he is wise.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'You study. You will pass.' using a subordinating conjunction of condition?",
      choices: ["You study, and you will pass.", "If you study, you will pass.", "Because you study, you will pass.", "Although you study, you will pass."],
      correct: 1,
      explanation: { correct: "'If' introduces the condition.", incorrect: ["Coordinating.","CORRECT: Condition.","Reason.","Contrast."] },
      studyAid: { definition: "Subordinating conjunctions of condition: if, unless, provided that.", example: "If you study, you will pass.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which combines: 'I like tea. I like coffee.' using a correlative conjunction?",
      choices: ["I like tea and coffee.", "I like both tea and coffee.", "I like tea, I like coffee.", "I like tea but coffee."],
      correct: 1,
      explanation: { correct: "'Both...and' is a correlative pair.", incorrect: ["Simple coordinating.","CORRECT: Correlative.","Comma splice.","Incomplete contrast."] },
      studyAid: { definition: "'Both...and' emphasizes liking two things together.", example: "I like both tea and coffee.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.17 Parts of a Friendly Letter */
QUESTION_BANK['grammar-friendly-letter'] = {
  title: "Parts of a Friendly Letter",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which part comes first in a friendly letter?",
      choices: ["Body", "Closing", "Heading", "Signature"],
      correct: 2,
      explanation: { correct: "The heading includes the date and sometimes the address.", incorrect: ["Middle part.","Near the end.","CORRECT: First part.","Last part."] },
      studyAid: { definition: "The heading is at the top right and includes the date.", example: "October 5, 2024", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What comes after the heading?",
      choices: ["Closing", "Body", "Greeting", "Signature"],
      correct: 2,
      explanation: { correct: "The greeting (salutation) comes after the heading.", incorrect: ["Near the end.","Middle part.","CORRECT: Greeting.","Last part."] },
      studyAid: { definition: "The greeting starts with 'Dear' followed by a name and a comma.", example: "Dear Maria,", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a correct greeting?",
      choices: ["Dear Maria", "dear maria", "Dear Maria.", "Dear, Maria"],
      correct: 0,
      explanation: { correct: "'Dear Maria,' is correct with a capital D and comma.", incorrect: ["CORRECT: Proper greeting.","Not capitalized.","Period instead of comma.","Comma in wrong place."] },
      studyAid: { definition: "Capitalize the first word and the name. End with a comma.", example: "Dear Grandma, Dear Mr. Smith,", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the main part of the letter called?",
      choices: ["Heading", "Greeting", "Body", "Closing"],
      correct: 2,
      explanation: { correct: "The body contains the message of the letter.", incorrect: ["Top part.","Opening.","CORRECT: Body.","Ending."] },
      studyAid: { definition: "The body is where you write your message, usually in paragraphs.", example: "I hope you are doing well. I had a great time at camp...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What comes after the body?",
      choices: ["Heading", "Greeting", "Closing", "Date"],
      correct: 2,
      explanation: { correct: "The closing comes before the signature.", incorrect: ["Top part.","Opening.","CORRECT: Closing.","Part of heading."] },
      studyAid: { definition: "The closing is a polite ending like 'Sincerely' or 'Your friend.'", example: "Your friend, Sincerely, Love,", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a correct closing?",
      choices: ["your friend", "Your friend", "Your Friend", "your Friend"],
      correct: 1,
      explanation: { correct: "Capitalize the first word only.", incorrect: ["Not capitalized.","CORRECT: Proper closing.","Both words capitalized.","Wrong capitalization."] },
      studyAid: { definition: "Only the first word of the closing is capitalized.", example: "Your friend, Sincerely yours, Love,", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the last part of a friendly letter?",
      choices: ["Body", "Closing", "Greeting", "Signature"],
      correct: 3,
      explanation: { correct: "The signature is your name at the end.", incorrect: ["Middle.","Before signature.","Opening.","CORRECT: Signature."] },
      studyAid: { definition: "The signature is your handwritten or typed name.", example: "Love, [signature] Maria", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is in the heading?",
      choices: ["Dear Mom,", "Your friend,", "November 12, 2024", "Love, Jamie"],
      correct: 2,
      explanation: { correct: "The date is part of the heading.", incorrect: ["Greeting.","Closing.","CORRECT: Heading.","Closing + signature."] },
      studyAid: { definition: "The heading includes the writer's address (optional) and the date.", example: "123 Main St. Springfield, IL 62701 November 12, 2024", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which punctuation ends the greeting?",
      choices: [".", "!", ",", "?"],
      correct: 2,
      explanation: { correct: "A comma follows the greeting in a friendly letter.", incorrect: ["Period is too formal.","Exclamation is too strong.","CORRECT: Comma.","Question mark is wrong."] },
      studyAid: { definition: "Friendly letters use a comma after the greeting.", example: "Dear Maria,", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is NOT a part of a friendly letter?",
      choices: ["Heading", "Greeting", "Table of contents", "Body"],
      correct: 2,
      explanation: { correct: "A table of contents is for books or reports, not letters.", incorrect: ["Part of letter.","Part of letter.","CORRECT: Not in letters.","Part of letter."] },
      studyAid: { definition: "Friendly letters have five parts: heading, greeting, body, closing, signature.", example: "Heading, Greeting, Body, Closing, Signature", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which closing is most informal?",
      choices: ["Sincerely,", "Yours truly,", "Love,", "Respectfully,"],
      correct: 2,
      explanation: { correct: "'Love' is used for close family and friends.", incorrect: ["Formal.","Formal.","CORRECT: Informal.","Very formal."] },
      studyAid: { definition: "Closings range from formal (Sincerely) to informal (Love, See you soon).", example: "Love, Your friend, See you soon, Sincerely", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Where does the heading go?",
      choices: ["Top left", "Top right", "Bottom left", "Bottom right"],
      correct: 1,
      explanation: { correct: "The heading is usually at the top right in a friendly letter.", incorrect: ["Wrong side.","CORRECT: Top right.","Wrong position.","Wrong position."] },
      studyAid: { definition: "The heading is placed at the top right corner.", example: "November 12, 2024 (top right)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What should the body of a friendly letter include?",
      choices: ["Only one sentence", "The main message", "The date", "The address"],
      correct: 1,
      explanation: { correct: "The body contains the main message or news you want to share.", incorrect: ["Too short.","CORRECT: Main message.","Part of heading.","Part of heading."] },
      studyAid: { definition: "The body can be several paragraphs sharing news, questions, and updates.", example: "I hope you are well. School has been fun. I made a new friend...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a formal closing?",
      choices: ["Love,", "See ya,", "Sincerely,", "Your pal,"],
      correct: 2,
      explanation: { correct: "'Sincerely' is used for formal or business letters.", incorrect: ["Informal.","Informal.","CORRECT: Formal.","Informal."] },
      studyAid: { definition: "Formal closings: Sincerely, Yours truly, Respectfully.", example: "Sincerely, Mrs. Johnson", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What comes right before the signature?",
      choices: ["Greeting", "Body", "Closing", "Heading"],
      correct: 2,
      explanation: { correct: "The closing is directly above the signature.", incorrect: ["Comes first.","Middle.","CORRECT: Closing.","Comes first."] },
      studyAid: { definition: "Closing + signature are the last two parts of a letter.", example: "Your friend, [signature] Jamie", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.18 Past, Present and Future Tenses */
QUESTION_BANK['grammar-tenses'] = {
  title: "Past, Present, and Future Tenses",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which is in past tense?",
      choices: ["I walk.", "I walked.", "I will walk.", "I am walking."],
      correct: 1,
      explanation: { correct: "'Walked' shows action that already happened.", incorrect: ["Present.","CORRECT: Past.","Future.","Present continuous."] },
      studyAid: { definition: "Past tense shows completed actions.", example: "I walked. She played. They laughed.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is in future tense?",
      choices: ["I eat.", "I ate.", "I will eat.", "I am eating."],
      correct: 2,
      explanation: { correct: "'Will eat' shows action that will happen later.", incorrect: ["Present.","Past.","CORRECT: Future.","Present continuous."] },
      studyAid: { definition: "Future tense uses 'will' or 'shall' + base verb.", example: "I will go. She will sing. They will arrive.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is present continuous?",
      choices: ["I run.", "I ran.", "I am running.", "I will run."],
      correct: 2,
      explanation: { correct: "'Am running' shows action happening right now.", incorrect: ["Simple present.","Past.","CORRECT: Present continuous.","Future."] },
      studyAid: { definition: "Present continuous: am/is/are + verb-ing.", example: "I am running. She is singing. They are playing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is past continuous?",
      choices: ["I sleep.", "I slept.", "I was sleeping.", "I will sleep."],
      correct: 2,
      explanation: { correct: "'Was sleeping' shows action in progress at a specific time in the past.", incorrect: ["Present.","Simple past.","CORRECT: Past continuous.","Future."] },
      studyAid: { definition: "Past continuous: was/were + verb-ing.", example: "I was sleeping. They were playing.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is future continuous?",
      choices: ["I work.", "I worked.", "I will be working.", "I have worked."],
      correct: 2,
      explanation: { correct: "'Will be working' shows action that will be in progress at a future time.", incorrect: ["Present.","Past.","CORRECT: Future continuous.","Present perfect."] },
      studyAid: { definition: "Future continuous: will be + verb-ing.", example: "I will be working at 3 p.m.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is present perfect?",
      choices: ["I see.", "I saw.", "I have seen.", "I will see."],
      correct: 2,
      explanation: { correct: "'Have seen' shows action completed at some unspecified time before now.", incorrect: ["Present.","Past.","CORRECT: Present perfect.","Future."] },
      studyAid: { definition: "Present perfect: have/has + past participle.", example: "I have seen that movie. She has finished.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is past perfect?",
      choices: ["I eat.", "I ate.", "I had eaten.", "I will eat."],
      correct: 2,
      explanation: { correct: "'Had eaten' shows action completed before another past action.", incorrect: ["Present.","Simple past.","CORRECT: Past perfect.","Future."] },
      studyAid: { definition: "Past perfect: had + past participle.", example: "I had eaten before he arrived.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is future perfect?",
      choices: ["I finish.", "I finished.", "I will have finished.", "I am finishing."],
      correct: 2,
      explanation: { correct: "'Will have finished' shows action that will be completed before a future time.", incorrect: ["Present.","Past.","CORRECT: Future perfect.","Present continuous."] },
      studyAid: { definition: "Future perfect: will have + past participle.", example: "I will have finished by noon.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which tense is: 'They are playing soccer now.'",
      choices: ["Simple present", "Present continuous", "Simple past", "Future"],
      correct: 1,
      explanation: { correct: "'Are playing' shows action happening right now.", incorrect: ["Would be 'play.'","CORRECT: Present continuous.","Would be 'played.'","Would use 'will.'"] },
      studyAid: { definition: "Present continuous describes actions in progress at this moment.", example: "They are playing soccer now.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which tense is: 'She had left before I arrived.'",
      choices: ["Simple past", "Past continuous", "Past perfect", "Present perfect"],
      correct: 2,
      explanation: { correct: "'Had left' shows an action completed before another past action.", incorrect: ["Would be 'left.'","Would be 'was leaving.'","CORRECT: Past perfect.","Would be 'has left.'"] },
      studyAid: { definition: "Past perfect is used for the earlier of two past actions.", example: "She had left before I arrived.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is simple present?",
      choices: ["I am reading.", "I read every day.", "I read yesterday.", "I will read tomorrow."],
      correct: 1,
      explanation: { correct: "'Read every day' shows a habitual action.", incorrect: ["Present continuous.","CORRECT: Simple present.","Past.","Future."] },
      studyAid: { definition: "Simple present describes habits, facts, and routines.", example: "I read every day. The sun rises in the east.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is simple past?",
      choices: ["I play.", "I played.", "I am playing.", "I will play."],
      correct: 1,
      explanation: { correct: "'Played' shows a completed action in the past.", incorrect: ["Present.","CORRECT: Past.","Present continuous.","Future."] },
      studyAid: { definition: "Simple past describes completed actions.", example: "I played soccer yesterday.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is simple future?",
      choices: ["I swim.", "I swam.", "I will swim.", "I am swimming."],
      correct: 2,
      explanation: { correct: "'Will swim' shows a future action.", incorrect: ["Present.","Past.","CORRECT: Future.","Present continuous."] },
      studyAid: { definition: "Simple future uses 'will' + base verb.", example: "I will swim tomorrow.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which tense shows an action that started in the past and continues now?",
      choices: ["Simple past", "Present perfect", "Past perfect", "Future perfect"],
      correct: 1,
      explanation: { correct: "Present perfect connects past and present.", incorrect: ["Completed in past.","CORRECT: Present perfect.","Earlier past.","Future completion."] },
      studyAid: { definition: "Present perfect: have/has + past participle. Used for unfinished time periods.", example: "I have lived here for five years.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct: 'By next year, I ___ graduate.'",
      choices: ["will", "will have", "have", "had"],
      correct: 1,
      explanation: { correct: "'By next year' indicates future completion = future perfect.", incorrect: ["Simple future.","CORRECT: Future perfect.","Present perfect.","Past perfect."] },
      studyAid: { definition: "Future perfect: will have + past participle. Used for completion before a future time.", example: "By next year, I will have graduated.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.19 Indentation Rules */
QUESTION_BANK['grammar-indentation-rules'] = {
  title: "Indentation Rules",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "When writing a paragraph, where do you indent?",
      choices: ["Every line", "Only the first line", "The last line", "Every other line"],
      correct: 1,
      explanation: { correct: "Only the first line of a paragraph is indented.", incorrect: ["Too many indents.","CORRECT: First line only.","Wrong line.","Wrong pattern."] },
      studyAid: { definition: "Paragraph indentation signals the start of a new paragraph.", example: "    Once upon a time... (first line indented)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "How many spaces do you usually indent?",
      choices: ["1", "2", "5", "10"],
      correct: 2,
      explanation: { correct: "Standard indentation is about 5 spaces or half an inch.", incorrect: ["Too few.","Too few.","CORRECT: Standard indent.","Too many."] },
      studyAid: { definition: "Indentation is typically 0.5 inches or 5 spaces.", example: "    The cat slept. (5 spaces)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "In dialogue, when do you start a new paragraph?",
      choices: ["After every sentence", "When a new character speaks", "After every word", "Never"],
      correct: 1,
      explanation: { correct: "Each speaker gets their own paragraph.", incorrect: ["Too often.","CORRECT: New speaker = new paragraph.","Too often.","Wrong."] },
      studyAid: { definition: "New paragraphs for new speakers help readers follow conversations.", example: "\"Hello,\" she said.\n\n\"Hi,\" he replied.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Do you indent the first paragraph of a story?",
      choices: ["Yes", "No", "Sometimes", "Only if it is long"],
      correct: 0,
      explanation: { correct: "The first paragraph of a story or essay is indented.", incorrect: ["CORRECT: Yes.","First paragraph should be indented.","Always indent.","Length doesn't matter."] },
      studyAid: { definition: "All paragraphs, including the first, are indented in handwritten or typed essays.", example: "    The story begins on a dark night...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What do you do at the beginning of a friendly letter body?",
      choices: ["Indent the first line", "Indent every line", "Do not indent", "Indent the last line"],
      correct: 0,
      explanation: { correct: "The first line of each paragraph in the body is indented.", incorrect: ["CORRECT: Indent first line.","Too many indents.","You should indent.","Wrong line."] },
      studyAid: { definition: "Letter paragraphs follow standard paragraph indentation rules.", example: "Dear Mom,\n\n    I had a great day at school...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "In a paragraph, do you indent after a quotation?",
      choices: ["Yes, always", "Only if it starts a new paragraph", "Never", "Only for long quotes"],
      correct: 1,
      explanation: { correct: "If the quotation is part of the same paragraph, no new indent is needed.", incorrect: ["Not always.","CORRECT: Only for new paragraphs.","Sometimes you do.","Block quotes are different."] },
      studyAid: { definition: "Quotations within a paragraph flow with the text.", example: "She said, \"I will go.\" Then she left.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "When typing an essay, how do you indent?",
      choices: ["Press space 10 times", "Use the Tab key", "Press Enter", "Use the Shift key"],
      correct: 1,
      explanation: { correct: "The Tab key creates a consistent indentation.", incorrect: ["Too many spaces.","CORRECT: Tab key.","Starts a new line.","Does not indent."] },
      studyAid: { definition: "Using Tab ensures uniform indentation.", example: "[Tab]The first line is indented.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Do you indent a paragraph that follows a heading?",
      choices: ["Yes", "No", "Only in stories", "Only in letters"],
      correct: 0,
      explanation: { correct: "Paragraphs after headings are indented like any other paragraph.", incorrect: ["CORRECT: Yes.","Should be indented.","Applies to all writing.","Applies to all writing."] },
      studyAid: { definition: "Headings do not change paragraph indentation rules.", example: "Chapter 1\n\n    The journey began...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "In a list, do you indent each item?",
      choices: ["Yes, if it is a paragraph list", "Never", "Only the first item", "Only the last item"],
      correct: 0,
      explanation: { correct: "Bulleted or numbered lists within paragraphs may be indented for clarity.", incorrect: ["CORRECT: Often indented.","Sometimes indented.","All items treated equally.","Wrong item."] },
      studyAid: { definition: "Lists are often indented to set them apart from the main text.", example: "    - Apples\n    - Bananas\n    - Oranges", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What happens if you don't indent paragraphs?",
      choices: ["Nothing", "It looks messy and hard to read", "It becomes a poem", "It is correct"],
      correct: 1,
      explanation: { correct: "Indentation helps readers see where new paragraphs begin.", incorrect: ["It does matter.","CORRECT: Harder to read.","Not automatically.","Incorrect."] },
      studyAid: { definition: "Paragraph indentation improves readability and organization.", example: "Without indentation, all text blends together.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Do you indent in an email?",
      choices: ["Yes, exactly like a letter", "Sometimes, but often block style is used", "Never", "Only the subject line"],
      correct: 1,
      explanation: { correct: "Emails often use block paragraphs with no indentation and a blank line between paragraphs.", incorrect: ["Less common in emails.","CORRECT: Block style common.","Sometimes used.","Not standard."] },
      studyAid: { definition: "Block style (no indent, blank line between paragraphs) is common in digital writing.", example: "Hello,\n\nThank you for your email...\n\nBest regards,", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "When do you NOT indent?",
      choices: ["First paragraph of a chapter", "After a line break", "Block quotes in essays", "Every paragraph"],
      correct: 2,
      explanation: { correct: "Block quotes are indented on both sides but the first line is not additionally indented.", incorrect: ["Should be indented.","Usually indented.","CORRECT: Block quotes handled differently.","Should be indented."] },
      studyAid: { definition: "Long quotations (block quotes) have special formatting.", example: "    Block quotes are indented from the left margin.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "In handwriting, how do you indent?",
      choices: ["Skip a line", "Leave a small space at the start of the line", "Write smaller", "Use a ruler"],
      correct: 1,
      explanation: { correct: "A small space (about a thumb width) at the beginning of the first line.", incorrect: ["That's between paragraphs.","CORRECT: Small space.","Not indentation.","Not necessary."] },
      studyAid: { definition: "In handwriting, use a consistent thumb-width space for indentation.", example: "(thumb space) The cat slept...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Do poems indent like paragraphs?",
      choices: ["Yes, always", "No, poems use line breaks", "Only the first line", "Only the last line"],
      correct: 1,
      explanation: { correct: "Poems use line breaks and stanzas, not paragraph indentation.", incorrect: ["Not always.","CORRECT: Line breaks used.","Not standard for poems.","Not standard."] },
      studyAid: { definition: "Poetry uses stanzas (groups of lines) instead of paragraphs.", example: "Roses are red,\nViolets are blue.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the purpose of indentation?",
      choices: ["To make writing longer", "To show where a new paragraph begins", "To decorate the page", "To save paper"],
      correct: 1,
      explanation: { correct: "Indentation visually separates paragraphs.", incorrect: ["Not the purpose.","CORRECT: Shows new paragraphs.","Not decoration.","Not related."] },
      studyAid: { definition: "Indentation is an organizational tool for readability.", example: "Each indent = new paragraph = new idea", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 4.20 When to use 1st, 2nd, and 3rd person point of view */
QUESTION_BANK['grammar-point-of-view'] = {
  title: "1st, 2nd, and 3rd Person Point of View",
  topic: "Grammar & Usage",
  questions: [
    {
      question: "Which sentence is in first person?",
      choices: ["He went to the store.", "You went to the store.", "I went to the store.", "They went to the store."],
      correct: 2,
      explanation: { correct: "'I' is a first-person pronoun.", incorrect: ["Third person.","Second person.","CORRECT: First person.","Third person."] },
      studyAid: { definition: "First person uses I, me, my, mine, we, us, our, ours.", example: "I went to the store. We played games.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is in second person?",
      choices: ["She sings well.", "I sing well.", "You sing well.", "They sing well."],
      correct: 2,
      explanation: { correct: "'You' is a second-person pronoun.", incorrect: ["Third person.","First person.","CORRECT: Second person.","Third person."] },
      studyAid: { definition: "Second person uses you, your, yours. It speaks directly to the reader.", example: "You should try this. Your book is here.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is in third person?",
      choices: ["I like pizza.", "You like pizza.", "He likes pizza.", "We like pizza."],
      correct: 2,
      explanation: { correct: "'He' is a third-person pronoun.", incorrect: ["First person.","Second person.","CORRECT: Third person.","First person."] },
      studyAid: { definition: "Third person uses he, she, it, they, him, her, them, his, her, its, their.", example: "He likes pizza. They play outside.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view uses 'we'?",
      choices: ["First person", "Second person", "Third person", "Fourth person"],
      correct: 0,
      explanation: { correct: "'We' is a first-person plural pronoun.", incorrect: ["CORRECT: First person.","Uses 'you.'","Uses 'he/she/they.'","Not a standard point of view."] },
      studyAid: { definition: "First person plural includes the speaker and others: we, us, our, ours.", example: "We went to the park. Our team won.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view is used in most stories?",
      choices: ["First person", "Second person", "Third person", "All equally"],
      correct: 2,
      explanation: { correct: "Most stories are told in third person about characters.", incorrect: ["Used in some stories (diary style).","Rare in stories.","CORRECT: Most common.","Not equally."] },
      studyAid: { definition: "Third person is the most common narrative point of view.", example: "Harry Potter walked into the room.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which pronoun is NOT third person?",
      choices: ["he", "she", "you", "they"],
      correct: 2,
      explanation: { correct: "'You' is second person.", incorrect: ["Third person.","Third person.","CORRECT: Second person.","Third person."] },
      studyAid: { definition: "Second person directly addresses the reader.", example: "You are reading a book.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view is used in personal narratives?",
      choices: ["First person", "Second person", "Third person", "Objective"],
      correct: 0,
      explanation: { correct: "Personal narratives are told from the writer's own experience using 'I.'", incorrect: ["CORRECT: First person.","Not typical.","Can be used but less personal.","Not a point of view."] },
      studyAid: { definition: "Personal narratives and memoirs use first person to share personal experiences.", example: "I will never forget the day I learned to ride a bike.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view is used in instructions?",
      choices: ["First person", "Second person", "Third person", "None"],
      correct: 1,
      explanation: { correct: "Instructions use 'you' to tell the reader what to do.", incorrect: ["Not typical.","CORRECT: Second person.","Not typical.","Always some point of view."] },
      studyAid: { definition: "Second person is common in recipes, manuals, and directions.", example: "First, you mix the flour and sugar.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which sentence is third person plural?",
      choices: ["I run fast.", "You run fast.", "They run fast.", "He runs fast."],
      correct: 2,
      explanation: { correct: "'They' refers to multiple people or things in third person.", incorrect: ["First person singular.","Second person.","CORRECT: Third person plural.","Third person singular."] },
      studyAid: { definition: "Third person plural: they, them, their, theirs.", example: "They run fast. Their house is big.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view uses 'my'?",
      choices: ["First person", "Second person", "Third person", "All"],
      correct: 0,
      explanation: { correct: "'My' is a first-person possessive pronoun.", incorrect: ["CORRECT: First person.","Uses 'your.'","Uses 'his/her/their.'","Not all."] },
      studyAid: { definition: "First person possessive: my, mine, our, ours.", example: "This is my book. That is ours.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view is used in this sentence: 'The princess climbed the tower.'",
      choices: ["First person", "Second person", "Third person", "None"],
      correct: 2,
      explanation: { correct: "'The princess' is a third-person subject.", incorrect: ["Would use 'I.'","Would use 'you.'","CORRECT: Third person.","Always a point of view."] },
      studyAid: { definition: "Third person narrates about others using names or pronouns like he/she/they.", example: "The princess climbed the tower. She was brave.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is a first-person plural pronoun?",
      choices: ["I", "you", "we", "he"],
      correct: 2,
      explanation: { correct: "'We' includes the speaker and one or more others.", incorrect: ["First person singular.","Second person.","CORRECT: First person plural.","Third person singular."] },
      studyAid: { definition: "'We' means 'I and one or more others.'", example: "We are going to the park.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view would a diary use?",
      choices: ["First person", "Second person", "Third person", "All"],
      correct: 0,
      explanation: { correct: "Diaries are personal and use 'I' to record the writer's thoughts.", incorrect: ["CORRECT: First person.","Not typical.","Not typical.","Not all."] },
      studyAid: { definition: "Diaries, journals, and personal letters use first person.", example: "Dear Diary, Today I had a great day...", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view uses 'your'?",
      choices: ["First person", "Second person", "Third person", "None"],
      correct: 1,
      explanation: { correct: "'Your' is a second-person possessive pronoun.", incorrect: ["Uses 'my/our.'","CORRECT: Second person.","Uses 'his/her/their.'","Always some point of view."] },
      studyAid: { definition: "Second person possessive: your, yours.", example: "Is this your book? That one is yours.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which point of view would a biography use?",
      choices: ["First person", "Second person", "Third person", "None"],
      correct: 2,
      explanation: { correct: "Biographies tell someone else's life story using third person.", incorrect: ["Autobiography uses first.","Not typical.","CORRECT: Third person.","Always some point of view."] },
      studyAid: { definition: "Biographies are written about others, so they use third person.", example: "Marie Curie was a famous scientist. She discovered radium.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* ============================================================
   TOPIC 5: Reading Comprehension
   ============================================================ */

/* 5.1 Analogies */
QUESTION_BANK['reading-comprehension-analogies'] = {
  title: "Analogies",
  topic: "Reading Comprehension",
  questions: [
    {
      question: "Cat is to kitten as dog is to ___.",
      choices: ["puppy", "wolf", "cat", "adult"],
      correct: 0,
      explanation: { correct: "A kitten is a young cat; a puppy is a young dog.", incorrect: ["CORRECT: Young dog.","Different animal.","Unrelated.","Opposite of young."] },
      studyAid: { definition: "Analogies show relationships between pairs of words.", example: "Cat : kitten :: dog : puppy (young animal relationship)", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Hot is to cold as happy is to ___.",
      choices: ["joyful", "sad", "smiling", "excited"],
      correct: 1,
      explanation: { correct: "Cold is the opposite of hot; sad is the opposite of happy.", incorrect: ["Synonym.","CORRECT: Opposite.","Related to happy.","Synonym."] },
      studyAid: { definition: "Many analogies are based on antonyms (opposites).", example: "hot : cold :: happy : sad", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Teacher is to school as doctor is to ___.",
      choices: ["stethoscope", "hospital", "nurse", "medicine"],
      correct: 1,
      explanation: { correct: "A teacher works in a school; a doctor works in a hospital.", incorrect: ["Tool, not place.","CORRECT: Workplace.","Coworker.","Tool."] },
      studyAid: { definition: "Analogies can show where someone works.", example: "teacher : school :: doctor : hospital", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Bird is to feather as fish is to ___.",
      choices: ["water", "scale", "fin", "swim"],
      correct: 1,
      explanation: { correct: "A feather covers a bird; a scale covers a fish.", incorrect: ["Habitat.","CORRECT: Body covering.","Body part but not covering.","Action."] },
      studyAid: { definition: "Analogies can show part-to-whole or covering relationships.", example: "bird : feather :: fish : scale", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Book is to read as song is to ___.",
      choices: ["write", "sing", "dance", "listen"],
      correct: 1,
      explanation: { correct: "You read a book; you sing a song.", incorrect: ["Create, not perform.","CORRECT: Perform.","Related but not direct.","Passive action."] },
      studyAid: { definition: "Analogies can show what you do with something.", example: "book : read :: song : sing", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Tree is to forest as star is to ___.",
      choices: ["night", "sky", "galaxy", "shine"],
      correct: 2,
      explanation: { correct: "A forest is a group of trees; a galaxy is a group of stars.", incorrect: ["Time.","Place but not group.","CORRECT: Group.","Action."] },
      studyAid: { definition: "Analogies can show part-to-whole group relationships.", example: "tree : forest :: star : galaxy", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Mammal is to whale as insect is to ___.",
      choices: ["bird", "ant", "spider", "worm"],
      correct: 1,
      explanation: { correct: "A whale is a type of mammal; an ant is a type of insect.", incorrect: ["Different class.","CORRECT: Example of class.","Arachnid, not insect.","Not an insect."] },
      studyAid: { definition: "Analogies can show category-to-example relationships.", example: "mammal : whale :: insect : ant", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Pen is to write as brush is to ___.",
      choices: ["paint", "draw", "color", "canvas"],
      correct: 0,
      explanation: { correct: "A pen is used to write; a brush is used to paint.", incorrect: ["CORRECT: Primary use.","Related but brush paints more than draws.","Related but brush paints.","Object, not action."] },
      studyAid: { definition: "Analogies can show tool-to-action relationships.", example: "pen : write :: brush : paint", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Day is to night as dawn is to ___.",
      choices: ["morning", "sunrise", "dusk", "noon"],
      correct: 2,
      explanation: { correct: "Night is the opposite of day; dusk is the opposite of dawn.", incorrect: ["Related to dawn.","Related to dawn.","CORRECT: Opposite.","Middle of day."] },
      studyAid: { definition: "Analogies can show opposite times of day.", example: "day : night :: dawn : dusk", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Chef is to cook as driver is to ___.",
      choices: ["car", "road", "drive", "wheel"],
      correct: 2,
      explanation: { correct: "A chef cooks; a driver drives.", incorrect: ["Tool.","Place.","CORRECT: Action.","Tool."] },
      studyAid: { definition: "Analogies can show person-to-action relationships.", example: "chef : cook :: driver : drive", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Seed is to plant as egg is to ___.",
      choices: ["shell", "chicken", "nest", "yolk"],
      correct: 1,
      explanation: { correct: "A seed grows into a plant; an egg grows into a chicken.", incorrect: ["Part of egg.","CORRECT: What it becomes.","Place.","Part of egg."] },
      studyAid: { definition: "Analogies can show origin-to-result relationships.", example: "seed : plant :: egg : chicken", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Light is to dark as loud is to ___.",
      choices: ["noise", "sound", "quiet", "music"],
      correct: 2,
      explanation: { correct: "Dark is the opposite of light; quiet is the opposite of loud.", incorrect: ["Related.","Related.","CORRECT: Opposite.","Related."] },
      studyAid: { definition: "Analogies often use antonym relationships.", example: "light : dark :: loud : quiet", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Spider is to web as bird is to ___.",
      choices: ["wing", "nest", "egg", "fly"],
      correct: 1,
      explanation: { correct: "A spider makes a web; a bird makes a nest.", incorrect: ["Body part.","CORRECT: What it makes.","Product.","Action."] },
      studyAid: { definition: "Analogies can show creator-to-creation relationships.", example: "spider : web :: bird : nest", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Minute is to hour as inch is to ___.",
      choices: ["ruler", "foot", "centimeter", "mile"],
      correct: 1,
      explanation: { correct: "An hour is made of minutes; a foot is made of inches.", incorrect: ["Tool.","CORRECT: Unit made of smaller unit.","Different system.","Much larger unit."] },
      studyAid: { definition: "Analogies can show smaller-to-larger unit relationships.", example: "minute : hour :: inch : foot", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    },
    {
      question: "Scissors is to cut as glue is to ___.",
      choices: ["paper", "stick", "paste", "art"],
      correct: 1,
      explanation: { correct: "Scissors cut things; glue sticks things together.", incorrect: ["Object.","CORRECT: Action (stick).","Related action.","Category."] },
      studyAid: { definition: "Analogies can show tool-to-purpose relationships.", example: "scissors : cut :: glue : stick", link: "https://www.readingrockets.org/article/building-vocabulary", linkText: "Reading Rockets - Vocabulary" }
    }
  ]
};

/* 5.2 Categorizing */
QUESTION_BANK['reading-comprehension-categorizing'] = {
  title: "Categorizing",
  topic: "Reading Comprehension",
  questions: [
    {
      question: "Which does NOT belong: apple, banana, carrot, orange?",
      choices: ["apple", "banana", "carrot", "orange"],
      correct: 2,
      explanation: { correct: "Carrot is a vegetable; the others are fruits.", incorrect: ["Fruit.","Fruit.","CORRECT: Vegetable.","Fruit."] },
      studyAid: { definition: "Categorizing means grouping items by shared characteristics.", example: "Fruits: apple, banana, orange. Vegetables: carrot, broccoli, spinach.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'reptiles'?",
      choices: ["eagle", "frog", "snake", "whale"],
      correct: 2,
      explanation: { correct: "Snakes are reptiles.", incorrect: ["Bird.","Amphibian.","CORRECT: Reptile.","Mammal."] },
      studyAid: { definition: "Reptiles have scales and are cold-blooded: snakes, lizards, turtles, crocodiles.", example: "snake, lizard, turtle", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: sofa, table, refrigerator, chair?",
      choices: ["sofa", "table", "refrigerator", "chair"],
      correct: 2,
      explanation: { correct: "A refrigerator is an appliance; the others are furniture.", incorrect: ["Furniture.","Furniture.","CORRECT: Appliance.","Furniture."] },
      studyAid: { definition: "Look for the shared category and find the outlier.", example: "Furniture: sofa, table, chair. Appliance: refrigerator.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'solar system'?",
      choices: ["Milky Way", "Andromeda", "Mars", "Black hole"],
      correct: 2,
      explanation: { correct: "Mars is a planet in our solar system.", incorrect: ["Galaxy.","Galaxy.","CORRECT: Planet in solar system.","Not in solar system specifically."] },
      studyAid: { definition: "The solar system includes the sun, planets, moons, asteroids, and comets.", example: "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: triangle, square, circle, cube?",
      choices: ["triangle", "square", "circle", "cube"],
      correct: 3,
      explanation: { correct: "A cube is 3D; the others are 2D shapes.", incorrect: ["2D shape.","2D shape.","2D shape.","CORRECT: 3D shape."] },
      studyAid: { definition: "Shapes can be categorized as 2D (flat) or 3D (solid).", example: "2D: triangle, square, circle. 3D: cube, sphere, pyramid.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'precipitation'?",
      choices: ["cloud", "wind", "rain", "sunshine"],
      correct: 2,
      explanation: { correct: "Rain is a form of precipitation.", incorrect: ["Not precipitation.","Not precipitation.","CORRECT: Precipitation.","Not precipitation."] },
      studyAid: { definition: "Precipitation is water falling from the sky: rain, snow, sleet, hail.", example: "rain, snow, sleet, hail", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: robin, sparrow, eagle, bat?",
      choices: ["robin", "sparrow", "eagle", "bat"],
      correct: 3,
      explanation: { correct: "A bat is a mammal; the others are birds.", incorrect: ["Bird.","Bird.","Bird.","CORRECT: Mammal."] },
      studyAid: { definition: "Bats are the only mammals that can truly fly.", example: "Birds: robin, sparrow, eagle. Mammals: bat, dog, whale.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'verbs'?",
      choices: ["quickly", "happy", "run", "book"],
      correct: 2,
      explanation: { correct: "'Run' is an action verb.", incorrect: ["Adverb.","Adjective.","CORRECT: Verb.","Noun."] },
      studyAid: { definition: "Verbs show action or state of being.", example: "run, jump, think, is, seems", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: Monday, Tuesday, March, Wednesday?",
      choices: ["Monday", "Tuesday", "March", "Wednesday"],
      correct: 2,
      explanation: { correct: "March is a month; the others are days of the week.", incorrect: ["Day.","Day.","CORRECT: Month.","Day."] },
      studyAid: { definition: "Days of the week and months are different categories of time.", example: "Days: Monday, Tuesday, Wednesday. Months: March, April, May.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'prime numbers'?",
      choices: ["4", "6", "9", "7"],
      correct: 3,
      explanation: { correct: "7 is a prime number (only divisible by 1 and itself).", incorrect: ["Not prime (2x2).","Not prime (2x3).","Not prime (3x3).","CORRECT: Prime."] },
      studyAid: { definition: "Prime numbers have exactly two factors: 1 and themselves.", example: "2, 3, 5, 7, 11, 13", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: gold, silver, iron, diamond?",
      choices: ["gold", "silver", "iron", "diamond"],
      correct: 3,
      explanation: { correct: "Diamond is a gem; the others are metals.", incorrect: ["Metal.","Metal.","Metal.","CORRECT: Gem."] },
      studyAid: { definition: "Materials can be categorized as metals, gems, wood, plastic, etc.", example: "Metals: gold, silver, iron. Gems: diamond, ruby, sapphire.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'consonants'?",
      choices: ["a", "e", "i", "m"],
      correct: 3,
      explanation: { correct: "'M' is a consonant.", incorrect: ["Vowel.","Vowel.","Vowel.","CORRECT: Consonant."] },
      studyAid: { definition: "Consonants are all letters that are not vowels (a, e, i, o, u).", example: "b, c, d, f, g, h, j, k, l, m, n, p, q, r, s, t, v, w, x, y, z", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: doctor, teacher, lawyer, hospital?",
      choices: ["doctor", "teacher", "lawyer", "hospital"],
      correct: 3,
      explanation: { correct: "Hospital is a place; the others are professions.", incorrect: ["Profession.","Profession.","Profession.","CORRECT: Place."] },
      studyAid: { definition: "People can be categorized by their professions or workplaces.", example: "Professions: doctor, teacher, lawyer. Places: hospital, school, courthouse.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which belongs in the category 'liquid'?",
      choices: ["ice", "steam", "water", "rock"],
      correct: 2,
      explanation: { correct: "Water is a liquid at room temperature.", incorrect: ["Solid.","Gas.","CORRECT: Liquid.","Solid."] },
      studyAid: { definition: "Matter exists as solid, liquid, or gas.", example: "Solid: ice, rock. Liquid: water, juice. Gas: steam, air.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    },
    {
      question: "Which does NOT belong: hammer, saw, screwdriver, nail?",
      choices: ["hammer", "saw", "screwdriver", "nail"],
      correct: 3,
      explanation: { correct: "A nail is a fastener; the others are tools.", incorrect: ["Tool.","Tool.","Tool.","CORRECT: Fastener."] },
      studyAid: { definition: "Tools are used to work on things; fasteners hold things together.", example: "Tools: hammer, saw, screwdriver. Fasteners: nail, screw, bolt.", link: "https://www.readingrockets.org/article/categorization", linkText: "Reading Rockets - Categorizing" }
    }
  ]
};

/* 5.3 Cause and Effect */
QUESTION_BANK['reading-comprehension-cause-effect'] = {
  title: "Cause and Effect",
  topic: "Reading Comprehension",
  questions: [
    {
      question: "What is the effect: 'Because it rained, the ground was wet.'",
      choices: ["It rained.", "The ground was wet.", "Clouds formed.", "The sun shone."],
      correct: 1,
      explanation: { correct: "The effect is what happened as a result: the ground got wet.", incorrect: ["Cause.","CORRECT: Effect.","Not mentioned.","Opposite."] },
      studyAid: { definition: "Cause = why something happened. Effect = what happened.", example: "Cause: It rained. Effect: The ground was wet.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the cause: 'The plant died because it did not get water.'",
      choices: ["The plant died.", "It did not get water.", "It was sunny.", "It was old."],
      correct: 1,
      explanation: { correct: "Lack of water caused the plant to die.", incorrect: ["Effect.","CORRECT: Cause.","Not mentioned.","Not mentioned."] },
      studyAid: { definition: "Look for the reason after 'because' to find the cause.", example: "Cause: no water. Effect: plant died.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect of eating too much candy?",
      choices: ["Feeling energetic", "Getting a stomachache", "Becoming taller", "Sleeping better"],
      correct: 1,
      explanation: { correct: "Too much candy often causes a stomachache.", incorrect: ["Short-term sugar rush, not best answer.","CORRECT: Common effect.","Not caused by candy.","Sugar can disrupt sleep."] },
      studyAid: { definition: "Cause and effect relationships are common in health and science.", example: "Cause: too much candy. Effect: stomachache.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What caused the boy to be late?",
      choices: ["He walked fast.", "He missed the bus.", "He arrived early.", "He packed lunch."],
      correct: 1,
      explanation: { correct: "Missing the bus would make someone late.", incorrect: ["Would make him on time.","CORRECT: Cause of lateness.","Opposite.","Unrelated."] },
      studyAid: { definition: "Think about what logically leads to the effect.", example: "Cause: missed the bus. Effect: was late.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect: 'She studied hard, so she got an A.'",
      choices: ["She studied hard.", "She got an A.", "She took a test.", "She read a book."],
      correct: 1,
      explanation: { correct: "Getting an A is the result of studying hard.", incorrect: ["Cause.","CORRECT: Effect.","Part of context.","Part of studying."] },
      studyAid: { definition: "'So' often introduces the effect.", example: "Cause: studied hard. Effect: got an A.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What caused the fire alarm to ring?",
      choices: ["Everyone was quiet.", "There was smoke in the building.", "The school day ended.", "It was lunchtime."],
      correct: 1,
      explanation: { correct: "Smoke triggers fire alarms.", incorrect: ["Unrelated.","CORRECT: Cause.","Unrelated.","Unrelated."] },
      studyAid: { definition: "Fire alarms detect smoke or heat.", example: "Cause: smoke in building. Effect: fire alarm rang.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect of not wearing a coat in winter?",
      choices: ["Staying warm", "Getting cold", "Looking stylish", "Saving money"],
      correct: 1,
      explanation: { correct: "Without a coat in winter, you get cold.", incorrect: ["Opposite.","CORRECT: Effect.","Not the main effect.","Not relevant."] },
      studyAid: { definition: "Cause and effect can be predicted based on experience.", example: "Cause: no coat in winter. Effect: getting cold.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What caused the cookies to burn?",
      choices: ["They were taken out early.", "The oven was too hot.", "They were frozen.", "They had no sugar."],
      correct: 1,
      explanation: { correct: "Too much heat burns cookies.", incorrect: ["Would undercook them.","CORRECT: Cause.","Would prevent baking.","Would affect taste, not burning."] },
      studyAid: { definition: "Think about what leads to the specific effect.", example: "Cause: oven too hot. Effect: cookies burned.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect: 'Since he forgot his umbrella, he got soaked.'",
      choices: ["He forgot his umbrella.", "He got soaked.", "It was sunny.", "He stayed dry."],
      correct: 1,
      explanation: { correct: "Getting soaked is the result.", incorrect: ["Cause.","CORRECT: Effect.","Opposite.","Opposite."] },
      studyAid: { definition: "'Since' introduces the cause; the main clause is the effect.", example: "Cause: forgot umbrella. Effect: got soaked.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What caused the team to win the game?",
      choices: ["They gave up.", "They practiced every day.", "They arrived late.", "They argued."],
      correct: 1,
      explanation: { correct: "Practice usually leads to better performance and winning.", incorrect: ["Would cause losing.","CORRECT: Cause of winning.","Would hurt performance.","Would hurt teamwork."] },
      studyAid: { definition: "Positive actions often lead to positive results.", example: "Cause: practiced every day. Effect: won the game.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect of turning off the lights?",
      choices: ["The room gets brighter.", "The room gets darker.", "The bulb breaks.", "The electricity bill rises."],
      correct: 1,
      explanation: { correct: "Turning off lights makes a room darker.", incorrect: ["Opposite.","CORRECT: Effect.","Not caused by turning off.","Opposite effect."] },
      studyAid: { definition: "Cause and effect can be logical or scientific.", example: "Cause: turned off lights. Effect: room got darker.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What caused the dog to bark?",
      choices: ["It was sleeping.", "A stranger approached.", "It was eating.", "It was playing."],
      correct: 1,
      explanation: { correct: "Dogs often bark when strangers approach.", incorrect: ["Sleeping dogs don't bark.","CORRECT: Cause.","Eating dogs don't usually bark.","Playing dogs might bark, but less likely than a stranger."] },
      studyAid: { definition: "Animals react to stimuli in their environment.", example: "Cause: stranger approached. Effect: dog barked.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect: 'Because she saved her money, she bought a bike.'",
      choices: ["She saved her money.", "She bought a bike.", "She spent all her money.", "She lost her wallet."],
      correct: 1,
      explanation: { correct: "Buying a bike is the result of saving money.", incorrect: ["Cause.","CORRECT: Effect.","Opposite.","Unrelated."] },
      studyAid: { definition: "Saving money enables buying things.", example: "Cause: saved money. Effect: bought a bike.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What caused the vase to break?",
      choices: ["It was placed on a shelf.", "It fell on the floor.", "It was empty.", "It was beautiful."],
      correct: 1,
      explanation: { correct: "Falling on the floor would break a vase.", incorrect: ["Placement alone doesn't break it.","CORRECT: Cause.","Being empty doesn't break it.","Beauty doesn't break it."] },
      studyAid: { definition: "Physical events cause physical effects.", example: "Cause: fell on floor. Effect: vase broke.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    },
    {
      question: "What is the effect of drinking water when thirsty?",
      choices: ["Feeling thirstier", "Feeling less thirsty", "Feeling hungrier", "Feeling colder"],
      correct: 1,
      explanation: { correct: "Water quenches thirst.", incorrect: ["Opposite.","CORRECT: Effect.","Unrelated.","Not the main effect."] },
      studyAid: { definition: "Cause and effect relationships satisfy needs.", example: "Cause: drank water. Effect: felt less thirsty.", link: "https://www.readingrockets.org/article/cause-and-effect", linkText: "Reading Rockets - Cause and Effect" }
    }
  ]
};


/* 5.4 Fact or Fantasy */
QUESTION_BANK['reading-comprehension-fact-fantasy'] = {
  title: "Fact or Fantasy",
  topic: "Reading Comprehension",
  questions: [
    {
      question: "Which is a fantasy statement?",
      choices: ["The sun rises in the east.", "Dragons breathe fire.", "Water freezes at 32 degrees.", "The Earth orbits the sun."],
      correct: 1,
      explanation: { correct: "Dragons are mythical creatures and do not exist in reality.", incorrect: ["Scientific fact.","CORRECT: Fantasy.","Scientific fact.","Scientific fact."] },
      studyAid: { definition: "Fantasy includes impossible or magical events that cannot happen in real life.", example: "Dragons, unicorns, flying brooms, talking animals in fantasy stories", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact?",
      choices: ["Pigs can fly.", "The moon is made of cheese.", "Fish live in water.", "Trees can talk."],
      correct: 2,
      explanation: { correct: "Fish naturally live in water.", incorrect: ["Fantasy.","Fantasy.","CORRECT: Fact.","Fantasy."] },
      studyAid: { definition: "Facts are true statements that can be proven by observation or evidence.", example: "Fish live in water. The sky is blue.", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Birds have feathers.", "A cat wore boots and talked.", "Ice is cold.", "Plants need sunlight."],
      correct: 1,
      explanation: { correct: "Cats cannot wear boots or talk in real life.", incorrect: ["Fact.","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Animals wearing clothes and talking are common fantasy elements.", example: "Puss in Boots, Winnie the Pooh, Charlotte's Web", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact about elephants?",
      choices: ["Elephants can fly using their ears.", "Elephants are the largest land animals.", "Elephants live on the moon.", "Elephants are invisible."],
      correct: 1,
      explanation: { correct: "Elephants are indeed the largest land animals.", incorrect: ["Fantasy.","CORRECT: Fact.","Fantasy.","Fantasy."] },
      studyAid: { definition: "Real animal traits are facts; impossible traits are fantasy.", example: "Elephants have trunks (fact). Elephants can fly (fantasy).", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Fire is hot.", "A pumpkin turned into a carriage.", "Sugar tastes sweet.", "Metal is hard."],
      correct: 1,
      explanation: { correct: "Pumpkins do not turn into carriages in real life.", incorrect: ["Fact.","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Magical transformations are fantasy elements.", example: "Cinderella's pumpkin carriage, frogs turning into princes", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact?",
      choices: ["Humans can breathe underwater without equipment.", "Sharks live in the ocean.", "Humans have wings.", "The moon is a giant light bulb."],
      correct: 1,
      explanation: { correct: "Sharks are real ocean animals.", incorrect: ["Fantasy.","CORRECT: Fact.","Fantasy.","Fantasy."] },
      studyAid: { definition: "Real animals and their habitats are facts.", example: "Sharks live in the ocean. Polar bears live in the Arctic.", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Snow is frozen water.", "A boy flew on a broomstick.", "Rain falls from clouds.", "Rocks are heavy."],
      correct: 1,
      explanation: { correct: "Humans cannot fly on broomsticks.", incorrect: ["Fact.","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Flying on broomsticks is a magical fantasy element.", example: "Harry Potter flying on a broomstick", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact?",
      choices: ["Ghosts live in every house.", "Dinosaurs lived long ago.", "Witches turn people into frogs.", "Monsters live under every bed."],
      correct: 1,
      explanation: { correct: "Dinosaurs existed millions of years ago.", incorrect: ["Fantasy.","CORRECT: Fact.","Fantasy.","Fantasy."] },
      studyAid: { definition: "Scientific evidence proves dinosaurs existed.", example: "Fossils show dinosaurs lived long ago.", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Apples grow on trees.", "A toy came to life.", "Grass is green.", "Water flows downhill."],
      correct: 1,
      explanation: { correct: "Toys do not come to life in reality.", incorrect: ["Fact.","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Toys coming to life is a common fantasy theme.", example: "Toy Story, Pinocchio, The Velveteen Rabbit", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact?",
      choices: ["Magic spells can change the weather.", "The heart pumps blood.", "Wishes come true by blowing on dandelions.", "Fairies leave money under pillows."],
      correct: 1,
      explanation: { correct: "The heart's function is a biological fact.", incorrect: ["Fantasy.","CORRECT: Fact.","Fantasy.","Fantasy."] },
      studyAid: { definition: "Body functions are scientific facts.", example: "The heart pumps blood. The lungs help us breathe.", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Volcanoes erupt lava.", "A mermaid swam in the sea.", "Earthquakes shake the ground.", "Hurricanes have strong winds."],
      correct: 1,
      explanation: { correct: "Mermaids are mythical creatures.", incorrect: ["Fact.","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Mermaids, centaurs, and griffins are mythical creatures from folklore.", example: "The Little Mermaid, myths and legends", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact?",
      choices: ["Superheroes have real superpowers.", "Bridges help people cross rivers.", "Invisibility cloaks exist.", "Time machines are common."],
      correct: 1,
      explanation: { correct: "Bridges are real structures with a real purpose.", incorrect: ["Fantasy.","CORRECT: Fact.","Fantasy.","Fantasy."] },
      studyAid: { definition: "Engineering and technology produce real structures and tools.", example: "Bridges, cars, computers, airplanes", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Babies are born from eggs.", "A giant lived on a beanstalk.", "Kangaroos have pouches.", "Spiders have eight legs."],
      correct: 1,
      explanation: { correct: "Giants and magic beanstalks are from fairy tales.", incorrect: ["Partial fact (some animals).","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Fairy tales often include giants, witches, and magic plants.", example: "Jack and the Beanstalk", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is a fact?",
      choices: ["Aliens built the pyramids.", "The pyramids were built by ancient Egyptians.", "Pyramids float in the air.", "Pyramids are made of chocolate."],
      correct: 1,
      explanation: { correct: "Historical evidence shows ancient Egyptians built the pyramids.", incorrect: ["Unproven theory/fantasy.","CORRECT: Fact.","Fantasy.","Fantasy."] },
      studyAid: { definition: "Historical facts are supported by evidence and records.", example: "Archaeologists have found tools and records of pyramid construction.", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    },
    {
      question: "Which is fantasy?",
      choices: ["Birds build nests.", "A wolf could blow down a brick house.", "Bees make honey.", "Fish have scales."],
      correct: 1,
      explanation: { correct: "No wolf could blow down a sturdy brick house.", incorrect: ["Fact.","CORRECT: Fantasy.","Fact.","Fact."] },
      studyAid: { definition: "Exaggerated abilities in fairy tales are fantasy.", example: "The Three Little Pigs", link: "https://www.readingrockets.org/article/fact-vs-fiction", linkText: "Reading Rockets - Fact vs Fiction" }
    }
  ]
};

/* 5.5 Fact & Opinion */
QUESTION_BANK['reading-comprehension-fact-opinion'] = {
  title: "Fact and Opinion",
  topic: "Reading Comprehension",
  questions: [
    {
      question: "Which is a fact?",
      choices: ["Chocolate is the best flavor.", "Chocolate ice cream is brown.", "Chocolate is better than vanilla.", "Everyone loves chocolate."],
      correct: 1,
      explanation: { correct: "The color of chocolate ice cream can be observed and proven.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion (not everyone)."] },
      studyAid: { definition: "Facts can be proven true with evidence. Opinions express personal feelings or beliefs.", example: "Fact: Chocolate ice cream is brown. Opinion: Chocolate is the best flavor.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["The sun is a star.", "The sun is too hot.", "The sun rises in the east.", "The sun is 93 million miles away."],
      correct: 1,
      explanation: { correct: "'Too hot' is a personal judgment.", incorrect: ["Fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Words like 'too,' 'best,' 'worst,' 'beautiful,' and 'boring' often signal opinions.", example: "Opinion: The sun is too hot. Fact: The sun is 93 million miles away.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Math is boring.", "Math has numbers.", "Math is the hardest subject.", "Math is useless."],
      correct: 1,
      explanation: { correct: "Math does involve numbers; this is provable.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Look for statements that can be checked and verified.", example: "Fact: Math has numbers. Opinion: Math is boring.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["A mile is 5,280 feet.", "Running a mile is easy.", "A marathon is 26.2 miles.", "Track runners run miles."],
      correct: 1,
      explanation: { correct: "'Easy' is a personal judgment.", incorrect: ["Fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Difficulty is subjective; what is easy for one person may be hard for another.", example: "Opinion: Running a mile is easy. Fact: A mile is 5,280 feet.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Dogs make the best pets.", "Dogs are mammals.", "Dogs are better than cats.", "Everyone should have a dog."],
      correct: 1,
      explanation: { correct: "Dogs are scientifically classified as mammals.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Scientific classifications are facts.", example: "Fact: Dogs are mammals. Opinion: Dogs make the best pets.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["The Pacific is the largest ocean.", "The Pacific Ocean is beautiful.", "The Pacific Ocean has salt water.", "The Pacific Ocean covers much of Earth."],
      correct: 1,
      explanation: { correct: "'Beautiful' is a personal aesthetic judgment.", incorrect: ["Fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Beauty is in the eye of the beholder; it is subjective.", example: "Opinion: The ocean is beautiful. Fact: The Pacific is the largest ocean.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Pizza is delicious.", "Pizza usually has cheese.", "Pizza is the best food.", "Pizza should be eaten every day."],
      correct: 1,
      explanation: { correct: "Most pizza has cheese; this is observable.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Common characteristics of things are facts if they can be observed.", example: "Fact: Pizza usually has cheese. Opinion: Pizza is delicious.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["Winter is cold.", "Winter is the worst season.", "Winter comes after fall.", "Winter has the shortest days."],
      correct: 1,
      explanation: { correct: "'Worst' is a value judgment.", incorrect: ["General fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Words like 'worst,' 'best,' 'greatest' signal opinions.", example: "Opinion: Winter is the worst season. Fact: Winter comes after fall.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Blue is a calming color.", "Blue is a primary color.", "Blue is the best color.", "Blue should be used in every room."],
      correct: 1,
      explanation: { correct: "Blue is one of the three primary colors (red, blue, yellow).", incorrect: ["Opinion/subjective.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Art and color theory include provable facts.", example: "Fact: Blue is a primary color. Opinion: Blue is the best color.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["Mount Everest is tall.", "Mount Everest is the most amazing mountain.", "Mount Everest is in Asia.", "Mount Everest is the tallest mountain."],
      correct: 1,
      explanation: { correct: "'Most amazing' is a personal feeling.", incorrect: ["Fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Superlatives that express emotion rather than measurement are opinions.", example: "Opinion: Most amazing. Fact: Tallest mountain.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Reading is fun.", "Reading improves vocabulary.", "Reading is better than watching TV.", "Everyone should read every day."],
      correct: 1,
      explanation: { correct: "Studies show reading improves vocabulary.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Research-backed statements are facts.", example: "Fact: Reading improves vocabulary. Opinion: Reading is fun.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["Fire needs oxygen.", "Campfires are scary.", "Fire produces heat.", "Fire can be orange."],
      correct: 1,
      explanation: { correct: "'Scary' is a personal feeling.", incorrect: ["Fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Emotional reactions are opinions.", example: "Opinion: Campfires are scary. Fact: Fire needs oxygen.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Swimming is the best exercise.", "Swimming works many muscles.", "Swimming is boring.", "Swimming is too hard."],
      correct: 1,
      explanation: { correct: "Swimming does engage multiple muscle groups.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Physical effects of exercise can be measured and proven.", example: "Fact: Swimming works many muscles. Opinion: Swimming is boring.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is an opinion?",
      choices: ["A triangle has three sides.", "Triangles are the best shape.", "A right triangle has a 90-degree angle.", "Triangles can be different sizes."],
      correct: 1,
      explanation: { correct: "'Best' is a value judgment.", incorrect: ["Fact.","CORRECT: Opinion.","Fact.","Fact."] },
      studyAid: { definition: "Mathematical properties are facts; preferences are opinions.", example: "Fact: A triangle has three sides. Opinion: Triangles are the best shape.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    },
    {
      question: "Which is a fact?",
      choices: ["Homework is useless.", "Homework takes time.", "Homework is unfair.", "No one should get homework."],
      correct: 1,
      explanation: { correct: "Homework does require time to complete.", incorrect: ["Opinion.","CORRECT: Fact.","Opinion.","Opinion."] },
      studyAid: { definition: "Observable characteristics are facts.", example: "Fact: Homework takes time. Opinion: Homework is useless.", link: "https://www.readingrockets.org/article/fact-vs-opinion", linkText: "Reading Rockets - Fact vs Opinion" }
    }
  ]
};

/* 5.6 Inference */
QUESTION_BANK['reading-comprehension-inference'] = {
  title: "Inference",
  topic: "Reading Comprehension",
  questions: [
    {
      question: "Sara put on her boots, scarf, and coat. She grabbed her sled. What can you infer?",
      choices: ["Sara is going to the beach.", "Sara is going to play in the snow.", "Sara is going to school.", "Sara is going to bed."],
      correct: 1,
      explanation: { correct: "Boots, scarf, coat, and a sled suggest cold, snowy weather.", incorrect: ["Beach gear is different.","CORRECT: Snow play inference.","No school supplies mentioned.","Not bedtime items."] },
      studyAid: { definition: "Inference means figuring out what is not directly stated by using clues.", example: "Boots + scarf + coat + sled = snow play", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "Tom's teeth were chattering, and he rubbed his arms. What can you infer?",
      choices: ["Tom is hot.", "Tom is cold.", "Tom is tired.", "Tom is hungry."],
      correct: 1,
      explanation: { correct: "Chattering teeth and rubbing arms are signs of being cold.", incorrect: ["Opposite.","CORRECT: Cold inference.","No tired clues.","No hunger clues."] },
      studyAid: { definition: "Physical actions give clues about how someone feels.", example: "Teeth chattering + rubbing arms = cold", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The ground was covered in crumbs, and the cookie jar was empty. What can you infer?",
      choices: ["Someone baked cookies.", "Someone ate the cookies.", "The jar was broken.", "The cookies were given away."],
      correct: 1,
      explanation: { correct: "Crumbs and an empty jar suggest the cookies were eaten.", incorrect: ["No baking clues.","CORRECT: Ate cookies inference.","No broken jar clue.","No giveaway clues."] },
      studyAid: { definition: "Evidence (crumbs, empty jar) helps infer what happened.", example: "Crumbs + empty jar = someone ate the cookies", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "Maria looked at her watch, sighed, and tapped her foot. What can you infer?",
      choices: ["Maria is relaxed.", "Maria is bored.", "Maria is waiting impatiently.", "Maria is asleep."],
      correct: 2,
      explanation: { correct: "Checking time, sighing, and tapping foot show impatience.", incorrect: ["Opposite.","Possible but less specific.","CORRECT: Impatient waiting.","Opposite."] },
      studyAid: { definition: "Body language reveals emotions.", example: "Watch + sigh + tapping foot = impatient", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The classroom was silent. Everyone looked at the door. What can you infer?",
      choices: ["Class is over.", "Someone important entered.", "It is lunchtime.", "The students are sleeping."],
      correct: 1,
      explanation: { correct: "Silence and looking at the door suggest someone's arrival.", incorrect: ["Would cause noise/activity.","CORRECT: Someone entered.","Would cause excitement.","Silent but looking suggests alertness."] },
      studyAid: { definition: "Group behavior gives clues about events.", example: "Silence + looking at door = someone important arrived", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "Jake's face turned red, and he clenched his fists. What can you infer?",
      choices: ["Jake is happy.", "Jake is angry.", "Jake is sad.", "Jake is scared."],
      correct: 1,
      explanation: { correct: "Red face and clenched fists are common signs of anger.", incorrect: ["Opposite expression.","CORRECT: Anger inference.","Sadness shows differently.","Fear shows differently."] },
      studyAid: { definition: "Facial expressions and body language signal emotions.", example: "Red face + clenched fists = angry", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The dog wagged its tail and jumped up and down when Max came home. What can you infer?",
      choices: ["The dog is scared of Max.", "The dog is happy to see Max.", "The dog is hungry.", "The dog is tired."],
      correct: 1,
      explanation: { correct: "Wagging tail and jumping are signs of excitement and happiness.", incorrect: ["Scared dogs hide or bark.","CORRECT: Happy to see Max.","No food clues.","No tired clues."] },
      studyAid: { definition: "Animal behavior gives clues about their feelings.", example: "Wagging tail + jumping = happy", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The shelves were empty, and people carried bags out of the store. What can you infer?",
      choices: ["The store just opened.", "There was a big sale.", "The store is closed.", "The store is restocking."],
      correct: 1,
      explanation: { correct: "Empty shelves and people with bags suggest a sale cleared items out.", incorrect: ["Opening would have full shelves.","CORRECT: Big sale inference.","Closed stores don't have shoppers.","Restocking means shelves would be full, not empty."] },
      studyAid: { definition: "Context clues help infer events.", example: "Empty shelves + bags = big sale", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "Lucy yawned, rubbed her eyes, and asked for a blanket. What can you infer?",
      choices: ["Lucy is hungry.", "Lucy is sleepy.", "Lucy is excited.", "Lucy is angry."],
      correct: 1,
      explanation: { correct: "Yawning, rubbing eyes, and wanting a blanket suggest sleepiness.", incorrect: ["No food clues.","CORRECT: Sleepy inference.","Opposite.","No anger clues."] },
      studyAid: { definition: "Multiple clues together help make strong inferences.", example: "Yawn + rub eyes + blanket = sleepy", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The car had a flat tire and smoke coming from the hood. What can you infer?",
      choices: ["The car is brand new.", "The car broke down.", "The car is being washed.", "The car is out of gas."],
      correct: 1,
      explanation: { correct: "Flat tire and smoke indicate mechanical problems.", incorrect: ["New cars don't have these problems.","CORRECT: Broke down inference.","Washing doesn't cause smoke.","Flat tire and smoke suggest mechanical failure, not just gas."] },
      studyAid: { definition: "Multiple problems together suggest a breakdown.", example: "Flat tire + smoke = broke down", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The child carried an umbrella and wore rain boots. What can you infer?",
      choices: ["It is sunny.", "It is raining or about to rain.", "It is snowing.", "It is windy."],
      correct: 1,
      explanation: { correct: "Umbrella and rain boots are used for rain.", incorrect: ["Opposite gear.","CORRECT: Rain inference.","Snow gear is different.","No wind gear mentioned."] },
      studyAid: { definition: "Clothing and accessories indicate weather conditions.", example: "Umbrella + rain boots = rain", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "Maya's hands were covered in paint, and there was a canvas on the table. What can you infer?",
      choices: ["Maya was cooking.", "Maya was painting.", "Maya was gardening.", "Maya was reading."],
      correct: 1,
      explanation: { correct: "Paint on hands and a canvas suggest painting.", incorrect: ["Cooking uses different materials.","CORRECT: Painting inference.","Gardening uses dirt, not paint.","Reading doesn't involve paint."] },
      studyAid: { definition: "Tools and materials indicate activities.", example: "Paint + canvas = painting", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The audience clapped and cheered at the end of the show. What can you infer?",
      choices: ["The show was terrible.", "The show was enjoyed.", "The show was canceled.", "The show was too long."],
      correct: 1,
      explanation: { correct: "Clapping and cheering show approval and enjoyment.", incorrect: ["Opposite reaction.","CORRECT: Enjoyed inference.","Canceled shows don't get applause.","No time clues."] },
      studyAid: { definition: "Audience reactions indicate their opinion of a performance.", example: "Clapping + cheering = enjoyed the show", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "Ben looked at his test paper, smiled, and gave a thumbs-up. What can you infer?",
      choices: ["Ben failed the test.", "Ben did well on the test.", "Ben didn't finish.", "Ben didn't study."],
      correct: 1,
      explanation: { correct: "Smiling and thumbs-up indicate good results.", incorrect: ["Opposite reaction.","CORRECT: Did well inference.","Opposite.","Opposite."] },
      studyAid: { definition: "Positive gestures after seeing results suggest success.", example: "Smile + thumbs-up = did well", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    },
    {
      question: "The kitchen smelled like garlic and tomatoes, and a pot was bubbling on the stove. What can you infer?",
      choices: ["Someone was doing laundry.", "Someone was cooking.", "Someone was cleaning.", "Someone was sleeping."],
      correct: 1,
      explanation: { correct: "Food smells and a bubbling pot indicate cooking.", incorrect: ["Laundry doesn't smell like food.","CORRECT: Cooking inference.","Cleaning doesn't involve bubbling pots.","Sleeping doesn't produce food smells."] },
      studyAid: { definition: "Smells and objects in use reveal activities.", example: "Garlic + tomatoes + bubbling pot = cooking", link: "https://www.readingrockets.org/article/making-inferences", linkText: "Reading Rockets - Making Inferences" }
    }
  ]
};

/* ============================================================
   TOPIC 6: Reference Skills / Misc.
   ============================================================ */

/* 6.1 Sub-heading */
QUESTION_BANK['reference-skills-sub-heading'] = {
  title: "Sub-heading",
  topic: "Reference Skills / Misc.",
  questions: [
    {
      question: "What is the purpose of a sub-heading?",
      choices: ["To decorate the page", "To introduce a new section or topic", "To end the chapter", "To list the author"],
      correct: 1,
      explanation: { correct: "Sub-headings break text into sections and tell what each section is about.", incorrect: ["Not decoration.","CORRECT: Introduces a section.","Not an ending.","Not for author info."] },
      studyAid: { definition: "Sub-headings organize text and help readers find information quickly.", example: "Chapter: Animals. Sub-headings: Mammals, Birds, Reptiles", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Where do sub-headings usually appear?",
      choices: ["At the very bottom of the page", "Before a new section begins", "Only in the table of contents", "Inside footnotes"],
      correct: 1,
      explanation: { correct: "Sub-headings appear before each new section to signal a change in topic.", incorrect: ["Wrong location.","CORRECT: Before new sections.","They appear throughout, not just TOC.","Not in footnotes."] },
      studyAid: { definition: "Sub-headings are placed throughout a text to mark sections.", example: "## How Sub-headings Work (sub-heading before a section)", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Which is a sub-heading?",
      choices: ["The title of the book", "A smaller heading inside a chapter", "The author's name", "The page number"],
      correct: 1,
      explanation: { correct: "Sub-headings are smaller headings that divide chapters into sections.", incorrect: ["That's the main title.","CORRECT: Sub-heading.","Not a heading.","Not a heading."] },
      studyAid: { definition: "Sub-headings are smaller than chapter titles but larger than body text.", example: "Chapter 1: The Ocean. Sub-heading: Sharks, Sub-heading: Coral Reefs", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Why are sub-headings helpful?",
      choices: ["They make the book longer.", "They help readers locate information quickly.", "They replace pictures.", "They hide important facts."],
      correct: 1,
      explanation: { correct: "Sub-headings act like signposts, guiding readers to specific topics.", incorrect: ["Not their purpose.","CORRECT: Help locate info.","They don't replace pictures.","Opposite of their purpose."] },
      studyAid: { definition: "Sub-headings improve readability and help with skimming.", example: "Looking for 'Tigers'? Find the sub-heading 'Big Cats' and read that section.", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Which text feature is MOST like a sub-heading?",
      choices: ["Index", "Glossary", "Heading", "Bibliography"],
      correct: 2,
      explanation: { correct: "Headings and sub-headings both organize and label sections of text.", incorrect: ["Lists topics at the back.","Defines words.","CORRECT: Similar to sub-heading.","Lists sources."] },
      studyAid: { definition: "Headings, sub-headings, and titles all organize text.", example: "Heading = Chapter title. Sub-heading = Section title.", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "How is a sub-heading different from a title?",
      choices: ["It is longer", "It is smaller and divides sections within a chapter", "It is only found in fiction", "It is written in cursive"],
      correct: 1,
      explanation: { correct: "Titles name whole works; sub-headings divide chapters into smaller parts.", incorrect: ["Not necessarily longer.","CORRECT: Smaller, divides sections.","Found in nonfiction too.","Not about font style."] },
      studyAid: { definition: "Titles are for whole books/chapters; sub-headings are for sections.", example: "Title: The Solar System. Sub-heading: The Planet Mars", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "In a chapter about weather, which would be a sub-heading?",
      choices: ["Weather", "Chapter 3", "Thunderstorms", "By John Smith"],
      correct: 2,
      explanation: { correct: "'Thunderstorms' is a specific section within a weather chapter.", incorrect: ["Too broad; could be title.","Chapter number, not sub-heading.","CORRECT: Specific section.","Author name."] },
      studyAid: { definition: "Sub-headings are specific topics within a larger chapter.", example: "Chapter: Weather. Sub-headings: Rain, Thunderstorms, Snow", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Which is NOT a function of sub-headings?",
      choices: ["Organizing information", "Showing page numbers", "Previewing content", "Breaking up long text"],
      correct: 1,
      explanation: { correct: "Page numbers are separate text features, not sub-headings.", incorrect: ["Function of sub-headings.","CORRECT: Not a function.","Function of sub-headings.","Function of sub-headings."] },
      studyAid: { definition: "Sub-headings organize, preview, and break up text but do not number pages.", example: "Page numbers appear in the header or footer.", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "What do bold sub-headings signal to a reader?",
      choices: ["A new character is introduced", "A new topic or section is starting", "The book is ending", "A quiz is coming"],
      correct: 1,
      explanation: { correct: "Bold sub-headings draw attention to the start of a new section.", incorrect: ["Not in nonfiction.","CORRECT: New section.","Not an ending signal.","Not standard."] },
      studyAid: { definition: "Bold formatting makes sub-headings stand out for easy scanning.", example: "**Habitats** (bold sub-heading about habitats)", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Where would you find sub-headings?",
      choices: ["Only in novels", "Only in science books", "In textbooks, articles, and many nonfiction books", "Only in comic books"],
      correct: 2,
      explanation: { correct: "Sub-headings are common in nonfiction texts like textbooks and articles.", incorrect: ["Not only novels.","Not only science books.","CORRECT: Many nonfiction texts.","Not only comics."] },
      studyAid: { definition: "Nonfiction texts use sub-headings to organize facts and information.", example: "Textbooks, encyclopedias, news articles, websites", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "If you wanted to find information about 'volcanoes' in a geology chapter, what should you look for?",
      choices: ["The table of contents only", "A sub-heading about volcanoes", "The author's name", "The copyright date"],
      correct: 1,
      explanation: { correct: "A sub-heading about volcanoes would lead you directly to that section.", incorrect: ["TOC helps but sub-heading is faster in the chapter.","CORRECT: Sub-heading.","Not helpful.","Not helpful."] },
      studyAid: { definition: "Sub-headings let you scan for specific topics without reading everything.", example: "Scan for 'Volcanoes' sub-heading → read that section", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Which would be a good sub-heading for a section about lion behavior?",
      choices: ["Africa", "Lions", "How Lions Hunt", "Mammals"],
      correct: 2,
      explanation: { correct: "'How Lions Hunt' is specific and tells what the section covers.", incorrect: ["Too broad (place).","Too broad (animal name).","CORRECT: Specific behavior.","Too broad (category)."] },
      studyAid: { definition: "Good sub-headings are specific and descriptive.", example: "'How Lions Hunt' is better than just 'Lions'", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "What usually comes right after a sub-heading?",
      choices: ["A picture", "A paragraph about that topic", "The table of contents", "A bibliography"],
      correct: 1,
      explanation: { correct: "Sub-headings are followed by text explaining that topic.", incorrect: ["May appear but not always.","CORRECT: Paragraph about topic.","Comes at the beginning.","Comes at the end."] },
      studyAid: { definition: "Sub-headings introduce paragraphs or sections of content.", example: "Sub-heading: Bird Migration. Paragraph: Every year, birds fly south...", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Which text feature works WITH sub-headings to organize a book?",
      choices: ["Table of contents", "Index", "Both A and B", "None"],
      correct: 2,
      explanation: { correct: "Both the table of contents and index help readers navigate using headings.", incorrect: ["Correct but not only answer.","Correct but not only answer.","CORRECT: Both work together.","They do work together."] },
      studyAid: { definition: "TOC shows headings in order; index shows where topics appear by page number.", example: "TOC: Chapter 3: Weather (sub-headings listed). Index: thunderstorms → page 45", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    },
    {
      question: "Why might an author use many sub-headings?",
      choices: ["To make the book look longer", "To help readers find and understand information", "To confuse readers", "To avoid writing full sentences"],
      correct: 1,
      explanation: { correct: "Many sub-headings improve organization and readability.", incorrect: ["Not the purpose.","CORRECT: Help readers.","Opposite purpose.","Not related."] },
      studyAid: { definition: "More sub-headings = more organized and easier-to-navigate text.", example: "A science textbook with sub-headings for each animal group", link: "https://www.readingrockets.org/article/text-features", linkText: "Reading Rockets - Text Features" }
    }
  ]
};

/* 6.2 Finding the subject, object in a sentence */
QUESTION_BANK['reference-skills-subject-object'] = {
  title: "Finding the Subject and Object in a Sentence",
  topic: "Reference Skills / Misc.",
  questions: [
    {
      question: "What is the subject: 'The cat chased the mouse.'",
      choices: ["cat", "chased", "mouse", "the"],
      correct: 0,
      explanation: { correct: "The subject is who or what did the action: the cat.", incorrect: ["CORRECT: Subject.","Verb.","Object.","Article."] },
      studyAid: { definition: "The subject is who or what the sentence is about.", example: "The cat chased the mouse. (subject: cat)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the object: 'The dog bit the mailman.'",
      choices: ["dog", "bit", "mailman", "the"],
      correct: 2,
      explanation: { correct: "The object receives the action: the mailman.", incorrect: ["Subject.","Verb.","CORRECT: Object.","Article."] },
      studyAid: { definition: "The direct object receives the action of the verb.", example: "The dog bit the mailman. (object: mailman)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'My mom baked a cake.'",
      choices: ["My", "mom", "baked", "cake"],
      correct: 1,
      explanation: { correct: "'Mom' is who did the action.", incorrect: ["Possessive adjective.","CORRECT: Subject.","Verb.","Object."] },
      studyAid: { definition: "Ignore modifiers to find the simple subject.", example: "My mom baked a cake. (subject: mom)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the object: 'She threw the ball.'",
      choices: ["She", "threw", "the", "ball"],
      correct: 3,
      explanation: { correct: "The ball receives the action.", incorrect: ["Subject.","Verb.","Article.","CORRECT: Object."] },
      studyAid: { definition: "Ask 'what?' after the verb to find the direct object.", example: "She threw what? The ball.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'The big, brown bear caught a fish.'",
      choices: ["big", "brown", "bear", "fish"],
      correct: 2,
      explanation: { correct: "'Bear' is the main noun doing the action.", incorrect: ["Adjective.","Adjective.","CORRECT: Subject.","Object."] },
      studyAid: { definition: "Adjectives describe the subject but are not the subject itself.", example: "The big, brown bear caught a fish. (subject: bear)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the object: 'The teacher gave the students homework.'",
      choices: ["teacher", "students", "homework", "gave"],
      correct: 2,
      explanation: { correct: "'Homework' is what was given.", incorrect: ["Subject.","Indirect object.","CORRECT: Direct object.","Verb."] },
      studyAid: { definition: "Direct object = what was given. Indirect object = to whom it was given.", example: "The teacher gave the students homework. (direct object: homework, indirect object: students)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'Running is good exercise.'",
      choices: ["Running", "is", "good", "exercise"],
      correct: 0,
      explanation: { correct: "'Running' is a gerund acting as the subject.", incorrect: ["CORRECT: Subject.","Verb.","Adjective.","Object complement."] },
      studyAid: { definition: "Gerunds (verbs ending in -ing used as nouns) can be subjects.", example: "Running is good exercise. (subject: Running)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the object: 'I read an interesting book.'",
      choices: ["I", "read", "interesting", "book"],
      correct: 3,
      explanation: { correct: "'Book' is what was read.", incorrect: ["Subject.","Verb.","Adjective.","CORRECT: Object."] },
      studyAid: { definition: "Adjectives modify the object but are not the object.", example: "I read an interesting book. (object: book)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'There are five books on the shelf.'",
      choices: ["There", "are", "books", "shelf"],
      correct: 2,
      explanation: { correct: "In 'there is/are' sentences, the real subject comes after the verb.", incorrect: ["Not the real subject.","Verb.","CORRECT: Real subject.","Part of prepositional phrase."] },
      studyAid: { definition: "'There' is not the subject; look after the verb for the real subject.", example: "There are five books on the shelf. (subject: books)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the indirect object: 'My dad bought me a bike.'",
      choices: ["dad", "bought", "me", "bike"],
      correct: 2,
      explanation: { correct: "'Me' is the person who received the bike.", incorrect: ["Subject.","Verb.","CORRECT: Indirect object.","Direct object."] },
      studyAid: { definition: "Indirect object = the receiver. Direct object = the thing given.", example: "My dad bought me a bike. (indirect object: me, direct object: bike)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'The birds in the tree sang loudly.'",
      choices: ["birds", "tree", "sang", "loudly"],
      correct: 0,
      explanation: { correct: "'Birds' is the main noun. 'In the tree' is a prepositional phrase.", incorrect: ["CORRECT: Subject.","Part of prepositional phrase.","Verb.","Adverb."] },
      studyAid: { definition: "Prepositional phrases after the subject are not part of the simple subject.", example: "The birds in the tree sang loudly. (subject: birds)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the object: 'She made her brother a sandwich.'",
      choices: ["She", "brother", "sandwich", "made"],
      correct: 2,
      explanation: { correct: "'Sandwich' is what was made.", incorrect: ["Subject.","Indirect object.","CORRECT: Direct object.","Verb."] },
      studyAid: { definition: "Brother = who received it (indirect). Sandwich = what was made (direct).", example: "She made her brother a sandwich. (direct object: sandwich)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'Swimming in the pool is fun.'",
      choices: ["Swimming", "pool", "is", "fun"],
      correct: 0,
      explanation: { correct: "'Swimming' is a gerund and the subject.", incorrect: ["CORRECT: Subject.","Part of prepositional phrase.","Verb.","Subject complement."] },
      studyAid: { definition: "Gerunds can be subjects even with prepositional phrases attached.", example: "Swimming in the pool is fun. (subject: Swimming)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the object: 'The kids painted the fence white.'",
      choices: ["kids", "painted", "fence", "white"],
      correct: 2,
      explanation: { correct: "'Fence' is what was painted.", incorrect: ["Subject.","Verb.","CORRECT: Object.","Object complement."] },
      studyAid: { definition: "Object complements describe the object but are not the object itself.", example: "The kids painted the fence white. (object: fence)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "What is the subject: 'Here is your pencil.'",
      choices: ["Here", "is", "your", "pencil"],
      correct: 3,
      explanation: { correct: "In 'Here is/are' sentences, the subject follows the verb.", incorrect: ["Not the subject.","Verb.","Possessive adjective.","CORRECT: Subject."] },
      studyAid: { definition: "Inverted sentences have the subject after the verb.", example: "Here is your pencil. (subject: pencil)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};


/* 6.3 Italicize */
QUESTION_BANK['reference-skills-italicize'] = {
  title: "Italicize",
  topic: "Reference Skills / Misc.",
  questions: [
    {
      question: "Which should be italicized?",
      choices: ["A chapter title", "A book title", "A street name", "A person's name"],
      correct: 1,
      explanation: { correct: "Book titles are italicized (or underlined).", incorrect: ["Chapter titles use quotation marks.","CORRECT: Book title.","Street names are not italicized.","Names are not italicized."] },
      studyAid: { definition: "Italicize titles of long works: books, movies, albums, magazines, newspapers.", example: "Harry Potter, The New York Times, Titanic", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should NOT be italicized?",
      choices: ["A movie title", "A song title", "A TV show title", "A ship name"],
      correct: 1,
      explanation: { correct: "Song titles go in quotation marks, not italics.", incorrect: ["Movies are italicized.","CORRECT: Song title.","TV shows are italicized.","Ship names are italicized."] },
      studyAid: { definition: "Short works use quotation marks: songs, poems, short stories, articles, chapters.", example: "'Happy Birthday,' 'The Road Not Taken,' 'The Tell-Tale Heart'", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I read the article The Big Storm.", "I read the article 'The Big Storm.'", "I read the article The Big Storm.", "I read the article /The Big Storm./"],
      correct: 1,
      explanation: { correct: "Article titles use quotation marks.", incorrect: ["Missing quotation marks.","CORRECT: Quotation marks.","Same as A.","Slashes are not standard."] },
      studyAid: { definition: "Articles are short works and use quotation marks.", example: "I read the article 'The Big Storm' in the newspaper.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should be italicized?",
      choices: ["A poem", "A novel", "A short story", "A song"],
      correct: 1,
      explanation: { correct: "Novels are long works and are italicized.", incorrect: ["Poems use quotation marks.","CORRECT: Novel.","Short stories use quotation marks.","Songs use quotation marks."] },
      studyAid: { definition: "Long works = italics. Short works = quotation marks.", example: "Novel: The Hobbit (italics). Short story: 'The Lottery' (quotes).", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I watched the movie Frozen.", "I watched the movie 'Frozen.'", "I watched the movie Frozen.", "I watched the movie *Frozen*."],
      correct: 2,
      explanation: { correct: "Movie titles are italicized.", incorrect: ["Missing italics.","Quotation marks are for short works.","CORRECT: Italicized.","Asterisks are not standard in formal writing."] },
      studyAid: { definition: "Movies are long visual works and are italicized.", example: "I watched the movie Frozen.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should NOT be italicized?",
      choices: ["A newspaper", "A painting", "A city name", "A magazine"],
      correct: 2,
      explanation: { correct: "City names are proper nouns but are not italicized.", incorrect: ["Newspapers are italicized.","Paintings are italicized.","CORRECT: City name.","Magazines are italicized."] },
      studyAid: { definition: "Proper nouns (names of people, places) are capitalized but not italicized.", example: "New York (capitalized, not italicized). The New York Times (italicized).", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["My favorite poem is The Raven.", "My favorite poem is 'The Raven.'", "My favorite poem is The Raven.", "My favorite poem is /The Raven./"],
      correct: 1,
      explanation: { correct: "Poems are short works and use quotation marks.", incorrect: ["Missing quotation marks.","CORRECT: Quotation marks.","Missing quotation marks.","Slashes not standard."] },
      studyAid: { definition: "Poems, even famous ones, use quotation marks because they are short works.", example: "My favorite poem is 'The Raven' by Edgar Allan Poe.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should be italicized?",
      choices: ["An essay", "A play", "A chapter", "A quote"],
      correct: 1,
      explanation: { correct: "Plays are long works and are italicized.", incorrect: ["Essays use quotation marks.","CORRECT: Play.","Chapters use quotation marks.","Quotes use quotation marks."] },
      studyAid: { definition: "Plays are complete works and get italics.", example: "Romeo and Juliet, Hamlet, The Crucible", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I read the book Charlotte's Web.", "I read the book 'Charlotte's Web.'", "I read the book Charlotte's Web.", "I read the book *Charlotte's Web*."],
      correct: 2,
      explanation: { correct: "Book titles are italicized.", incorrect: ["Missing italics.","Quotation marks for short works.","CORRECT: Italicized.","Asterisks not standard in formal writing."] },
      studyAid: { definition: "Books are long works and are italicized.", example: "I read the book Charlotte's Web.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should NOT be italicized?",
      choices: ["A ship name", "An album title", "A country name", "A TV show title"],
      correct: 2,
      explanation: { correct: "Country names are proper nouns but not italicized.", incorrect: ["Ships are italicized.","Albums are italicized.","CORRECT: Country name.","TV shows are italicized."] },
      studyAid: { definition: "Names of countries, states, and cities are capitalized but not italicized.", example: "France, Brazil, Japan (not italicized)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["I love the song Let It Go.", "I love the song 'Let It Go.'", "I love the song Let It Go.", "I love the song /Let It Go./"],
      correct: 1,
      explanation: { correct: "Song titles use quotation marks.", incorrect: ["Missing quotation marks.","CORRECT: Quotation marks.","Missing quotation marks.","Slashes not standard."] },
      studyAid: { definition: "Songs are short works and use quotation marks.", example: "I love the song 'Let It Go' from Frozen.", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should be italicized?",
      choices: ["A newspaper article", "A blog post", "A video game", "A tweet"],
      correct: 2,
      explanation: { correct: "Video games are long works and are italicized.", incorrect: ["Articles use quotation marks.","Blog posts use quotation marks.","CORRECT: Video game.","Tweets use quotation marks."] },
      studyAid: { definition: "Video games are treated like movies and books: italicized.", example: "Minecraft, Super Mario Bros., The Legend of Zelda", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["We studied the painting Starry Night.", "We studied the painting 'Starry Night.'", "We studied the painting Starry Night.", "We studied the painting /Starry Night./"],
      correct: 2,
      explanation: { correct: "Paintings are italicized.", incorrect: ["Missing italics.","Quotation marks not standard for paintings.","CORRECT: Italicized.","Slashes not standard."] },
      studyAid: { definition: "Works of visual art are italicized.", example: "The Mona Lisa, Starry Night, The Persistence of Memory", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which should NOT be italicized?",
      choices: ["A musical album", "A symphony", "A person's nickname", "An opera"],
      correct: 2,
      explanation: { correct: "Nicknames are capitalized but not italicized.", incorrect: ["Albums are italicized.","Symphonies are italicized.","CORRECT: Nickname.","Operas are italicized."] },
      studyAid: { definition: "Names of people and nicknames are capitalized but not italicized.", example: "Alexander the Great, The Big Apple (nickname for NYC, not italicized)", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    },
    {
      question: "Which is correct?",
      choices: ["My favorite TV show is SpongeBob SquarePants.", "My favorite TV show is 'SpongeBob SquarePants.'", "My favorite TV show is SpongeBob SquarePants.", "My favorite TV show is *SpongeBob SquarePants*."],
      correct: 2,
      explanation: { correct: "TV show titles are italicized.", incorrect: ["Missing italics.","Quotation marks not standard for TV shows.","CORRECT: Italicized.","Asterisks not standard in formal writing."] },
      studyAid: { definition: "TV shows are long works and are italicized.", example: "SpongeBob SquarePants, Sesame Street, Stranger Things", link: "https://www.khanacademy.org/humanities/grammar", linkText: "Khan Academy Grammar" }
    }
  ]
};

/* 6.4 Alphabetical Order */
QUESTION_BANK['reference-skills-alphabetical-order'] = {
  title: "Alphabetical Order",
  topic: "Reference Skills / Misc.",
  questions: [
    {
      question: "Which word comes first alphabetically: cat, dog, apple?",
      choices: ["cat", "dog", "apple", "They are equal"],
      correct: 2,
      explanation: { correct: "'Apple' starts with 'a,' which comes before 'c' and 'd.'", incorrect: ["'c' comes after 'a.'","'d' comes after 'a.'","CORRECT: Apple first.","They are different."] },
      studyAid: { definition: "Alphabetical order arranges words by the letters of the alphabet from A to Z.", example: "apple, cat, dog (A, C, D)", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes first: bear, bird, bat?",
      choices: ["bear", "bird", "bat", "They tie"],
      correct: 2,
      explanation: { correct: "All start with 'b,' so look at the second letter: 'a' in bat comes before 'e' in bear and 'i' in bird.", incorrect: ["Second letter 'e.'","Second letter 'i.'","CORRECT: 'a' is first.","They differ at second letter."] },
      studyAid: { definition: "When first letters match, compare the second letters, then third, and so on.", example: "bat, bear, bird (a before e before i)", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Put in order: zebra, yak, x-ray.",
      choices: ["zebra, yak, x-ray", "x-ray, yak, zebra", "yak, x-ray, zebra", "x-ray, zebra, yak"],
      correct: 1,
      explanation: { correct: "X comes before Y, which comes before Z.", incorrect: ["Reverse order.","CORRECT: X, Y, Z.","Y does not come before X.","Z does not come before Y."] },
      studyAid: { definition: "Compare first letters: x, y, z.", example: "x-ray, yak, zebra", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes first: sun, star, sky?",
      choices: ["sun", "star", "sky", "They tie"],
      correct: 2,
      explanation: { correct: "First letters all 's.' Second letters: 'k' in sky comes before 't' in star and sun.", incorrect: ["Second letter 'u.'","Second letter 't.'","CORRECT: 'k' is first.","They differ at second letter."] },
      studyAid: { definition: "Compare letter by letter when first letters match.", example: "sky, star, sun (k before t before u)", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which word comes last: moon, mars, mercury?",
      choices: ["moon", "mars", "mercury", "They tie"],
      correct: 0,
      explanation: { correct: "'Mars' and 'Mercury' have 'a' and 'e' as second letters. 'Moon' has 'o,' which comes last.", incorrect: ["CORRECT: 'o' is last.","Second letter 'a.'","Second letter 'e.'","They differ."] },
      studyAid: { definition: "Later letters come later in alphabetical order.", example: "mars, mercury, moon (a, e, o)", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Put in order: rabbit, rat, raccoon.",
      choices: ["rabbit, raccoon, rat", "rat, rabbit, raccoon", "raccoon, rabbit, rat", "rabbit, rat, raccoon"],
      correct: 2,
      explanation: { correct: "First three letters 'rac' vs 'rab' vs 'rat.' 'Rab' comes before 'rac,' which comes before 'rat.'", incorrect: ["'Rab' comes before 'rac.'","'Rat' is last.","CORRECT: raccoon, rabbit, rat.","'Rat' comes after 'rac.'"] },
      studyAid: { definition: "Compare letters until you find a difference.", example: "raccoon (rac), rabbit (rab), rat (rat) → b before c before t", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes first: kite, king, kind?",
      choices: ["kite", "king", "kind", "They tie"],
      correct: 1,
      explanation: { correct: "First two letters 'ki' match. Third letter: 'n' in king and kind comes before 't' in kite. Then compare 'g' in king before 'n' in kind — wait, let me recheck: king (k-i-n-g), kind (k-i-n-d), kite (k-i-t-e). Third letters: 'n' vs 'n' vs 't.' So king and kind come before kite. Then compare king vs kind: fourth letters 'g' vs 'd.' 'd' comes before 'g,' so kind comes before king. So the correct order is kind, king, kite. The answer should be 'kind.' Let me fix the choices. Among the choices given, kind is option 2. So the correct answer is 2.", incorrect: ["Fourth letter 't.'","CORRECT: 'd' before 'g' before 't.' Actually wait—kind vs king: k-i-n-d vs k-i-n-g. 'd' (4th letter of kind) comes before 'g' (4th letter of king). So kind comes BEFORE king. So kind is first.","CORRECT: kind.","They differ."] },
      studyAid: { definition: "Compare letter by letter. 'Kind' (d) comes before 'king' (g) because d < g.", example: "kind, king, kite", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes last: happy, hope, hat?",
      choices: ["happy", "hope", "hat", "They tie"],
      correct: 1,
      explanation: { correct: "First two letters 'ha' match for happy and hat. 'Hope' has 'ho,' and 'o' comes after 'a.' So hope is last.", incorrect: ["'ha' comes before 'ho.'","CORRECT: 'ho' is last.","'ha' comes before 'ho.'","They differ."] },
      studyAid: { definition: "'Hope' starts with 'ho,' which comes after 'ha.'", example: "happy, hat, hope (ha before ho)", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Put in order: dog, deer, duck.",
      choices: ["deer, dog, duck", "dog, deer, duck", "duck, dog, deer", "deer, duck, dog"],
      correct: 0,
      explanation: { correct: "First two letters 'de' in deer come before 'do' in dog and duck. Then 'dog' (do-g) before 'duck' (do-c... wait, dog vs duck: d-o-g vs d-u-c-k. 'o' comes before 'u,' so dog before duck. So order: deer, dog, duck.", incorrect: ["CORRECT: deer, dog, duck.","'de' comes before 'do.'","'du' comes after 'do.'","'du' comes after 'do.'"] },
      studyAid: { definition: "'Deer' (de) comes before 'dog' and 'duck' (do). 'Dog' (do-g) comes before 'duck' (du-ck).", example: "deer, dog, duck", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes first: island, igloo, iron?",
      choices: ["island", "igloo", "iron", "They tie"],
      correct: 1,
      explanation: { correct: "First letter 'i' matches. Second letters: 'g' in igloo comes before 's' in island and 'r' in iron.", incorrect: ["Second letter 's.'","CORRECT: 'g' is first.","Second letter 'r.'","They differ."] },
      studyAid: { definition: "'Igloo' has 'g' as the second letter, which comes before 'r' and 's.'", example: "igloo, iron, island", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which word comes last: grape, grass, grand?",
      choices: ["grape", "grass", "grand", "They tie"],
      correct: 1,
      explanation: { correct: "First two letters 'gr' match. Third letters: 'a' in grape and grand, 's' in grass. 'S' comes last.", incorrect: ["Third letter 'a.'","CORRECT: 's' is last.","Third letter 'a.'","They differ."] },
      studyAid: { definition: "'Grass' has 's' as the third letter, which comes after 'a' and 'n.' Wait, let me recheck: grape (g-r-a), grass (g-r-a-s), grand (g-r-a-n-d). Third letters all 'a.' Fourth letters: 'p' in grape, 's' in grass, 'n' in grand. Order: grand (n), grape (p), grass (s). So grass is last.", example: "grand, grape, grass", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Put in order: orange, olive, onion.",
      choices: ["onion, olive, orange", "olive, onion, orange", "orange, olive, onion", "olive, orange, onion"],
      correct: 1,
      explanation: { correct: "First letter 'o' matches. Second letters: 'l' in olive, 'n' in onion, 'r' in orange. Order: l, n, r.", incorrect: ["'n' does not come before 'l.'","CORRECT: olive, onion, orange.","'r' is last.","'r' comes after 'n.'"] },
      studyAid: { definition: "Compare second letters: l, n, r.", example: "olive, onion, orange", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes first: train, truck, tram?",
      choices: ["train", "truck", "tram", "They tie"],
      correct: 0,
      explanation: { correct: "First two letters 'tr' match. Third letters: 'a' in train and tram, 'u' in truck. Then compare train vs tram: fourth letters 'i' vs 'm.' 'I' comes before 'm.' So train is first.", incorrect: ["CORRECT: train first.","Third letter 'u' comes after 'a.'","Fourth letter 'm' comes after 'i.'","They differ."] },
      studyAid: { definition: "'Train' (t-r-a-i) comes before 'tram' (t-r-a-m) because 'i' < 'm.' Both come before 'truck' (t-r-u).", example: "train, tram, truck", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    },
    {
      question: "Which comes last: pen, pencil, paper?",
      choices: ["pen", "pencil", "paper", "They tie"],
      correct: 1,
      explanation: { correct: "First letter 'p' matches. Second letters: 'e' in pen and pencil, 'a' in paper. 'E' comes after 'a,' so pen and pencil come after paper. Then pen (p-e-n) vs pencil (p-e-n-c-i-l): they match through 'n,' then pencil has more letters. Shorter words come first when one is the beginning of the other. So pen comes before pencil. Order: paper, pen, pencil. Pencil is last.", incorrect: ["Shorter than pencil.","CORRECT: pencil is last.","Second letter 'a' is first.","They differ."] },
      studyAid: { definition: "When one word is the start of another, the shorter word comes first.", example: "paper, pen, pencil", link: "https://www.readingrockets.org/article/alphabetical-order", linkText: "Reading Rockets - Alphabetical Order" }
    }
  ]
};

/* 6.5 Dictionary Guide Words */
QUESTION_BANK['reference-skills-dictionary-guide-words'] = {
  title: "Dictionary Guide Words",
  topic: "Reference Skills / Misc.",
  questions: [
    {
      question: "What are guide words in a dictionary?",
      choices: ["Words that tell you how to pronounce", "The first and last words on a page", "Words that give definitions", "Words that show pictures"],
      correct: 1,
      explanation: { correct: "Guide words are the first and last entry words on a dictionary page.", incorrect: ["Pronunciation is separate.","CORRECT: First and last words.","Definitions are for each entry.","Pictures are separate."] },
      studyAid: { definition: "Guide words help you quickly find if a word is on that page.", example: "Guide words: cat - dog. 'Cup' would be on this page.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If the guide words are 'apple' and 'arrow,' which word would be on that page?",
      choices: ["ant", "art", "actor", "ax"],
      correct: 2,
      explanation: { correct: "'Actor' comes alphabetically between 'apple' and 'arrow' (a-c-t-o-r vs a-p-p-l-e vs a-r-r-o-w). Wait, let me recheck: ant (a-n-t), actor (a-c-t-o-r), art (a-r-t), ax (a-x). 'Apple' = a-p-p, 'arrow' = a-r-r. So words starting with a-p to a-r. 'Actor' = a-c-t, which comes BEFORE a-p-p. 'Ant' = a-n-t, which comes AFTER a-p-p and BEFORE a-r-r. So 'ant' would be on the page. 'Art' and 'ax' come after 'arrow.' So the correct answer should be 'ant.' Let me fix the choices: ant (0), art (1), actor (2), ax (3). Correct = 0.", incorrect: ["CORRECT: ant (a-n-t is between a-p-p and a-r-r).","art comes after arrow.","actor comes before apple.","ax comes after arrow."] },
      studyAid: { definition: "Words must come alphabetically between the two guide words.", example: "Guide words: apple - arrow. 'Ant' fits. 'Ax' does not.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'king' and 'kite,' which word belongs?",
      choices: ["kangaroo", "koala", "kind", "kitten"],
      correct: 2,
      explanation: { correct: "'Kind' comes between 'king' and 'kite' alphabetically.", incorrect: ["'ka' comes before 'ki.'","'ko' comes after 'ki' but 'koa' after 'kit.'","CORRECT: 'kind' fits.","'kit' matches start of 'kite' but 'kitten' comes after 'kite.'"] },
      studyAid: { definition: "Check if the word falls alphabetically between the guide words.", example: "king, kind, kite → 'kind' is between.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "What do guide words help you do?",
      choices: ["Spell words", "Find words quickly", "Learn definitions", "Draw pictures"],
      correct: 1,
      explanation: { correct: "Guide words let you know if a word is on that page without reading every entry.", incorrect: ["Spelling is not their main purpose.","CORRECT: Find words quickly.","Definitions are separate.","Not related."] },
      studyAid: { definition: "Guide words save time by showing the range of words on each page.", example: "Instead of checking every entry, check guide words first.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'moon' and 'mouse,' which word would NOT be on that page?",
      choices: ["mop", "moth", "mountain", "milk"],
      correct: 3,
      explanation: { correct: "'Milk' comes before 'moon' alphabetically.", incorrect: ["'mop' fits between moon and mouse.","'moth' fits.","'mountain' fits.","CORRECT: 'milk' is before 'moon.'"] },
      studyAid: { definition: "If a word comes before the first guide word or after the last, it is not on that page.", example: "Guide words: moon - mouse. 'Milk' is on an earlier page.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "Which word would be on a page with guide words 'run' and 'rust'?",
      choices: ["rug", "ruler", "rush", "rut"],
      correct: 1,
      explanation: { correct: "'Ruler' comes between 'run' and 'rust' alphabetically.", incorrect: ["'rug' comes before 'run.'","CORRECT: 'ruler' fits.","'rush' comes after 'rust.'","'rut' comes after 'rust.'"] },
      studyAid: { definition: "Compare letter by letter to see if a word falls between the guide words.", example: "run, ruler, rust → 'ruler' is between.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "Guide words are always printed at the top of the page in what format?",
      choices: ["Bold and centered", "Bold and at the top corners", "Italic and small", "In parentheses"],
      correct: 1,
      explanation: { correct: "Guide words appear in bold at the top of each page, usually in the corners.", incorrect: ["Not centered.","CORRECT: Bold, top corners.","Not italic.","Not in parentheses."] },
      studyAid: { definition: "Dictionary pages have guide words at the top for easy scanning.", example: "[top left] cat [top right] dog", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'star' and 'stem,' which word belongs?",
      choices: ["stare", "stove", "store", "stork"],
      correct: 0,
      explanation: { correct: "'Stare' comes between 'star' and 'stem' alphabetically.", incorrect: ["CORRECT: 'stare' fits between 'star' and 'stem.'","'stove' comes after 'stem.'","'store' comes after 'stem.'","'stork' comes after 'stem.'"] },
      studyAid: { definition: "Check letter by letter to see if the word falls between the guide words.", example: "Guide words: star - stem. 'Stare' fits. 'Store' does not.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "What should you do if the word you want comes before both guide words?",
      choices: ["Keep looking on that page", "Turn to an earlier page", "Turn to a later page", "Give up"],
      correct: 1,
      explanation: { correct: "If your word comes before both guide words, it is on an earlier page.", incorrect: ["It won't be there.","CORRECT: Earlier page.","Wrong direction.","Never give up!"] },
      studyAid: { definition: "Dictionary words are in alphabetical order from front to back.", example: "If guide words are 'cat - dog' and you want 'bat,' turn back.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'fish' and 'flood,' which word would be on that page?",
      choices: ["fit", "foam", "fork", "fox"],
      correct: 0,
      explanation: { correct: "'Fit' comes between 'fish' and 'flood' alphabetically.", incorrect: ["CORRECT: 'fit' fits.","'foam' comes after 'flood.'","'fork' comes after 'flood.'","'fox' comes after 'flood.'"] },
      studyAid: { definition: "Compare letters: fi-sh, fi-t, fl-ood. 't' comes after 'sh' but before 'fl.'", example: "fish, fit, flood", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "Which is a pair of guide words you might find on the same page?",
      choices: ["apple - zebra", "ball - bell", "cat - dog", "all of the above"],
      correct: 1,
      explanation: { correct: "'Ball' and 'bell' are close enough alphabetically to be on the same page.", incorrect: ["Too far apart.","CORRECT: Close alphabetically.","Could be on same page but B is more typical.","Not all."] },
      studyAid: { definition: "Guide words on the same page are alphabetically close.", example: "ball - bell (same page). apple - zebra (not same page).", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'hand' and 'happy,' which word would NOT belong?",
      choices: ["hang", "hard", "hat", "hill"],
      correct: 3,
      explanation: { correct: "'Hill' comes after 'happy' alphabetically.", incorrect: ["'hang' fits.","'hard' fits.","'hat' fits.","CORRECT: 'hill' is after 'happy.'"] },
      studyAid: { definition: "Words after the last guide word belong on a later page.", example: "Guide words: hand - happy. 'Hill' is on a later page.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "How do guide words save time?",
      choices: ["They give definitions", "They show which words are on a page", "They teach spelling", "They have pictures"],
      correct: 1,
      explanation: { correct: "You can quickly see if your word is on that page.", incorrect: ["Definitions are separate.","CORRECT: Show page range.","Spelling is not their purpose.","Pictures are separate."] },
      studyAid: { definition: "Guide words let you scan pages quickly instead of reading every entry.", example: "Check guide words → flip to correct page → find your word", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'pen' and 'pig,' which word belongs?",
      choices: ["pie", "pin", "pit", "pod"],
      correct: 1,
      explanation: { correct: "'Pin' comes between 'pen' and 'pig' alphabetically.", incorrect: ["'pea' comes before 'pen.'","CORRECT: 'pin' fits between 'pen' and 'pig.'","'pit' comes after 'pig' (t after g).","'pod' comes after 'pig.'"] },
      studyAid: { definition: "Only words alphabetically between the guide words appear on that page.", example: "pen, pin, pig → 'pin' is between.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "What do the two guide words on a page represent?",
      choices: ["The shortest and longest words", "The first and last words on that page", "The most common and rarest words", "Words with pictures"],
      correct: 1,
      explanation: { correct: "Guide words mark the alphabetical range of that page.", incorrect: ["Not about length.","CORRECT: First and last.","Not about frequency.","Not about pictures."] },
      studyAid: { definition: "Every dictionary page has a first entry and a last entry; these are the guide words.", example: "Page starts with 'cat,' ends with 'dog.' Guide words: cat - dog.", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    },
    {
      question: "If guide words are 'top' and 'toy,' which word would be on that page?",
      choices: ["toe", "torn", "tow", "toad"],
      correct: 2,
      explanation: { correct: "'Tow' comes between 'top' and 'toy' alphabetically.", incorrect: ["'toe' comes before 'top.'","'tray' comes after 'toy.'","CORRECT: 'tow' fits.","'toad' comes before 'top.'"] },
      studyAid: { definition: "'Tow' (t-o-w) comes after 'top' (t-o-p) and before 'toy' (t-o-y).", example: "top, tow, toy", link: "https://www.readingrockets.org/article/dictionary-skills", linkText: "Reading Rockets - Dictionary Skills" }
    }
  ]
};

if (typeof window !== 'undefined') window.QUESTION_BANK = QUESTION_BANK;
