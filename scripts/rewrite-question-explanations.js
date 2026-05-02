#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  computeContentHash
} = require('./qa/question-metadata');
const {
  loadJsonSources,
  serializeJsonSource,
  writeJsonSource
} = require('./qa/json-source-loader');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STATE_ABBREVIATIONS = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY'
};
const ABBREVIATION_OWNERS = Object.fromEntries(Object.entries(STATE_ABBREVIATIONS).map(([name, abbr]) => [abbr, name]));
const STREET_ABBREVIATIONS = {
  Road: 'Rd.',
  Street: 'St.',
  Drive: 'Dr.',
  Lane: 'Ln.',
  Avenue: 'Ave.',
  Boulevard: 'Blvd.'
};
const COMMON_ABBREVIATIONS = {
  Doctor: 'Dr.',
  Mister: 'Mr.',
  Avenue: 'Ave.',
  'et cetera': 'etc.',
  January: 'Jan.',
  Junior: 'Jr.',
  Incorporated: 'Inc.',
  approximately: 'approx.',
  Road: 'Rd.',
  Street: 'St.',
  Drive: 'Dr.',
  Lane: 'Ln.',
  apartment: 'apt.',
  hospital: 'hosp.',
  building: 'bldg.',
  avenue: 'Ave.',
  Senior: 'Sr.',
  Inch: 'in.',
  Cup: 'c.',
  teaspoon: 'tsp.',
  yard: 'yd.',
  minute: 'min.',
  gallon: 'gal.',
  Wednesday: 'Wed.',
  September: 'Sept.'
};

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .trim();
}

function ensurePeriod(value) {
  const text = normalizeWhitespace(value);
  if (!text) return '';
  return /[.!?]["'”’)]?$/.test(text) ? text : `${text}.`;
}

function stripLeadIns(question) {
  return normalizeWhitespace(question)
    .replace(/^Grade\s+\d+\s+(Easy|Medium|Hard):\s*/i, '')
    .replace(/^Choose the best answer\.\s*/i, '')
    .replace(/^Analyze the details and choose the strongest answer\.\s*/i, '')
    .replace(/^Read (the|this) (passage|story|poem)\.\s*/i, '');
}

function quote(value) {
  const text = displayText(value);
  return text.includes('"') ? `'${text}'` : `"${text}"`;
}

function labelChoice(label, value) {
  const text = displayText(value);
  return `${label}: ${text}${/[.!?,;:]["'”’]?$/.test(text) ? '' : '.'}`;
}

function displayText(value) {
  return normalizeWhitespace(value)
    .replace(/([^.\s])\.\.(?=\s|$)/g, '$1.')
    .replace(/\s+\.\.\./g, ' ...');
}

function lowerFirst(value) {
  const text = normalizeWhitespace(value);
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : '';
}

function trimLong(value, max = 170) {
  const text = normalizeWhitespace(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max - 1)}...`;
}

function cleanExistingRationale(value, choice) {
  let text = normalizeWhitespace(value);
  if (!text) return '';
  text = text
    .replace(/^Answer:\s*/i, '')
    .replace(/^Correct:\s*/i, '')
    .replace(/^Not:\s*/i, '');
  const normalizedChoice = normalizeWhitespace(choice);
  if (normalizedChoice) {
    text = text.replace(new RegExp(`^${escapeRegExp(normalizedChoice)}\\.?\\s*`, 'i'), '');
  }
  text = text.replace(/^[-:;]\s*/, '');
  if (isGenericRationale(text)) return '';
  return text;
}

function isGenericRationale(value) {
  const text = normalizeWhitespace(value);
  if (!text) return true;
  return /^(check|try again|incorrect|wrong|not quite|this is incorrect)\b/i.test(text) ||
    /check the (grammar|rule|clue|usage|question)/i.test(text) ||
    /does not match the rules? for/i.test(text) ||
    /leaves a capitalization, punctuation, spelling, grammar, or meaning error/i.test(text);
}

function getRule(question) {
  const inferred = getInferredRule(question);
  if (inferred) return inferred;
  const studyAid = question.studyAid || {};
  const definition = normalizeWhitespace(studyAid.definition);
  const example = normalizeWhitespace(studyAid.example);
  if (definition && definition.length <= 220) return definition;
  if (example && example.length <= 220) return example;
  if (definition) return trimLong(definition, 220);
  if (example) return trimLong(example, 220);
  return 'The best answer must match the exact clue in the question.';
}

function buildStudyAid(question) {
  const prompt = stripLeadIns(question.question || '');
  const existing = question.studyAid || {};
  let definition = '';
  let example = '';
  if (isFamilyTitleCapitalizationQuestion(question)) {
    definition = 'Capitalize family titles when they act like names, including direct address; keep them lowercase after possessive words such as my, your, or our.';
    example = 'Mother is capitalized in direct address. Dad’s is capitalized when it stands for a name. My aunt and uncle stay lowercase after my.';
  } else if (isTransformFragmentPrompt(question)) {
    definition = 'A sentence fragment is missing something a complete sentence needs, such as a main verb or a complete thought.';
    example = 'Three ways to make good grades is only a noun phrase. There are three ways to make good grades has a subject placeholder and the verb are, so it is complete.';
  } else if (/capitalized correctly after an interruption in dialogue/i.test(prompt)) {
    definition = 'When a speaker tag interrupts one sentence, the second part usually continues with a lowercase letter; names still keep capitals.';
    example = '"I think," Nora whispered, "we should wait." continues the same sentence after whispered, so we stays lowercase.';
  } else if (isCapitalizationCoursePrompt(question)) {
    definition = 'School subjects are usually lowercase unless they are language names or official course titles.';
    example = 'German and Spanish need capitals because they are languages; math and science usually stay lowercase.';
  } else if (isCapitalizationAlwaysConceptPrompt(question)) {
    definition = 'Some words always need capitals because of their job, but many words only need capitals in certain places.';
    example = 'The first word of a sentence always starts with a capital; common nouns and words after a colon do not always need one.';
  } else if (isCapitalizationFirstWordChoicePrompt(question)) {
    definition = 'Capitalize the first word when the words form a sentence or begin a sentence; sentence fragments only need a capital when they are actually used as sentence starts.';
    example = 'after a while, the children became tired should begin After because it is the start of a sentence.';
  } else if (isCapitalizationListPrompt(question)) {
    definition = 'Capitalization depends on each word’s job: capitalize sentence starts, direct-quote starts, proper names, places, nationalities, languages, holidays, and titles used as names.';
    example = 'In “my aunt and Dad went to Texas,” Dad and Texas need capitals, but my and aunt do not.';
  } else if ((/abbreviation is incorrect/i.test(prompt) && isPostalStateQuestion(question)) || /state abbreviation/i.test(prompt)) {
    definition = 'Postal state abbreviations use two capital letters with no periods; the letters must match the state name.';
    example = 'Maine is ME. MA is Massachusetts, so "Maine - MA" is not correct.';
  } else if (/not a correct abbreviation/i.test(prompt)) {
    definition = 'Common address-word abbreviations must use the accepted short form and period.';
    example = 'Road becomes Rd., Street becomes St., Drive becomes Dr., and Lane becomes Ln.';
  } else if (/abbreviation is incorrect|abbreviation is inc orrect/i.test(prompt)) {
    definition = 'Accepted abbreviations use the standard letters, capitalization, and periods for that word.';
    example = 'Wednesday is Wed., yard is yd., and Avenue is Ave.';
  } else if (/uses an abbreviation/i.test(prompt)) {
    definition = 'Many titles before names use an accepted abbreviation with one period at the end.';
    example = 'Doctor Patel can be written as Dr. Patel.';
  } else if (/acronym/i.test(prompt)) {
    definition = 'Acronyms made from initials are usually written in capital letters with no periods.';
    example = 'NASA uses all capitals, not N.a.s.a. or Nasa.';
  } else if (/semicolon/i.test(prompt)) {
    definition = 'A semicolon can join two complete, closely related sentences.';
    example = 'The storm ended; the teams returned.';
  } else if (/colon correctly/i.test(prompt)) {
    definition = 'A colon can introduce a list after a complete setup.';
    example = 'Bring three supplies: pencils, paper, and glue.';
  } else if (/parentheses/i.test(prompt)) {
    definition = 'Parentheses come in a matching pair around extra information.';
    example = 'The trip (originally planned for May) moved to June.';
  } else if (/introductory phrase/i.test(prompt)) {
    definition = 'Use a comma after an introductory phrase or clause before the main sentence.';
    example = 'After the bell rang, students lined up.';
  } else if (/dialogue|speaker tag|new speaker/i.test(prompt)) {
    definition = 'Dialogue keeps spoken words inside quotation marks and uses punctuation to connect speaker tags.';
    example = '"The bus is here," announced Mr. Lee.';
  } else if (/hyphen/i.test(prompt)) {
    definition = 'A hyphen can join words that work together as one describing word before a noun.';
    example = 'A well-known author uses well-known to describe author.';
  } else if (/dash/i.test(prompt)) {
    definition = 'A dash can show a sudden pause or added thought, but it should not split words that belong together.';
    example = 'I opened the box - and gasped at the surprise inside.';
  } else if (/combined into one sentence/i.test(prompt)) {
    definition = 'Combine sentences when the ideas are closely related and can make one clearer sentence.';
    example = 'Related ideas about one person or event often combine better than unrelated events.';
  } else if (/capitalized correctly/i.test(prompt)) {
    definition = 'Capitalize titles and proper names; keep ordinary words lowercase unless they start a sentence.';
    example = 'Dr. Fred E. Meyer capitalizes the title and each part of the name.';
  } else if (/D\.C\.|Washington/i.test(prompt)) {
    definition = 'Place abbreviations such as D.C. keep periods, and commas may be needed around the place name in a sentence.';
    example = 'I visited Washington, D.C., last summer.';
  } else if ((question.choices || []).some(choice => /Correct as is/i.test(String(choice || '')))) {
    definition = 'When "Correct as is" is a choice, check whether the original sentence already follows the rule.';
    example = 'Doctor Brown is correct when the title is written out instead of abbreviated as Dr.';
  } else if (/missing word/i.test(prompt)) {
    definition = 'Choose the pronoun that agrees with the noun and fits the sentence meaning.';
    example = 'Mrs. Porter is one woman, so the subject pronoun is She.';
  }
  if (!definition && !example) return existing;
  return {
    definition: definition || existing.definition || '',
    example: example || existing.example || '',
    link: existing.link || 'https://www.thecorestandards.org/ELA-Literacy/',
    linkText: existing.linkText || 'Common Core ELA standards'
  };
}

function getInferredRule(question) {
  const prompt = stripLeadIns(question.question || '');
  const skillText = getSkillText(question);
  const sourceSet = getSourceSet(question);
  if (isFamilyTitleCapitalizationQuestion(question)) {
    return 'Capitalize family titles when they are used like names or in direct address; keep family words lowercase after possessive words such as my.';
  }
  if (isTransformFragmentPrompt(question)) {
    return 'To fix a fragment, add the missing sentence part. A noun phrase such as "Three ways..." needs a main verb to become a complete sentence.';
  }
  if (/capitalized correctly after an interruption in dialogue/i.test(prompt)) {
    return 'When a speaker tag interrupts one sentence, the second part continues lowercase unless a new sentence begins; names still need capitals.';
  }
  if (isCapitalizationCoursePrompt(question)) {
    return 'Capitalize language names such as German, Spanish, English, and French; ordinary school subjects usually stay lowercase.';
  }
  if (isCapitalizationAlwaysConceptPrompt(question)) {
    return 'The first word of a sentence always needs a capital; common nouns, seasons, and words after colons do not always need capitals.';
  }
  if (isCapitalizationFirstWordChoicePrompt(question)) {
    return 'Capitalize the first word when the words are being used as the beginning of a full sentence.';
  }
  if (isCapitalizationListPrompt(question)) {
    return 'Capitalize each word according to its job in the sentence: sentence start, quotation start, proper name, place, title, language, nationality, day, month, or holiday.';
  }
  if ((/abbreviation is incorrect/i.test(prompt) && isPostalStateQuestion(question)) || /state abbreviation/i.test(prompt)) {
    return 'Postal state abbreviations use two capital letters with no periods, and the letters must match the state.';
  }
  if (/abbreviation is incorrect|abbreviation is inc orrect|not a correct abbreviation/i.test(prompt)) {
    return 'Accepted abbreviations use the standard letters, capitalization, and periods for that word.';
  }
  if (/not a correct abbreviation/i.test(prompt)) {
    return 'Address-word abbreviations use accepted short forms, such as Rd. for Road and Ln. for Lane.';
  }
  if (/uses an abbreviation/i.test(prompt)) {
    return 'Title abbreviations such as Dr. use one period at the end.';
  }
  if (/acronym/i.test(prompt)) {
    return 'Acronyms such as NASA are usually written in all capital letters with no periods.';
  }
  if (/telephone message/i.test(prompt)) {
    return 'A complete telephone message tells who called and what the listener should know or do next.';
  }
  if (/clear situation/i.test(prompt)) {
    return 'A strong narrative opening introduces who is involved, where they are, and what is happening.';
  }
  if (/sensory description/i.test(prompt)) {
    return 'Sensory details help readers experience a scene through smell, sound, sight, taste, or touch.';
  }
  if (/dialogue correctly|dialogue/i.test(prompt)) {
    return 'Story dialogue puts spoken words in quotation marks and uses punctuation to connect the speaker tag.';
  }
  if (/first-person point of view/i.test(prompt)) {
    return 'First-person point of view uses pronouns such as I, me, my, we, and our.';
  }
  if (/third-person limited/i.test(prompt)) {
    return 'Third-person limited tells the story from outside one character while showing that character’s thoughts or feelings.';
  }
  if (/formal tone|formal language|uses a formal tone/i.test(prompt)) {
    return 'Formal tone uses respectful, clear wording and avoids slang or overly casual language.';
  }
  if (/informal tone|informal language/i.test(prompt)) {
    return 'Informal tone sounds relaxed and conversational, like speech with friends or family.';
  }
  if (/worried tone|gloomy mood|tone|mood/i.test(prompt)) {
    return 'Tone and mood come from word choice and details that create a feeling for the reader.';
  }
  if (/more precise|precise revision|makes the sentence more precise/i.test(prompt)) {
    return 'Precise revision replaces vague words with specific actions, nouns, or details.';
  }
  if (/combines ideas smoothly|combine/i.test(prompt)) {
    return 'A smooth sentence combination connects related ideas without creating a run-on, fragment, or word jumble.';
  }
  if (/verb tense consistent|progressive tense|correct verb/i.test(prompt)) {
    return 'Verb forms should match the sentence time clue and stay consistent unless the meaning changes.';
  }
  if (/topic sentence/i.test(prompt)) {
    return 'A topic sentence states the main idea that the rest of the paragraph can support.';
  }
  if (/support(s|ing)? the (topic sentence|claim)|reason best supports|evidence would best support/i.test(prompt)) {
    return 'Supporting details, reasons, and evidence must connect directly to the topic or claim.';
  }
  if (/closing sentence/i.test(prompt)) {
    return 'A closing sentence wraps up the paragraph by returning to the main idea.';
  }
  if (/does NOT belong|does not belong/i.test(prompt)) {
    return 'Every sentence in a paragraph should stay connected to the same topic.';
  }
  if (/informative introduction/i.test(prompt)) {
    return 'An informative introduction names the topic and begins with factual, relevant information.';
  }
  if (/factual enough|informative report/i.test(prompt)) {
    return 'Informative reports use facts that can be checked, not opinions or persuasive claims.';
  }
  if (/organize an explanatory paragraph|transition/i.test(prompt)) {
    return 'Transitions and sequence words help organize ideas so readers can follow the explanation.';
  }
  if (/claim/i.test(prompt)) {
    return 'A claim states a position that can be supported with reasons or evidence.';
  }
  if (/source is best|finding synonyms|finding the meaning/i.test(prompt)) {
    return 'Choose the reference source that matches the information you need.';
  }
  if (/combined into one sentence/i.test(prompt)) {
    return 'A smooth sentence combination connects related ideas without creating a run-on, fragment, or word jumble.';
  }
  if (/capitalized correctly/i.test(prompt)) {
    return 'Capitalize proper names and titles used with names; keep ordinary words lowercase unless they start a sentence.';
  }
  if (/correct missing word/i.test(prompt)) {
    return 'A pronoun must agree with the noun it replaces and fit its job in the sentence.';
  }
  if ((question.choices || []).some(choice => /Correct as is/i.test(String(choice || '')))) {
    return 'Choose "Correct as is" only when the original wording already follows the capitalization, abbreviation, or punctuation rule.';
  }
  if (/semicolon/i.test(prompt)) {
    return 'A semicolon can join two complete, closely related thoughts.';
  }
  if (/\bcolon\b/i.test(prompt)) {
    return 'A colon can introduce a list after a complete setup.';
  }
  if (/parentheses/i.test(prompt)) {
    return 'Parentheses come in a matching pair around extra information that can be removed without breaking the sentence.';
  }
  if (/introductory phrase/i.test(prompt)) {
    return 'Use a comma after an introductory phrase or clause before the main part of the sentence begins.';
  }
  if (/hyphen/i.test(prompt)) {
    return 'A hyphen can join words that work together as one describing word before a noun.';
  }
  if (/dash/i.test(prompt)) {
    return 'A dash can show a sudden break or added thought, but it should not split words that belong together.';
  }
  if (/speaker tag|new speaker/i.test(prompt)) {
    return 'When a new speaker talks, start a new quoted sentence and keep each speaker’s words inside quotation marks.';
  }
  if (/colon-time/.test(sourceSet) || /\b\d{1,2}[:.,;-]\d{2}\b/.test(prompt)) {
    return 'Use a colon to separate hours and minutes in standard time.';
  }
  if (/punctuation-end-sentence/.test(sourceSet)) {
    return 'End punctuation must match the sentence purpose: period for statements and mild commands, question mark for direct questions, and exclamation point for strong feeling or urgency.';
  }
  if (/commas-dates/.test(sourceSet)) {
    return 'Use commas to separate the day from the year, and use another comma after the year when the sentence continues.';
  }
  if (/commas-addresses/.test(sourceSet)) {
    return 'Use commas between the street, city, and state in a one-line address; do not put a comma between the state and ZIP code.';
  }
  if (/commas-series/.test(sourceSet)) {
    return 'Use commas to separate three or more items in a series.';
  }
  if (/periods-abbreviations|abbreviations-acronyms/.test(sourceSet)) {
    return 'Standard abbreviations use periods in specific places; acronyms usually do not use periods.';
  }
  if (/quotation|dialogue/.test(sourceSet) && (
    /\b(quote|quotation|dialogue|speaker|spoken|said|asked|punctuated)\b/i.test(prompt) ||
    (question.choices || []).some(choice => /["“”‘’]/.test(String(choice || '')))
  )) {
    return 'Dialogue punctuation keeps the spoken words inside quotation marks and places commas or end marks with the quoted words.';
  }
  if (/contraction/.test(skillText)) {
    return 'A contraction combines words and uses an apostrophe to show where letters were left out.';
  }
  if (/belongs to\s+[A-Z]/i.test(prompt) || /apostrophe|possessive/.test(skillText)) {
    return 'For singular possession, add apostrophe + s to the one person or thing that owns something.';
  }
  if (/capital/.test(skillText) || /\bcapitalized\b/i.test(prompt)) {
    return 'Capitalize proper nouns, names, titles used with names, and the first word of a sentence; keep ordinary common nouns lowercase.';
  }
  if (/double-negative|double negatives/.test(skillText)) {
    return 'In Standard English, use one negative idea in a sentence instead of pairing a negative with hardly, scarcely, no, or never.';
  }
  if (/verb|tense/.test(skillText)) {
    return 'Choose the verb form that matches the time clue, helping verb, and subject in the sentence.';
  }
  if (/plural|singular/.test(skillText)) {
    return 'A plural noun names more than one; regular plurals often add s or es, while irregular plurals use special forms.';
  }
  if (/subject-predicate/.test(sourceSet)) {
    return 'The simple subject names who or what the sentence is about; the predicate tells what the subject does or is.';
  }
  if (/sentence-correction/.test(sourceSet)) {
    return 'A correct sentence keeps the intended meaning while fixing grammar, capitalization, punctuation, spelling, and usage errors.';
  }
  if (/identify-sentence/.test(sourceSet)) {
    return 'A complete sentence has a subject, a predicate, and a complete thought.';
  }
  if (/sentence-combinations/.test(sourceSet)) {
    return 'A strong sentence combination joins related ideas smoothly without creating a run-on or fragment.';
  }
  if (/friendly-letter/.test(sourceSet)) {
    return 'Friendly letters use standard parts such as the heading, greeting, body, closing, and signature.';
  }
  if (/paragraph-structure/.test(sourceSet)) {
    return 'Paragraph sentences should match their job: topic sentences state the main idea, details support it, and closings wrap it up.';
  }
  if (/revising-editing-strategy/.test(sourceSet)) {
    return 'Revision choices should make writing clearer, more precise, better organized, or more consistent.';
  }
  if (/pronoun-agreement-case/.test(sourceSet)) {
    return 'A pronoun must agree with the noun it replaces and fit its job as subject, object, or possessive.';
  }
  if (/prepositions-prepositional-phrases/.test(sourceSet)) {
    return 'A preposition shows a relationship such as place, time, direction, or connection to another word.';
  }
  if (/clauses-complex-sentences/.test(sourceSet)) {
    return 'Clauses have a subject and verb; dependent clauses cannot stand alone, while independent clauses can.';
  }
  if (/narrative-writing/.test(sourceSet)) {
    return 'Narrative writing develops characters, setting, events, dialogue, and sensory details to tell a story.';
  }
  if (/opinion-persuasive-writing/.test(sourceSet)) {
    return 'Opinion writing states a clear position and supports it with reasons.';
  }
  if (/informative-explanatory-writing/.test(sourceSet)) {
    return 'Informative writing introduces a topic and explains it with accurate, relevant details.';
  }
  if (/parts-of-speech-adjectives/.test(sourceSet)) {
    return 'Adjectives describe or limit nouns by telling which one, what kind, or how many.';
  }
  if (/parts-of-speech-nouns/.test(sourceSet)) {
    return 'Nouns name people, places, things, or ideas.';
  }
  if (/spelling/.test(sourceSet)) {
    return 'The correct spelling uses the accepted letter pattern for the word.';
  }
  if (/homophones/.test(sourceSet)) {
    return 'Homophones may sound alike, but the sentence meaning decides which spelling is correct.';
  }
  if (/comparatives-superlatives/.test(sourceSet)) {
    return 'Comparatives compare two things; superlatives compare three or more.';
  }
  if (/synonyms-antonyms/.test(sourceSet)) {
    return 'Synonyms have similar meanings, and antonyms have opposite meanings.';
  }
  if (/base-words/.test(sourceSet)) {
    return 'Prefixes, suffixes, and base words are meaningful parts that help build and explain a word.';
  }
  if (/figurative-language/.test(sourceSet)) {
    return 'Figurative language uses comparisons or nonliteral wording to create meaning.';
  }
  if (/rhyming/.test(sourceSet)) {
    return 'Rhyming words share the same ending sound.';
  }
  if (/reference-skills-sub-heading/.test(sourceSet)) {
    return 'A subheading introduces a smaller section inside a larger text.';
  }
  if (/reference-skills-italicize/.test(sourceSet)) {
    return 'Use italics for titles of longer works such as books, movies, magazines, and newspapers.';
  }
  if (/reference-skills-research-skills/.test(sourceSet)) {
    return 'Choose the reference source that best matches the kind of information you need.';
  }
  if (/authors-purpose/.test(sourceSet)) {
    return 'An author’s purpose is the main reason for writing, such as to inform, persuade, entertain, or explain.';
  }
  return '';
}

function getSkillText(question) {
  const metadata = question.metadata || {};
  return [
    ...(Array.isArray(metadata.skills) ? metadata.skills : []),
    ...(Array.isArray(metadata.skillIds) ? metadata.skillIds : []),
    metadata.sourceSet || ''
  ].join(' ').toLowerCase();
}

function promptFocus(question) {
  const prompt = stripLeadIns(question.question || '');
  const beforeQuote = prompt.split('"')[0].trim();
  if (/which/i.test(beforeQuote)) return lowerFirst(beforeQuote.replace(/\?$/, ''));
  if (/what/i.test(beforeQuote)) return lowerFirst(beforeQuote.replace(/\?$/, ''));
  if (/choose/i.test(beforeQuote)) return lowerFirst(beforeQuote.replace(/\?$/, ''));
  return lowerFirst(trimLong(beforeQuote || prompt, 130).replace(/\?$/, ''));
}

function asksForBadChoice(question) {
  const prompt = stripLeadIns(question.question || '');
  return /\b(which|what|choose|identify)\b[\s\S]{0,100}\b(not|incorrectly|incorrect|error|mistake|does not belong|least)\b/i.test(prompt) &&
    !/\bfact,\s+not an opinion\b/i.test(prompt);
}

function getSourceSet(question) {
  return String(question && question.metadata && question.metadata.sourceSet || '').toLowerCase();
}

function getChoiceLetters(question, predicate) {
  return (question.choices || [])
    .map((choice, index) => predicate(choice, index) ? LETTERS[index] : '')
    .filter(Boolean);
}

function hasTimeWithSeparator(value, separator) {
  const escaped = escapeRegExp(separator);
  return new RegExp(`\\b\\d{1,2}${escaped}\\d{2}\\b`).test(String(value || ''));
}

function hasColonTime(value) {
  return hasTimeWithSeparator(value, ':');
}

function hasSentenceEnd(value, mark) {
  return new RegExp(`${escapeRegExp(mark)}[\"'”’)]?$`).test(normalizeWhitespace(value));
}

function hasCommaBetweenMonthDay(value) {
  return /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan\.|Feb\.|Mar\.|Apr\.|Jun\.|Jul\.|Aug\.|Sept\.|Sep\.|Oct\.|Nov\.|Dec\.),\s+\d{1,2}\b/i.test(String(value || ''));
}

function hasDayYearComma(value) {
  return /\b\d{1,2},\s+\d{4}\b/.test(String(value || ''));
}

function countCommas(value) {
  return (String(value || '').match(/,/g) || []).length;
}

function parseNameAbbreviationPair(value) {
  const text = normalizeWhitespace(value).replace(/[–—]/g, '-');
  const match = text.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*-\s*([A-Za-z.]+)$/);
  if (!match) return null;
  return { name: match[1], abbreviation: match[2] };
}

function isPostalStateQuestion(question) {
  return /\bstate abbreviation\b|\bMinnesota\b|\bMissouri\b|\bMississippi\b|\bMaine\b|\bVirginia\b/i.test(`${question.question || ''} ${(question.choices || []).join(' ')}`);
}

function isValidStatePair(value) {
  const pair = parseNameAbbreviationPair(value);
  if (!pair) return false;
  return STATE_ABBREVIATIONS[pair.name] === pair.abbreviation;
}

function statePairReason(value) {
  const pair = parseNameAbbreviationPair(value);
  if (!pair) return '';
  const expected = STATE_ABBREVIATIONS[pair.name];
  if (!expected) return '';
  const belongsTo = ABBREVIATION_OWNERS[pair.abbreviation];
  if (pair.abbreviation === expected) return `${pair.abbreviation} is the postal abbreviation for ${pair.name}.`;
  if (belongsTo) return `${pair.abbreviation} is the postal abbreviation for ${belongsTo}, not ${pair.name}; ${pair.name} is ${expected}.`;
  return `${pair.name} is abbreviated ${expected}, not ${pair.abbreviation}.`;
}

function isStreetAbbreviationQuestion(question) {
  return /\bnot a correct abbreviation\b/i.test(question.question || '') ||
    (question.choices || []).some(choice => parseStreetAbbreviationPair(choice));
}

function parseStreetAbbreviationPair(value) {
  const text = normalizeWhitespace(value).replace(/[–—]/g, '-');
  const match = text.match(/^([A-Za-z]+)\s*-\s*([A-Za-z.]+)$/);
  if (!match || !STREET_ABBREVIATIONS[match[1]]) return null;
  return { word: match[1], abbreviation: match[2] };
}

function streetPairReason(value) {
  const pair = parseStreetAbbreviationPair(value);
  if (!pair) return '';
  const expected = STREET_ABBREVIATIONS[pair.word];
  if (pair.abbreviation === expected) return `${pair.abbreviation} is the accepted abbreviation for ${pair.word}.`;
  return `${pair.word} is abbreviated ${expected}, not ${quote(pair.abbreviation)}.`;
}

function parseCommonAbbreviationPair(value) {
  const text = normalizeWhitespace(value).replace(/[–—=]/g, '-');
  const match = text.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*-\s*([A-Za-z.]+)$/);
  if (!match) return null;
  const word = match[1];
  if (!COMMON_ABBREVIATIONS[word]) return null;
  return { word, abbreviation: match[2] };
}

function commonAbbreviationReason(value) {
  const pair = parseCommonAbbreviationPair(value);
  if (!pair) return '';
  const expected = COMMON_ABBREVIATIONS[pair.word];
  if (pair.abbreviation === expected) return `${pair.abbreviation} is the accepted abbreviation for ${pair.word}.`;
  return `${pair.word} is abbreviated ${expected}, not ${quote(pair.abbreviation)}.`;
}

function articleReason(choice, correctChoice, question, isCorrect) {
  const prompt = question.question || '';
  const blankTail = (prompt.match(/___\s+([^.'"?]+)/) || [])[1] || '';
  const nextWord = normalizeWhitespace(blankTail).split(/\s+/)[0] || 'the next word';
  if (isCorrect) {
    return `${quote(correctChoice)} fits before ${quote(nextWord)} because the article must match the sound that begins the next word.`;
  }
  if (/^a$/i.test(choice)) return `${quote(choice)} is used before consonant sounds, so it does not fit before ${quote(nextWord)} here.`;
  if (/^an$/i.test(choice)) return `${quote(choice)} is used before vowel sounds, so it does not fit the sound needed here.`;
  if (/^the$/i.test(choice)) return `${quote(choice)} points to a specific noun, but this sentence needs the indefinite article ${quote(correctChoice)}`;
  return `${quote(choice)} leaves out the article that the sentence needs before ${quote(nextWord)}.`;
}

function possessiveReason(choice, correctChoice, question, isCorrect) {
  const prompt = question.question || '';
  const bad = asksForBadChoice(question);
  const owner = (prompt.match(/belongs to\s+([A-Z][A-Za-z'-]*)/i) || [])[1] ||
    (correctChoice.match(/\b(?:The|A|An)\s+([A-Za-z]+)[’']s\s+/i) || [])[1] ||
    (correctChoice.match(/^([A-Z][A-Za-z'-]+)[’']s\b/) || [])[1] ||
    'the owner';
  const owned = (correctChoice.match(/[’']s\s+([A-Za-z]+)\b/) || [])[1] || 'the thing owned';
  if (isCorrect) {
    if (bad) return `${quote(correctChoice)} is the possessive form the prompt asks you to identify as incorrect or mismatched. Check where the apostrophe is placed and whether the owner is singular or plural.`;
    if (/\bits\b/i.test(correctChoice) && !/[’']/.test(correctChoice)) return `${quote(correctChoice)} is correct because possessive its has no apostrophe; ${quote("it's")} means ${quote('it is')} or ${quote('it has')}.`;
    if (/[A-Za-z]s[’']\b/.test(correctChoice)) return `${quote(correctChoice)} correctly puts the apostrophe after the plural owner that already ends in s.`;
    return `The prompt names one owner, ${owner}, so the singular possessive form adds apostrophe + s to the owner: ${quote(correctChoice)} shows that ${owned} belongs to ${owner}.`;
  }
  if (bad) return `${quote(choice)} is a correctly formed possessive or acceptable noun phrase, so it is not the incorrect choice the prompt asks for.`;
  if (/[’']s\s+\w+(?:ed|ing)\b/i.test(choice) || /[’']s\s+(?:a|an|the|not|parked|going)\b/i.test(choice)) {
    return `${quote(choice)} uses apostrophe + s like a contraction for "is" or "has," not as a possessive noun showing ownership.`;
  }
  if (/[’']s\s+(?:by|at|in|on|for|to|with)\b/i.test(choice)) {
    return `${quote(choice)} uses apostrophe + s where the sentence needs a regular noun form, so it does not clearly show ownership.`;
  }
  if (new RegExp(`${escapeRegExp(owner)}s[’']s`, 'i').test(choice)) {
    return `${quote(choice)} adds an extra s before the apostrophe, making the owner look like ${quote(`${owner}s`)} instead of ${quote(owner)}.`;
  }
  if (/[A-Za-z]s[’']\b/.test(choice)) {
    return `${quote(choice)} puts the apostrophe after an s, which usually marks plural possession; the prompt names one ${owner}, not several owners.`;
  }
  if (/\b\w+s\b/.test(choice) && !/[’']/.test(choice)) {
    return `${quote(choice)} adds an s but no apostrophe to the owner, so it looks plural instead of possessive.`;
  }
  if (/[’']$/.test(choice) || /\w+s[’']\b/.test(choice.split(/\s+/).slice(1).join(' '))) {
    return `${quote(choice)} places possession on the thing being owned instead of on ${owner}, the owner named in the question.`;
  }
  return `${quote(choice)} does not form the singular possessive of ${owner}; the apostrophe + s belongs on the owner before ${owned}.`;
}

function contractionReason(choice, correctChoice, question, isCorrect) {
  const rule = getRule(question);
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the contraction error the prompt asks for; it is missing the apostrophe or puts it in the wrong place.`
      : `${quote(correctChoice)} is the correct contraction because the apostrophe marks the letters left out when the two words are combined.`;
  }
  if (bad) return `${quote(choice)} is correctly written as a contraction, so it is not the incorrect choice.`;
  if (!/[’']/.test(choice)) return `${quote(choice)} is missing the apostrophe that contractions need to show omitted letters.`;
  if ((choice.match(/[’']/g) || []).length > 1) return `${quote(choice)} uses too many apostrophes; a contraction needs one apostrophe in the correct spot.`;
  return `${quote(choice)} puts the apostrophe in the wrong place for this contraction. ${rule}`;
}

function punctuationReason(choice, correctChoice, question, isCorrect) {
  const sourceSet = getSourceSet(question);
  const promptText = question.question || '';
  if (/colon-time/.test(sourceSet) || /\b\d{1,2}[:.,;-]\d{2}\b/.test(`${choice} ${correctChoice} ${question.question || ''}`)) {
    return timePunctuationReason(choice, correctChoice, question, isCorrect);
  }
  if (/\b(abbreviation|acronym)\b/i.test(promptText)) {
    return abbreviationPunctuationReason(choice, correctChoice, question, isCorrect);
  }
  if (/commas-dates/.test(sourceSet)) {
    return dateCommaReason(choice, correctChoice, question, isCorrect);
  }
  if (/advanced-punctuation/.test(sourceSet) || /\b(semicolon|colon|dash|parentheses|hyphen|introductory phrase)\b/i.test(promptText)) {
    return advancedPunctuationReason(choice, correctChoice, question, isCorrect);
  }
  if (/commas-addresses/.test(sourceSet) || /\b(address|street|zip|po box)\b/i.test(promptText)) {
    return addressCommaReason(choice, correctChoice, question, isCorrect);
  }
  if (/commas-series/.test(sourceSet) || /\b(series|list)\b/i.test(promptText)) {
    return seriesCommaReason(choice, correctChoice, question, isCorrect);
  }
  if (/quotation|dialogue/.test(sourceSet) || /\b(quotation|quote|dialogue|speaker tag|spoken words|new speaker)\b/i.test(promptText)) {
    return dialoguePunctuationReason(choice, correctChoice, question, isCorrect);
  }
  if (/periods-abbreviations|abbreviations-acronyms/.test(sourceSet) || /abbreviation|acronym|\ba\.m\.|\bp\.m\./i.test(promptText)) {
    return abbreviationPunctuationReason(choice, correctChoice, question, isCorrect);
  }
  return endPunctuationReason(choice, correctChoice, question, isCorrect);
}

function timePunctuationReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  const hasColon = hasColonTime(choice);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the incorrect time format the prompt asks for because standard time uses a colon between hours and minutes.`
      : `${quote(correctChoice)} is correct because time is written with a colon between the hour and minutes.`;
  }
  if (bad) return `${quote(choice)} uses a colon between the hour and minutes, so it is a correct time format rather than the error.`;
  if (hasTimeWithSeparator(choice, '.')) return `${quote(choice)} uses a period between the hour and minutes; standard time uses a colon, as in ${quote(correctChoice)}`;
  if (hasTimeWithSeparator(choice, ',')) return `${quote(choice)} uses a comma between the hour and minutes; standard time uses a colon, as in ${quote(correctChoice)}`;
  if (hasTimeWithSeparator(choice, '-') || hasTimeWithSeparator(choice, '–')) return `${quote(choice)} uses a hyphen between the hour and minutes; standard time uses a colon, as in ${quote(correctChoice)}`;
  if (!hasColon) return `${quote(choice)} does not use the colon needed to separate hours and minutes in time.`;
  return `${quote(choice)} is a correctly written time, so it does not answer this prompt.`;
}

function abbreviationPunctuationReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  const hasPeriod = /[.]/.test(choice);
  const hasInternalPeriod = /^[A-Za-z]\.[A-Za-z]/.test(choice) || /\.[A-Za-z]\./.test(choice);
  const choiceText = normalizeWhitespace(choice);
  const correctText = normalizeWhitespace(correctChoice);
  const prompt = stripLeadIns(question.question || '');
  const acronymToken = (choiceText.match(/\b[A-Za-z]{2,}\b/) || [''])[0];
  const acronym = /^[A-Z]{2,}$/.test(choiceText) || /\b[A-Z]{2,}\b/.test(choiceText);
  const stateReason = statePairReason(choice);
  const streetReason = streetPairReason(choice);
  const commonReason = commonAbbreviationReason(choice);
  if (isPostalStateQuestion(question)) {
    if (isCorrect) {
      return bad
        ? `${quote(correctChoice)} is the incorrect state abbreviation the prompt asks for. ${statePairReason(correctChoice)}`
        : `${quote(correctChoice)} is correct because postal state abbreviations use two capital letters with no periods.`;
    }
    if (bad) return `${quote(choice)} is not the error because ${stateReason || 'it follows the two-capital-letter postal abbreviation pattern.'}`;
    if (stateReason) return `${quote(choice)} does not match the postal abbreviation for the state named. ${stateReason}`;
    if (/[.]/.test(choiceText)) return `${quote(choice)} uses periods, but postal state abbreviations do not use periods.`;
    if (/\s/.test(choiceText.trim())) return `${quote(choice)} separates the letters, but a postal state abbreviation is written as two letters together.`;
    if (/[a-z]/.test(choiceText)) return `${quote(choice)} uses lowercase or mixed-case letters; postal state abbreviations use two capitals.`;
    return `${quote(choice)} does not follow the two-capital-letter postal abbreviation pattern.`;
  }
  if (isStreetAbbreviationQuestion(question) && streetReason) {
    if (isCorrect) {
      return bad
        ? `${quote(correctChoice)} is the incorrect abbreviation the prompt asks for. ${streetPairReason(correctChoice)}`
        : `${quote(correctChoice)} is correct. ${streetPairReason(correctChoice)}`;
    }
    return bad
      ? `${quote(choice)} is not the error because ${streetReason}`
      : `${quote(choice)} is not the accepted abbreviation for that address word. ${streetReason}`;
  }
  if ((/abbreviation is incorrect|abbreviation is inc orrect|not a correct abbreviation/i.test(prompt)) && commonReason) {
    if (isCorrect) {
      return bad
        ? `${quote(correctChoice)} is the incorrect abbreviation the prompt asks for. ${commonAbbreviationReason(correctChoice)}`
        : `${quote(correctChoice)} is correct. ${commonAbbreviationReason(correctChoice)}`;
    }
    return bad
      ? `${quote(choice)} is not the error because ${commonReason}`
      : `${quote(choice)} is not the accepted abbreviation for that word. ${commonReason}`;
  }
  if (/\ba\.m\.|\bp\.m\.|am\.|pm\./i.test(`${choiceText} ${correctText} ${prompt}`)) {
    if (isCorrect) return bad ? `${quote(correctChoice)} is the incorrect time abbreviation because it does not use the standard lowercase form with two periods.` : `${quote(correctChoice)} uses the standard time abbreviation form.`;
    if (bad) return `${quote(choice)} is an accepted time abbreviation, so it is not the incorrect choice.`;
    return `${quote(choice)} does not use the standard time abbreviation form, such as a.m. or p.m.`;
  }
  if (/D\.C\.|Washington/i.test(`${choiceText} ${correctText} ${prompt}`)) {
    if (isCorrect) return `${quote(correctChoice)} correctly uses periods in D.C. and commas around Washington, D.C., in the sentence.`;
    return `${quote(choice)} leaves out a needed comma or period in Washington, D.C.`;
  }
  if (/acronym/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} is correct because the acronym is written in all capital letters with no periods.`;
    if (/\b(?:[A-Za-z]\.){2,}/.test(choiceText)) return `${quote(choice)} adds periods between acronym letters; this acronym should be written as ${quote(correctText)}.`;
    if (/[a-z]/.test(acronymToken)) return `${quote(choice)} does not capitalize every letter of the acronym.`;
    return `${quote(choice)} is not the standard acronym form asked for in the prompt.`;
  }
  if (/uses an abbreviation/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} correctly writes the title abbreviation with one period after Dr.`;
    if (/\bDr\s+[A-Z]/.test(choiceText)) return `${quote(choice)} leaves out the period after the title abbreviation Dr.`;
    if (/\bD\.r\./.test(choiceText)) return `${quote(choice)} puts a period inside the abbreviation; Dr. needs one period at the end.`;
    if (/\bDr\.\./.test(choiceText)) return `${quote(choice)} uses an extra period after Dr.; the title needs only one.`;
    return `${quote(choice)} does not use the accepted title abbreviation form Dr.`;
  }
  if (isCorrect) {
    if (bad) return `${quote(correctChoice)} is the abbreviation error the prompt asks for. Its periods do not match the standard abbreviation form.`;
    if (acronym) return `${quote(correctChoice)} is correct because this abbreviation is written with capital letters and no extra periods.`;
    return `${quote(correctChoice)} is the standard abbreviation form, with one period in the accepted place.`;
  }
  if (bad) return `${quote(choice)} is a standard abbreviation form, so it is not the incorrect choice.`;
  if (!hasPeriod) return `${quote(choice)} is missing the period that this abbreviation needs.`;
  if (hasInternalPeriod) return `${quote(choice)} breaks the abbreviation with periods inside the letters instead of using the standard form ${quote(correctChoice)}`;
  if (acronym && hasPeriod) return `${quote(choice)} adds periods to an acronym that is normally written without them.`;
  return `${quote(choice)} does not use the standard period placement for this abbreviation.`;
}

function dateCommaReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the date with the comma error the prompt asks for.`
      : `${quote(correctChoice)} places commas where the date format needs them.`;
  }
  if (bad) return `${quote(choice)} uses an acceptable date format, so it is not the incorrect choice.`;
  if (hasCommaBetweenMonthDay(choice)) return `${quote(choice)} puts a comma between the month and day; the comma belongs between the day and year.`;
  if (!hasDayYearComma(choice) && /\b\d{1,2}\s+\d{4}\b/.test(choice)) return `${quote(choice)} leaves out the comma between the day and the year.`;
  if (countCommas(choice) < countCommas(correctChoice)) return `${quote(choice)} is missing a comma needed in the full date.`;
  if (countCommas(choice) > countCommas(correctChoice)) return `${quote(choice)} adds an extra comma that the date format does not need.`;
  return `${quote(choice)} does not place the date commas in the same required positions as ${quote(correctChoice)}`;
}

function addressCommaReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the address with the comma error the prompt asks for.`
      : `${quote(correctChoice)} separates the street, city, and state correctly.`;
  }
  if (bad) return `${quote(choice)} uses acceptable address comma placement, so it is not the incorrect choice.`;
  if (/^\d+,/.test(normalizeWhitespace(choice))) return `${quote(choice)} puts a comma between the street number and street name, which addresses do not do.`;
  if (countCommas(choice) < countCommas(correctChoice)) return `${quote(choice)} leaves out a comma between address parts.`;
  if (countCommas(choice) > countCommas(correctChoice)) return `${quote(choice)} adds a comma where the address should stay together.`;
  return `${quote(choice)} separates the address parts in the wrong places.`;
}

function seriesCommaReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the list with the comma error the prompt asks for.`
      : `${quote(correctChoice)} uses commas to separate the items in the series.`;
  }
  if (bad) return `${quote(choice)} separates the list items correctly, so it is not the incorrect choice.`;
  if (countCommas(choice) < countCommas(correctChoice)) return `${quote(choice)} leaves out a comma needed to separate items in the series.`;
  if (countCommas(choice) > countCommas(correctChoice)) return `${quote(choice)} adds a comma where the sentence does not need one.`;
  return `${quote(choice)} does not place the series commas around the list items correctly.`;
}

function dialoguePunctuationReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the dialogue punctuation error the prompt asks for.`
      : `${quote(correctChoice)} keeps the spoken words inside quotation marks and places the comma or end mark where dialogue needs it.`;
  }
  if (bad) return `${quote(choice)} uses acceptable quotation or dialogue punctuation, so it is not the incorrect choice.`;
  if (!/["'“”‘’]/.test(choice)) return `${quote(choice)} is missing quotation marks around the spoken words or title.`;
  if (/said\s+[A-Z]/.test(choice) && !/,["'”’]?\s+said/i.test(choice)) return `${quote(choice)} does not use the comma needed before the speaker tag.`;
  if (/["'“”‘’][^"'“”‘’]*$/.test(choice) && !/[.!?,]["'”’]/.test(choice)) return `${quote(choice)} leaves the quoted words or their punctuation unfinished.`;
  return `${quote(choice)} puts the quotation marks, capitalization, or dialogue punctuation in the wrong place.`;
}

function advancedPunctuationReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    if (bad) return `${quote(correctChoice)} is the punctuation error the prompt asks for.`;
    if (/parentheses/i.test(prompt)) return `${quote(correctChoice)} puts a matching pair of parentheses around extra information while the main sentence still reads correctly.`;
    if (/introductory phrase/i.test(prompt)) return `${quote(correctChoice)} places the comma after the introductory words and before the main sentence.`;
    if (/hyphen/i.test(prompt)) return `${quote(correctChoice)} uses a hyphen to join words that work together to describe the noun.`;
    if (/dash/i.test(prompt)) return `${quote(correctChoice)} uses the dash to show a pause or added thought without splitting a word group.`;
    if (/new speaker/i.test(prompt)) return `${quote(correctChoice)} starts the new speaker's words as a separate quoted sentence.`;
    if (/semicolon/i.test(prompt)) return `${quote(correctChoice)} correctly uses a semicolon to join two complete, closely related thoughts.`;
    if (/colon/i.test(prompt)) return `${quote(correctChoice)} correctly uses a colon to introduce what follows, such as a list or explanation.`;
    return `${quote(correctChoice)} uses the punctuation mark for the structure described in the prompt.`;
  }
  if (bad) return `${quote(choice)} uses acceptable punctuation for this structure, so it is not the incorrect choice.`;
  if (/parentheses/i.test(prompt)) {
    if ((choice.match(/\(/g) || []).length !== (choice.match(/\)/g) || []).length) return `${quote(choice)} has only one parenthesis mark; parentheses need a matching opening and closing mark.`;
    return `${quote(choice)} places the parenthesis so the extra information is not fully enclosed or the main sentence is broken.`;
  }
  if (/introductory phrase/i.test(prompt)) return `${quote(choice)} puts the comma before the introductory idea is complete, or leaves out the comma before the main sentence.`;
  if (/hyphen/i.test(prompt)) return `${quote(choice)} joins the wrong words with a hyphen or leaves the compound describing word unjoined.`;
  if (/dash/i.test(prompt)) return `${quote(choice)} puts the dash where it splits the sentence awkwardly instead of marking a clear pause or added thought.`;
  if (/new speaker/i.test(prompt)) return `${quote(choice)} mixes the speakers' words or quotation marks instead of starting the new speaker clearly.`;
  if (/semicolon/i.test(prompt)) return `${quote(choice)} does not place the semicolon between two complete, closely related thoughts.`;
  if (/colon/i.test(prompt)) return `${quote(choice)} does not put the colon after a complete setup before the list or explanation.`;
  return `${quote(choice)} uses the punctuation mark in a place that does not fit the sentence structure.`;
}

function endPunctuationReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const bad = asksForBadChoice(question);
  const expected = (correctChoice.match(/[.!?]["'”’)]?$/) || ['end punctuation'])[0].replace(/["'”’)]/g, '');
  if (isCorrect) {
    if (bad) return `${quote(correctChoice)} is the sentence with the end-punctuation error the prompt asks for.`;
    if (expected === '?') return `${quote(correctChoice)} is a direct question, so it needs a question mark.`;
    if (expected === '!') return `${quote(correctChoice)} shows strong feeling or urgency, so it needs an exclamation point.`;
    if (expected === '.') return `${quote(correctChoice)} is a statement, command, or indirect question, so it ends with a period.`;
    return `${quote(correctChoice)} uses the end punctuation that matches the sentence purpose.`;
  }
  if (bad) return `${quote(choice)} has acceptable end punctuation, so it is not the error the prompt asks for.`;
  if (expected === '?' && !hasSentenceEnd(choice, '?')) return `${quote(choice)} is a direct question but does not end with a question mark.`;
  if (expected === '!' && !hasSentenceEnd(choice, '!')) return `${quote(choice)} does not use the exclamation point needed for strong feeling or urgency.`;
  if (expected === '.' && !hasSentenceEnd(choice, '.')) return `${quote(choice)} does not use the period needed for a statement, command, or indirect question.`;
  if (expected === '!' && hasSentenceEnd(choice, '!')) return `${quote(choice)} has an exclamation point, but the sentence is not the urgent or strongly emotional choice asked for.`;
  if (expected === '?' && hasSentenceEnd(choice, '?')) return `${quote(choice)} has a question mark, but it is not the direct-question choice asked for.`;
  return `${quote(choice)} does not match the sentence purpose described in the prompt.`;
}

function capitalizationDiffReason(choice, correctChoice, isCorrect) {
  if (isCorrect) return `${quote(correctChoice)} follows the capitalization rule and keeps ordinary words lowercase.`;
  const choiceWords = wordsWithCase(choice);
  const correctWords = wordsWithCase(correctChoice);
  const notes = [];
  const max = Math.min(choiceWords.length, correctWords.length);
  for (let i = 0; i < max; i += 1) {
    const a = choiceWords[i];
    const b = correctWords[i];
    if (a.lower !== b.lower) continue;
    if (a.word !== b.word) {
      if (/^[A-Z]/.test(b.word) && /^[a-z]/.test(a.word)) notes.push(`${quote(a.word)} should be capitalized as ${quote(b.word)}`);
      else if (/^[a-z]/.test(b.word) && /^[A-Z]/.test(a.word)) notes.push(`${quote(a.word)} should stay lowercase as ${quote(b.word)}`);
    }
    if (notes.length >= 2) break;
  }
  if (notes.length) return `${quote(choice)} is not correct because ${notes.join(' and ')}.`;
  return `${quote(choice)} does not match the capitalization pattern required by the sentence or title.`;
}

function isTransformFragmentPrompt(question) {
  return /what would transform this fragment into a complete sentence/i.test(stripLeadIns(question.question || ''));
}

function isFamilyTitleCapitalizationQuestion(question) {
  const prompt = stripLeadIns(question.question || '');
  return /which words should be capitalized/i.test(prompt) && /\bmother\b/i.test(prompt) && /\bdad[’']s\b/i.test(prompt);
}

function isCapitalizationFirstWordChoicePrompt(question) {
  return /which of the following should have the first word capitalized/i.test(stripLeadIns(question.question || ''));
}

function isCapitalizationAlwaysConceptPrompt(question) {
  const prompt = stripLeadIns(question.question || '');
  return /which of the following (must always|would most likely not|should not) be capitalized/i.test(prompt) ||
    /which types of words are always capitalized/i.test(prompt);
}

function isCapitalizationListPrompt(question) {
  const prompt = stripLeadIns(question.question || '');
  if (!/\b(capitalized|capitalization)\b/i.test(prompt) || !/\bwhich\b/i.test(prompt)) return false;
  if (isCapitalizationFirstWordChoicePrompt(question) || isCapitalizationAlwaysConceptPrompt(question)) return false;
  if (/\bwhich sentence\b/i.test(prompt) || /\bwhich answer is capitalized correctly\b/i.test(prompt) || /\bwhich option is capitalized correctly\b/i.test(prompt)) return false;
  if (/\bwhich (word|words|word or words|wordor words|word\s*\(s\)|underlined word|underlined words|underlined wor\s*d|underlined word or words|pair of words|group of words|list includes all the words|choice) .*capitalized/i.test(prompt)) return true;
  if (/\bwhich words? (in|are|must|should|below)/i.test(prompt) && /\bcapitalized/i.test(prompt)) return true;
  const correctChoice = String((question.choices || [])[question.correct] || '');
  return correctChoice.includes(',') && !/[.!?]["”']?$/.test(correctChoice);
}

function isCapitalizationCoursePrompt(question) {
  return /which course title is correctly capitalized/i.test(stripLeadIns(question.question || ''));
}

function familyTitleCapitalizationReason(choice, correctChoice, question, isCorrect) {
  const normalizedChoice = normalizeWhitespace(choice).replace(/[']/g, '’');
  const selected = new Set(normalizedChoice
    .split(',')
    .map(item => normalizeWhitespace(item).toLowerCase())
    .filter(Boolean));
  const hasMother = selected.has('mother');
  const hasDad = selected.has('dad’s') || selected.has("dad's") || selected.has('dad’s family') || selected.has("dad's family");
  const hasAunt = selected.has('aunt');
  const hasUncle = selected.has('uncle');
  const hasFamily = selected.has('dad’s family') || selected.has("dad's family");
  const splitMother = /\bmo\s+ther\b/i.test(choice);
  if (isCorrect) {
    return `${quote(correctChoice)} is correct because Mother begins the direct quotation and is used as a name in direct address, and Dad’s is used like a name with no word such as my before it. Aunt and uncle stay lowercase because the sentence says my aunt and uncle.`;
  }
  const issues = [];
  if (splitMother) issues.push('mother is split into two pieces; the word should stay together');
  if (!hasMother) issues.push('it leaves out mother, which should be capitalized because it begins the quotation and directly addresses someone');
  if (!hasDad) issues.push('it leaves out dad’s, which should be capitalized because Dad acts like a name here');
  if (hasAunt || hasUncle) issues.push('aunt and uncle should stay lowercase because my comes before them');
  if (hasFamily) issues.push('family is a common noun in dad’s family reunion, so it should stay lowercase');
  if (!issues.length) issues.push('it does not match the family-title capitalization pattern in the sentence');
  return `${quote(choice)} is not the best answer because ${issues.join('; ')}.`;
}

function capitalizationFirstWordChoiceReason(choice, correctChoice, question, isCorrect) {
  const first = (normalizeWhitespace(correctChoice).match(/[A-Za-z][A-Za-z’'-]*/) || [''])[0];
  const capitalized = first ? first[0].toUpperCase() + first.slice(1) : 'the first word';
  if (isCorrect) {
    return `${quote(correctChoice)} is the choice whose first word should be capitalized because it is being used as the start of a sentence. The sentence should begin with ${quote(capitalized)}.`;
  }
  return `${quote(choice)} is not the best answer because this item is not the sentence-start choice the prompt is testing; the correct item needs its first word changed to ${quote(capitalized)}.`;
}

function capitalizationConceptReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const normalized = normalizeCapitalizationTerm(choice);
  const correctNormalized = normalizeCapitalizationTerm(correctChoice);
  if (/should not|most likely not/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} is right because common nouns name general people, places, things, or ideas, so they stay lowercase unless they begin a sentence or are part of a proper name.`;
    if (/proper noun|geographical|holiday|language|nationalit|first word/.test(normalized)) return `${quote(choice)} is usually capitalized, so it is not the "should not be capitalized" choice.`;
    return `${quote(choice)} is not the best answer because it can need a capital in some sentence jobs, while ${quote(correctChoice)} names the ordinary word group that usually stays lowercase.`;
  }
  if (isCorrect) {
    if (/first word of a sentence/.test(correctNormalized)) return `${quote(correctChoice)} is right because every sentence begins with a capital letter.`;
    if (/proper noun|geographical/.test(correctNormalized)) return `${quote(correctChoice)} is right because proper nouns and specific place names name particular people, places, or things.`;
    return `${quote(correctChoice)} names the word group that the capitalization rule asks for.`;
  }
  if (/common noun|season|word after a colon/.test(normalized)) return `${quote(choice)} is not always capitalized; it only gets a capital when it starts a sentence or is part of a proper name.`;
  return `${quote(choice)} is not the best answer because it does not match the always-capitalized group named by the correct choice.`;
}

function capitalizationCourseReason(choice, correctChoice, question, isCorrect) {
  if (isCorrect) return `${quote(correctChoice)} is correct because German names a language, and language names are proper nouns that always need capital letters.`;
  if (/language arts/i.test(choice)) return `${quote(choice)} is not the intended answer here because this item is checking language-name capitalization; German is a language name, while language arts can be a common subject label unless a school uses it as an official course title.`;
  return `${quote(choice)} names a school subject that is not a language name in this item, so it does not show the specific capitalization rule the question is testing.`;
}

function fragmentRepairReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const fragment = normalizeWhitespace(prompt.split('?').slice(1).join('?')).replace(/[.?!]$/, '');
  const fragmentText = fragment || 'the words in the prompt';
  const completeText = normalizeWhitespace(`${correctChoice.match(/“([^”]+)”/)?.[1] || 'There are'} ${fragmentText.charAt(0).toLowerCase()}${fragmentText.slice(1)}.`);
  if (isCorrect) {
    return `${quote(correctChoice)} works because ${quote(fragmentText)} is only a noun phrase: it names the topic but has no main verb. Adding ${quote('There are')} supplies a subject placeholder and the verb ${quote('are')}, turning it into the complete sentence ${quote(completeText)}`;
  }
  if (/question mark/i.test(choice)) {
    return `${quote(choice)} does not fix the fragment because changing the end mark only changes punctuation; it still does not add the missing main verb.`;
  }
  if (/attend class|generators|hydroelectric|solar/i.test(choice)) {
    return `${quote(choice)} adds examples, but the sentence still needs a linking verb such as ${quote('are')} to connect ${quote(fragmentText.split(/\s+/).slice(0, 2).join(' ') || 'the subject')} to that list.`;
  }
  if (/nothing/i.test(choice)) {
    return `${quote(choice)} is not correct because ${quote(fragmentText)} is not complete already; it lacks a main verb that tells what the subject does or is.`;
  }
  return `${quote(choice)} does not add the missing main verb needed to turn the fragment into a complete sentence.`;
}

function capitalizationListReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  const selected = splitCapitalizationTerms(choice);
  const correct = splitCapitalizationTerms(correctChoice);
  const selectedSet = new Set(selected.map(normalizeCapitalizationTerm));
  const correctSet = new Set(correct.map(normalizeCapitalizationTerm));
  const missing = correct.filter(term => !selectedSet.has(normalizeCapitalizationTerm(term)));
  const extra = selected.filter(term => !correctSet.has(normalizeCapitalizationTerm(term)));
  if (isCorrect) {
    const notes = correct.slice(0, 4).map(term => `${term}: ${capitalizationTermReason(term, question)}`);
    const intro = bad
      ? (correct.length === 1
        ? `${quote(correctChoice)} is the word with the capitalization error in the sentence.`
        : `${quote(correctChoice)} names the words with capitalization errors in the sentence.`)
      : (correct.length === 1
        ? `${quote(correctChoice)} is the word that needs a capital in the sentence.`
        : `${quote(correctChoice)} names the words that need capitals in the sentence.`);
    return `${intro} ${notes.join(' ')}`;
  }
  const notes = [];
  missing.slice(0, 3).forEach(term => {
    notes.push(`it leaves out ${term}, which ${capitalizationTermReason(term, question)}`);
  });
  extra.slice(0, 3).forEach(term => {
    notes.push(`it includes ${term}, but ${lowercaseTermReason(term, question)}`);
  });
  if (!notes.length) notes.push('it does not match the capitalization jobs in the sentence');
  return `${quote(choice)} is not the best answer because ${notes.join('; ')}.`;
}

function splitCapitalizationTerms(value) {
  return normalizeWhitespace(value)
    .split(',')
    .map(item => normalizeWhitespace(item))
    .filter(Boolean);
}

function normalizeCapitalizationTerm(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');
}

function capitalizationTermReason(term, question) {
  const normalized = normalizeCapitalizationTerm(term);
  const prompt = stripLeadIns(question.question || '');
  if (/^(my|the|as|before|after|buy|be|do)$/.test(normalized)) {
    if (/“[^”]*\b/.test(prompt) && /^(before|after|buy|do)$/.test(normalized)) return 'starts a direct quotation, so it needs a capital letter.';
    if (/^(buy|do)$/.test(normalized)) return 'starts quoted speech, so it needs a capital letter.';
    return 'starts a sentence or passage, so it needs a capital letter.';
  }
  if (/^(mother|dad's|dad’s)$/.test(normalized)) {
    return 'is a family title used like a name or in direct address, so it needs a capital letter.';
  }
  if (/^(aunt|uncle|grandma|grandpa)\s+[a-z]/.test(normalized) || /^(senator|uncle|aunt|grandma|grandpa)\b/.test(normalized)) {
    return 'is part of a title or family title used with a name, so the title/name expression needs capitals.';
  }
  if (/^(marshall|jessie|annie|sam|jeff|frank|kennedy|liza|bobby|ruth|john)$/.test(normalized)) {
    return 'is a person’s name, so it needs a capital letter.';
  }
  if (/^(africa|kenyans|swahili|sweden|swedish|latino|indiana|massachusetts|mississippi|tuesday|christmas|memorial|day|hanoi|vietnam|english|vietnamese|french|german|spanish)$/.test(normalized)) {
    return 'is a proper place, nationality, language, day, month, or holiday word, so it needs a capital letter.';
  }
  if (/^(river|monument|middle|school|building|state|canyon|grand|potomac|washington|seattle|king|columbia|broadway|bridge|portland|oregon|new|testament|bible|christianity's|christianity’s|buick|chevrolet|ford|toyota|call|wild|d\.c\.)$/.test(normalized)) {
    return 'is part of a specific proper name or title, so it needs a capital letter.';
  }
  return 'is being used as part of a proper name, title, sentence beginning, or quoted sentence beginning.';
}

function lowercaseTermReason(term, question) {
  const normalized = normalizeCapitalizationTerm(term);
  const prompt = stripLeadIns(question.question || '');
  if (/^(aunt|uncle|mother|dad|cousins|grandparents)$/.test(normalized) && /\bmy\b/i.test(prompt)) {
    return `${term} follows a possessive word such as my, so it stays lowercase.`;
  }
  if (/^(family|reunion|plumber|shower|street|boy|newspaper|nose|rock|mouth|water|warm|crossed|continent|speak|located|sits|attends|holiday|documents|teacher|secretary of transportation|vehicle|car|school|high school|club|classes|art|math|grandparents|country|animals|horses)$/.test(normalized)) {
    return `${term} is a common noun, describing word, or ordinary sentence word here, so it stays lowercase.`;
  }
  return `${term} is not one of the words that needs a capital in this sentence.`;
}

function wordsWithCase(value) {
  return normalizeWhitespace(value)
    .match(/[A-Za-z][A-Za-z.'-]*/g)?.map(raw => {
      const word = raw.replace(/[.?!,:;]+$/g, '');
      return { word, lower: word.toLowerCase() };
    }) || [];
}

function spellingReason(choice, correctChoice, isCorrect) {
  if (isCorrect) return `${quote(correctChoice)} is the standard spelling; every needed letter is in the right order.`;
  return `${quote(choice)} changes, adds, or leaves out letters from the standard spelling ${quote(correctChoice)}`;
}

function readingReason(choice, correctChoice, question, isCorrect) {
  const sourceSet = getSourceSet(question);
  const bad = asksForBadChoice(question);
  if (/analogies/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} completes the same relationship shown in the first pair of the analogy.`;
    return `${quote(choice)} does not keep the same relationship as the first pair in the analogy.`;
  }
  if (/categorizing/.test(sourceSet)) {
    if (isCorrect) return bad ? `${quote(correctChoice)} is the item that does not belong with the others.` : `${quote(correctChoice)} belongs in the category named or implied by the prompt.`;
    return bad ? `${quote(choice)} fits the same category as the other items, so it is not the odd one out.` : `${quote(choice)} does not fit the category as well as the correct answer.`;
  }
  if (/cause-effect/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches the cause-or-effect relationship asked for in the prompt.`;
    return `${quote(choice)} names the wrong side of the cause-and-effect relationship or adds an event the sentence does not show.`;
  }
  if (/fact-fantasy/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches whether the prompt asks for something real and provable or something imaginary.`;
    return `${quote(choice)} belongs to the other group: fact if the prompt asks for fantasy, or fantasy if the prompt asks for fact.`;
  }
  if (/fact-opinion/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} can be checked or proved, so it works as a fact rather than a personal judgment.`;
    return `${quote(choice)} includes a judgment, preference, or opinion that cannot be proved true for everyone.`;
  }
  if (/inference/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} is the inference best supported by the clues in the text.`;
    return `${quote(choice)} is not the best inference because the text clues do not point to that idea.`;
  }
  if (/main-idea-supporting-details/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} states the central idea that the details support.`;
    return `${quote(choice)} is too narrow, unrelated, or only a detail instead of the main idea.`;
  }
  if (/summarizing/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} gives the topic and the most important ideas without extra minor details.`;
    return `${quote(choice)} is too narrow, adds an opinion, or leaves out the main point of the passage.`;
  }
  if (/text-evidence/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} directly supports the idea named in the question.`;
    return `${quote(choice)} does not give the clearest proof for the idea the question asks about.`;
  }
  if (/story-elements/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches the character, setting, problem, or event clues in the story.`;
    return `${quote(choice)} does not match the story clues about the character, setting, problem, or events.`;
  }
  if (/theme-lesson-moral/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} states a lesson that fits the whole story, not just one small detail.`;
    return `${quote(choice)} is too narrow, unsupported, or not the lesson the story teaches.`;
  }
  if (/authors-purpose/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches what the author is mainly trying to do for the reader.`;
    return `${quote(choice)} gives a different purpose from the one shown by the passage.`;
  }
  if (/text-structure/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches how the information is organized in the passage.`;
    return `${quote(choice)} names a different text structure than the one used in the passage.`;
  }
  if (/compare-contrast/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches whether the prompt is showing how things are alike or different.`;
    return `${quote(choice)} confuses a similarity with a difference, or names a relationship the prompt does not show.`;
  }
  if (/poetry-skills/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} names the poetry feature described in the prompt.`;
    return `${quote(choice)} names something other than the poetry feature being asked about.`;
  }
  if (/book-genres/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} fits the genre clues in the prompt.`;
    return `${quote(choice)} is a different genre and does not match the clues given.`;
  }
  if (/point-of-view-literature/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} uses the point of view named in the prompt.`;
    return `${quote(choice)} uses a different point of view from the one the question asks for.`;
  }
  if (/tone-mood/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} matches the feeling or attitude created by the word choice.`;
    return `${quote(choice)} creates a different tone or mood from the one asked for.`;
  }
  if (/test-taking-reading-skills/.test(sourceSet)) {
    if (isCorrect) return `${quote(correctChoice)} is a strong reading-test strategy because it uses the text as evidence.`;
    return `${quote(choice)} is a weak test strategy because it ignores evidence or relies on a shortcut.`;
  }
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the choice the prompt asks for because it is the one that does not fit the category, evidence, or reading task.`
      : `${quote(correctChoice)} matches the strongest evidence in the passage or prompt, not just a related word.`;
  }
  return bad
    ? `${quote(choice)} actually fits the category, evidence, or reading task, so it is not the choice the prompt asks you to find.`
    : `${quote(choice)} does not follow the evidence in the passage or prompt; it focuses on the wrong detail or adds an idea the text does not prove.`;
}

function sentenceStructureReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const choiceText = normalizeWhitespace(choice);
  const asksCommand = /\b(command|imperative)\b/i.test(prompt);
  const asksQuestion = /\b(question|interrogative)\b/i.test(prompt);
  const asksExclamation = /\b(exclamation|exclamatory|strong feeling)\b/i.test(prompt);
  const asksStatement = /\b(statement|declarative)\b/i.test(prompt);
  if (isCorrect) {
    if (asksCommand) return `${quote(correctChoice)} gives a direction or request, so it is a command sentence.`;
    if (asksQuestion) return `${quote(correctChoice)} asks something directly, so it is a question.`;
    if (asksExclamation) return `${quote(correctChoice)} shows strong feeling, so it is an exclamation.`;
    if (asksStatement) return `${quote(correctChoice)} tells information, so it is a statement.`;
    if (/\bfragment\b/i.test(prompt)) return `${quote(correctChoice)} is the incomplete thought the prompt asks you to identify.`;
    if (/\brun[- ]on\b/i.test(prompt)) return `${quote(correctChoice)} is the run-on sentence because complete thoughts are joined without correct punctuation or a joining word.`;
    if (/\bcomplex\b/i.test(prompt)) return `${quote(correctChoice)} has an independent clause plus a dependent clause, which makes it complex.`;
    if (/\bcompound\b/i.test(prompt)) return `${quote(correctChoice)} joins two complete thoughts correctly, which makes it compound.`;
    return `${quote(correctChoice)} has the complete, correctly connected sentence structure the prompt asks for.`;
  }
  if (asksCommand) return `${quote(choice)} does not give a direct direction or request, so it is not the command sentence.`;
  if (asksQuestion) return `${quote(choice)} does not ask something directly, so it is not the question sentence.`;
  if (asksExclamation) return `${quote(choice)} does not show the strong feeling needed for an exclamation.`;
  if (asksStatement) return `${quote(choice)} is not the statement because it asks, commands, or shows strong feeling instead of simply telling information.`;
  if (/\bfragment\b/i.test(prompt)) return `${quote(choice)} is a complete sentence or a different error, so it is not the fragment asked for.`;
  if (/\brun[- ]on\b/i.test(prompt)) return `${quote(choice)} is not the run-on pattern the prompt asks about.`;
  if (/\bcomplex\b/i.test(prompt)) return `${quote(choice)} does not include both an independent clause and a dependent clause in the way a complex sentence does.`;
  if (/\bcompound\b/i.test(prompt)) return `${quote(choice)} does not correctly join two complete thoughts.`;
  if (!/[.!?]["'”’)]?$/.test(choiceText)) return `${quote(choice)} does not express a complete sentence with proper ending punctuation.`;
  return `${quote(choice)} has a different sentence structure from the one requested in the prompt.`;
}

function subjectPredicateReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const asksSimpleSubject = /\bsimple subject\b/i.test(prompt);
  const asksCompleteSubject = /\bcomplete subject\b|\bsubject and predicate divided\b|\bsubject and predicate separated\b/i.test(prompt);
  const asksSimplePredicate = /\bsimple predicate\b/i.test(prompt);
  const asksCompletePredicate = /\bcomplete predicate\b/i.test(prompt);
  if (isCorrect) {
    if (asksSimpleSubject) return `${quote(correctChoice)} names the main noun or pronoun the sentence is about, without extra describing words.`;
    if (asksCompleteSubject) return `${quote(correctChoice)} includes the whole subject part: the subject plus its describing words.`;
    if (asksSimplePredicate) return `${quote(correctChoice)} names the main verb or verb phrase that tells what the subject does or is.`;
    if (asksCompletePredicate) return `${quote(correctChoice)} includes the whole predicate part: the verb plus the words that complete the idea.`;
    return `${quote(correctChoice)} identifies the subject or predicate part asked for in the sentence.`;
  }
  if (asksSimpleSubject) return `${quote(choice)} is not just the main subject word; it is extra description, the predicate, or another sentence part.`;
  if (asksCompleteSubject) return `${quote(choice)} does not include the full subject part before the predicate begins.`;
  if (asksSimplePredicate) return `${quote(choice)} is not the main verb or verb phrase doing the predicate job.`;
  if (asksCompletePredicate) return `${quote(choice)} does not include the full predicate part that tells what happens or is true.`;
  return `${quote(choice)} points to a different sentence part from the subject or predicate part requested.`;
}

function prepositionReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  if (isCorrect) {
    if (/\bprepositional phrase\b/i.test(prompt)) return `${quote(correctChoice)} begins with a preposition and includes its object, so it works as a prepositional phrase.`;
    if (/\bwhat does\b[\s\S]{0,80}\bshow\b/i.test(prompt)) return `${quote(correctChoice)} names the relationship shown by the prepositional phrase in the sentence.`;
    return `${quote(correctChoice)} is the preposition because it shows a relationship such as place, time, direction, or connection.`;
  }
  if (/\bprepositional phrase\b/i.test(prompt)) return `${quote(choice)} is not a prepositional phrase because it does not begin with a preposition followed by its object.`;
  if (/\bwhat does\b[\s\S]{0,80}\bshow\b/i.test(prompt)) return `${quote(choice)} names a different relationship from the one the prepositional phrase shows.`;
  return `${quote(choice)} is a noun, verb, adjective, or other word here, not the preposition showing the relationship.`;
}

function partsOfSpeechReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  if (/\bpreposition|prepositional phrase\b/i.test(prompt)) {
    return prepositionReason(choice, correctChoice, question, isCorrect);
  }
  if (/\bappositive\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} renames or explains a noun beside it and is set off correctly.`;
    return `${quote(choice)} does not place the appositive next to the noun it explains, or it uses commas in the wrong places.`;
  }
  if (/\bdependent clause\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} has a subject and verb but begins with a word that makes it unable to stand alone.`;
    return `${quote(choice)} is complete on its own or is only a phrase, so it is not the dependent clause asked for.`;
  }
  if (/\badjective\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} describes or limits a noun by telling which one, what kind, or how many.`;
    return `${quote(choice)} does a different job in the sentence instead of describing a noun as an adjective.`;
  }
  if (/\badverb\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} describes a verb, adjective, or other adverb, often telling how, when, where, or how much.`;
    return `${quote(choice)} does not do the adverb job asked for in this sentence.`;
  }
  if (/\bnoun\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} names the person, place, thing, or idea asked for in the prompt.`;
    return `${quote(choice)} is not the noun type or noun job the prompt asks for.`;
  }
  if (/\bconjunction\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} joins words or groups of words, so it is the conjunction.`;
    return `${quote(choice)} does not join the sentence parts in the way a conjunction does.`;
  }
  if (isCorrect) return `${quote(correctChoice)} names the word or phrase doing the grammar job asked about in the sentence.`;
  return `${quote(choice)} points to a word or phrase with a different job from the one the question asks for.`;
}

function writingReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  if (/telephone message/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} works for a telephone message because it includes the useful message details clearly.`;
    return `${quote(choice)} leaves out an important message detail or sounds unlike a useful telephone message.`;
  }
  if (/clear situation/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} starts a story by giving a character, place, and event that creates a clear situation.`;
    return `${quote(choice)} is only a fact or loose detail; it does not set up who is involved, where they are, and what is happening.`;
  }
  if (/sensory description/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} adds sensory detail because readers can imagine what is smelled, heard, seen, tasted, or felt.`;
    return `${quote(choice)} is too general and does not help the reader experience the scene through the senses.`;
  }
  if (/dialogue correctly|dialogue/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} writes the spoken words inside quotation marks and uses the comma before the speaker tag.`;
    return `${quote(choice)} leaves out quotation marks, the comma, or the correct placement needed for dialogue.`;
  }
  if (/first-person point of view/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} uses a narrator inside the story with first-person pronouns such as I or my.`;
    return `${quote(choice)} uses third-person wording or a command, not first-person point of view.`;
  }
  if (/third-person limited/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} stays outside the character but shows one character's thoughts or feelings.`;
    return `${quote(choice)} is first person, a command, or tells more than one character's private thoughts.`;
  }
  if (/formal tone|formal language|uses a formal tone/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} uses respectful, school-appropriate wording instead of casual slang.`;
    return `${quote(choice)} sounds too casual, slangy, or conversational for a formal tone.`;
  }
  if (/informal tone|informal language/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} uses relaxed, conversational wording that fits an informal situation.`;
    return `${quote(choice)} sounds more formal or does not match the casual situation in the prompt.`;
  }
  if (/worried tone|gloomy mood|tone|mood/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} creates the feeling asked for through specific word choice and detail.`;
    return `${quote(choice)} creates a different feeling from the tone or mood named in the prompt.`;
  }
  if (/more precise|precise revision|makes the sentence more precise/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} replaces vague wording with specific action or detail.`;
    return `${quote(choice)} stays vague or unclear, so it does not improve the sentence precisely.`;
  }
  if (/combines ideas smoothly|combine/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} connects the two ideas smoothly without making a run-on or word jumble.`;
    return `${quote(choice)} creates a run-on, fragment, or confusing word order instead of a smooth combination.`;
  }
  if (/verb tense consistent|progressive tense|correct verb/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} keeps the verb form matched to the time clue and the rest of the sentence.`;
    return `${quote(choice)} uses the wrong verb form or shifts tense away from what the sentence needs.`;
  }
  if (/topic sentence/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} states the main idea that the whole paragraph can develop.`;
    return `${quote(choice)} is too narrow, unrelated, or only a detail, so it does not work as the topic sentence.`;
  }
  if (/support(s|ing)? the (topic sentence|claim)|reason best supports|evidence would best support/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} gives a relevant reason, detail, or evidence that supports the claim or topic.`;
    return `${quote(choice)} is unrelated, too weak, or only a surface detail, so it does not support the claim well.`;
  }
  if (/closing sentence/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} wraps up the paragraph by returning to the main idea.`;
    return `${quote(choice)} is unrelated or too small to close the paragraph effectively.`;
  }
  if (/does NOT belong|does not belong/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} is off topic, so it is the sentence that does not belong with the paragraph.`;
    return `${quote(choice)} fits the paragraph topic, so it is not the sentence to remove.`;
  }
  if (/informative introduction/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} introduces the topic with factual information instead of opinion or persuasion.`;
    return `${quote(choice)} is an opinion, a request, or an unrelated detail, so it does not fit an informative introduction.`;
  }
  if (/factual enough|informative report/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} gives checkable information that belongs in an informative report.`;
    return `${quote(choice)} is opinion, persuasion, or unrelated, so it is not factual enough for the report.`;
  }
  if (/organize an explanatory paragraph|transition/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} helps organize ideas so the reader can follow the explanation or opinion.`;
    return `${quote(choice)} does not clearly connect or organize the ideas for this kind of writing.`;
  }
  if (/claim/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} takes a position that can be supported with reasons or evidence.`;
    return `${quote(choice)} is a fact, feature, or broad topic rather than a claim that argues a position.`;
  }
  if (/source is best|finding synonyms|finding the meaning/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} is the source that matches the information the writer needs.`;
    return `${quote(choice)} is a different kind of source and would not give the specific information asked for.`;
  }
  if (isCorrect) return `${quote(correctChoice)} fits the exact writing job in the prompt with clear, focused wording.`;
  return `${quote(choice)} misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part.`;
}

function grammarReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const skillText = getSkillText(question);
  const bad = asksForBadChoice(question);
  if (/\b(prefix|suffix|root|base word|means)\b/i.test(prompt)) {
    return vocabularyReason(choice, correctChoice, question, isCorrect);
  }
  if (/article/.test(skillText)) return articleReason(choice, correctChoice, question, isCorrect);
  if (/double-negative|double negatives/.test(skillText)) {
    if (isCorrect) return bad ? `${quote(correctChoice)} is the sentence the prompt asks for because it contains more than one negative idea.` : `${quote(correctChoice)} uses only one negative idea, which is the Standard English form.`;
    return bad ? `${quote(choice)} does not contain the double-negative error the prompt asks you to find.` : `${quote(choice)} uses two negative ideas together or otherwise breaks the Standard English negative pattern.`;
  }
  if (/pronoun/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} uses the pronoun case and agreement needed by its job in the sentence.`;
    return `${quote(choice)} uses a pronoun form that does not match the noun, number, or sentence job required here.`;
  }
  if (/plural|singular|irregular nouns/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the singular/plural noun rule the prompt is testing.`;
    return bad ? `${quote(choice)} is a correct noun form, so it is not the incorrect or non-plural choice the prompt asks for.` : `${quote(choice)} does not use the correct singular or plural noun form for this sentence.`;
  }
  if (/verb|tense|agreement/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the verb form, tense, and subject needed by the sentence.`;
    return bad ? `${quote(choice)} keeps the verb pattern acceptable, so it is not the verb error the prompt asks you to find.` : `${quote(choice)} does not match the tense, helping verb, or subject-verb pattern required here.`;
  }
  if (/sentence-correction|correction/.test(skillText) || /^choose the best correction/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} fixes the sentence while keeping the intended meaning clear.`;
    return `${quote(choice)} still leaves a grammar, capitalization, punctuation, spelling, or meaning problem in the sentence.`;
  }
  if (/sentence[ -]types|identify-sentence|sentence-combinations|run-on|clause|compound|complex/.test(skillText)) {
    return sentenceStructureReason(choice, correctChoice, question, isCorrect);
  }
  if (/telephone message/i.test(prompt)) return writingReason(choice, correctChoice, question, isCorrect);
  if (/friendly-letter/.test(skillText) && !/telephone message/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} matches the friendly-letter part or convention asked for in the prompt.`;
    return `${quote(choice)} belongs to a different letter part or does not follow the friendly-letter convention being tested.`;
  }
  if (/indentation-rules/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the paragraph indentation rule: indent the first line of a new paragraph.`;
    return `${quote(choice)} indents the wrong line or uses indentation where a paragraph does not need it.`;
  }
  if (/point-of-view/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} uses the pronouns or narrator position for the point of view named in the question.`;
    return `${quote(choice)} uses a different point of view from the one the question asks for.`;
  }
  if (/subject-predicate/.test(skillText)) {
    return subjectPredicateReason(choice, correctChoice, question, isCorrect);
  }
  if (/preposition/.test(skillText)) {
    return prepositionReason(choice, correctChoice, question, isCorrect);
  }
  if (/parts-of-speech|noun|adjective|adverb|preposition|conjunction|subject-predicate|appositive/.test(skillText)) {
    return partsOfSpeechReason(choice, correctChoice, question, isCorrect);
  }
  if (/which claim is clear for an opinion paragraph\?/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} takes a position and states what someone should think or do, so it is an opinion that can be supported with reasons.`;
    return `${quote(choice)} is a fact, a broad topic, or a statement that does not take a position, so it is not an opinion claim to support with reasons.`;
  }
  if (/\b(narrative|sensory description|dialogue correctly|first-person|third-person|formal tone|informal tone|topic sentence|supporting detail|closing sentence|revision|precise|claim|evidence|informative introduction|explanatory paragraph|telephone message)\b/i.test(prompt)) {
    return writingReason(choice, correctChoice, question, isCorrect);
  }
  if (/formal|informal|paragraph|opinion|persuasive|informative|narrative|revising|editing|writing/.test(skillText)) {
    return writingReason(choice, correctChoice, question, isCorrect);
  }
  if (bad && isCorrect) return `${quote(correctChoice)} is the choice with the error or mismatch the prompt asks you to find.`;
  if (bad) return `${quote(choice)} follows the rule well enough, so it is not the error or mismatch the prompt asks for.`;
  if (isCorrect) return `${quote(correctChoice)} matches the grammar clue in the question and follows the rule for this sentence.`;
  return `${quote(choice)} does not match the grammar clue in ${quote(trimLong(prompt, 120))}; compare its form with the rule used by the correct answer.`;
}

function vocabularyReason(choice, correctChoice, question, isCorrect) {
  const skillText = getSkillText(question);
  const bad = asksForBadChoice(question);
  if (/homophone/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} has the meaning needed in the sentence; homophones can sound alike, so the context decides the word.`;
    return `${quote(choice)} may sound similar, but its meaning does not fit the sentence context.`;
  }
  if (/rhym/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} has the same ending sound as the target word, so it rhymes.`;
    return `${quote(choice)} does not share the same ending sound as the target word.`;
  }
  if (/synonym|antonym|shades/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the meaning relationship the prompt asks for.`;
    return `${quote(choice)} has a different meaning or strength, so it does not match the requested synonym, antonym, or shade of meaning.`;
  }
  if (/context|multiple-meaning/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} fits the context clues in the sentence, so it gives the intended meaning.`;
    return `${quote(choice)} does not fit the context clues around the word.`;
  }
  if (/spelling/.test(skillText)) return spellingReason(choice, correctChoice, isCorrect);
  if (/syllable/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the number of beats you hear when the word is divided into syllables.`;
    return `${quote(choice)} gives the wrong number of syllable beats for the word.`;
  }
  if (/prefix|suffix|base|root/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} correctly separates the meaningful word parts asked for in the prompt.`;
    return `${quote(choice)} splits the word parts incorrectly or gives a meaning that does not match the root, prefix, or suffix.`;
  }
  if (bad && isCorrect) return `${quote(correctChoice)} is the word or category that does not fit, which is exactly what the prompt asks for.`;
  if (bad) return `${quote(choice)} fits the word pattern or category, so it is not the odd one out.`;
  if (isCorrect) return `${quote(correctChoice)} matches the word meaning, spelling pattern, or word relationship asked for in the prompt.`;
  return `${quote(choice)} does not match the meaning, spelling pattern, or word relationship needed here.`;
}

function referenceReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the item that does not fit the reference-skill task in the prompt.`
      : `${quote(correctChoice)} names the reference feature or study skill that the prompt describes.`;
  }
  return bad
    ? `${quote(choice)} fits the reference-skill task, so it is not the exception the prompt asks for.`
    : `${quote(choice)} names a different reference feature or study skill than the one described in the prompt.`;
}

function domainReason(choice, correctChoice, question, domain, isCorrect) {
  const skillText = getSkillText(question);
  const prompt = stripLeadIns(question.question || '');
  if (domain === 'punctuation' &&
    /\b(narrative|sensory|claim|topic sentence|supporting detail|closing sentence|revision|formal tone|formal language|informal language)\b/i.test(prompt) &&
    !/\b(punctuat|quote|quotation|dialogue|comma|semicolon|colon|apostrophe|abbreviation|end punctuation)\b/i.test(prompt)) {
    return writingReason(choice, correctChoice, question, isCorrect);
  }
  if (/\bcombined into one sentence\b/i.test(prompt)) {
    return writingReason(choice, correctChoice, question, isCorrect);
  }
  if (isTransformFragmentPrompt(question)) {
    return fragmentRepairReason(choice, correctChoice, question, isCorrect);
  }
  if (/\bcapitalized correctly\b/i.test(prompt)) {
    return capitalizationDiffReason(choice, correctChoice, isCorrect);
  }
  if (isFamilyTitleCapitalizationQuestion(question)) {
    return familyTitleCapitalizationReason(choice, correctChoice, question, isCorrect);
  }
  if (isCapitalizationFirstWordChoicePrompt(question)) {
    return capitalizationFirstWordChoiceReason(choice, correctChoice, question, isCorrect);
  }
  if (isCapitalizationAlwaysConceptPrompt(question)) {
    return capitalizationConceptReason(choice, correctChoice, question, isCorrect);
  }
  if (isCapitalizationCoursePrompt(question)) {
    return capitalizationCourseReason(choice, correctChoice, question, isCorrect);
  }
  if (isCapitalizationListPrompt(question)) {
    return capitalizationListReason(choice, correctChoice, question, isCorrect);
  }
  if (/Correct as is/i.test(String(correctChoice || ''))) {
    if (isCorrect) return `${quote(correctChoice)} is right because the original underlined wording already follows the rule being checked.`;
    return `${quote(choice)} changes the original wording in a way that adds a capitalization, abbreviation, punctuation, or usage problem.`;
  }
  if (/\bcorrect missing word\b/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} is the pronoun that agrees with Mrs. Porter and works as the subject of the sentence.`;
    return `${quote(choice)} does not agree with Mrs. Porter or does not fit as the subject pronoun in this sentence.`;
  }
  if (/contraction/.test(skillText)) return contractionReason(choice, correctChoice, question, isCorrect);
  if (/apostrophe|possessive/.test(skillText)) return possessiveReason(choice, correctChoice, question, isCorrect);
  if (/punctuation|comma|period|quotation|colon|semicolon|abbreviation/.test(skillText) || domain === 'punctuation') {
    return punctuationReason(choice, correctChoice, question, isCorrect);
  }
  if (/capital/.test(skillText) || domain === 'capitalization') return capitalizationDiffReason(choice, correctChoice, isCorrect);
  if (domain === 'reading-comprehension') return readingReason(choice, correctChoice, question, isCorrect);
  if (domain === 'vocabulary') return vocabularyReason(choice, correctChoice, question, isCorrect);
  if (domain === 'reference-skills') return referenceReason(choice, correctChoice, question, isCorrect);
  return grammarReason(choice, correctChoice, question, isCorrect);
}

function buildCorrectExplanation(question, domain) {
  const correctChoice = question.choices[question.correct];
  const rule = getRule(question);
  const reason = domainReason(correctChoice, correctChoice, question, domain, true);
  return `${labelChoice('Answer', correctChoice)} Rule or clue: ${ensurePeriod(rule)} ${ensurePeriod(reason)}`;
}

function buildWrongExplanation(question, domain, index) {
  if (index === question.correct) return '';
  const choice = question.choices[index];
  const correctChoice = question.choices[question.correct];
  const generated = domainReason(choice, correctChoice, question, domain, false);
  return `${labelChoice('Not', choice)} ${ensurePeriod(generated)}`;
}

function rewriteQuestion(question, domain) {
  if (!question || !Array.isArray(question.choices)) return false;
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.choices.length) return false;
  const before = JSON.stringify({
    explanation: question.explanation || {},
    studyAid: question.studyAid || {}
  });
  question.studyAid = buildStudyAid(question);
  const explanation = {
    correct: buildCorrectExplanation(question, domain),
    incorrect: question.choices.map((_, index) => buildWrongExplanation(question, domain, index))
  };
  question.explanation = explanation;
  const after = JSON.stringify({
    explanation,
    studyAid: question.studyAid || {}
  });
  if (before === after) return false;
  question.version = Number.isInteger(Number(question.version)) ? Number(question.version) + 1 : 2;
  question.contentHash = computeContentHash(question);
  return true;
}

function rewriteSources(options = {}) {
  const records = options.records || loadJsonSources(options);
  const write = options.write === true;
  const summary = {
    filesChecked: records.length,
    filesChanged: 0,
    questionsChanged: 0,
    totalQuestions: 0,
    changedFiles: []
  };

  records.forEach(record => {
    const before = serializeJsonSource(record.source);
    const domain = record.domain || record.source.domain || path.basename(record.file, '.json');
    Object.values(record.source.sets || {}).forEach(set => {
      (set.questions || []).forEach(question => {
        summary.totalQuestions += 1;
        if (rewriteQuestion(question, domain)) summary.questionsChanged += 1;
      });
    });
    const after = serializeJsonSource(record.source);
    if (before !== after) {
      summary.filesChanged += 1;
      summary.changedFiles.push(record.relativeFile || record.file);
      if (write) writeJsonSource(record);
    }
  });

  return summary;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const summary = rewriteSources({ write });
  const action = write ? 'Updated' : 'Would update';
  console.log(`Reviewed ${summary.totalQuestions} questions across ${summary.filesChecked} source file(s).`);
  console.log(`${action} explanations for ${summary.questionsChanged} question(s) in ${summary.filesChanged} file(s).`);
  if (!write && summary.questionsChanged > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  rewriteQuestion,
  rewriteSources
};
