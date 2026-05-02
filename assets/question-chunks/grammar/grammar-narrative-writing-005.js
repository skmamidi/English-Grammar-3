/**
 * English Language Quiz App - grammar subchunk: grammar-narrative-writing 5
 * Generated from assets/question-bank-source/grammar.json.
 * Generator version: 1.
 * Source hash: sha256:7143f3421715ce3771a2ca0f17c2d040d89a76b1d5ae00e31e6b3559e358a92e.
 */
(function () {
  'use strict';
  const chunkSet = {"title":"Narrative Writing","topic":"Grammar & Usage","questions":[{"id":"grammar-narrative-writing-q0201","version":4,"contentHash":"sha256:dda9cbb4a90c1323e5cc55630343d598185ceec2bbe23f54988044279230573a","question":"May 4, 2019 – We took a quiz a bout characte rs in mytho logy today. Which type of writing is this?","choices":["let ter","story","journ al","poem"],"correct":2,"explanation":{"correct":"Answer: journal. A journal entry records events from the writer's personal life in chronological order. The date at the top and the informal description of a day's event are classic features of a diary or journal.","incorrect":[{"choice":"let ter","reason":"\"let ter\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part."},{"choice":"story","category":"incorrect writing format","reason":"A story usually follows a narrative arc with fictional characters and plot development. This text is a brief, personal account of a single event rather than a crafted tale."},"",{"choice":"poem","category":"incorrect writing format","reason":"A poem uses lines, stanzas, and often rhythm or rhyme. This text is written in standard prose sentences, which does not fit the structure of poetry."}]},"metadata":{"gradeLevels":[3,4,5,6],"difficultyByGrade":{"3":"medium","4":"medium","5":"medium","6":"medium"},"primaryDifficulty":"medium","intrinsicDifficulty":"medium","cognitiveDemand":"identify-and-apply","languageDemand":"sentence-context","skills":["grammar","writing","language usage"],"feedbackFocus":"use the writing or language-usage clue and compare each answer choice to the rule","estimatedTimeSeconds":55,"reviewPriority":"normal","sourceSet":"grammar-narrative-writing","sequence":201,"sourceFile":"Proficient-4_Writing strategies_Application_Style.pdf","sourceQuestionNumber":7,"sourceCategory":"writing-strategies-application-style","testFocus":["MAP"],"Test focus":["MAP"],"skillIds":["grammar.usage","grammar.writing"],"standardIds":["L.3-6.1","W.3-6.5"]},"studyAid":{"definition":"A journal is a record of personal experiences, thoughts, or events written by a person about their own day.","example":"April 12: Today I learned how to ride my bike. It was difficult, but I finally did it!","strategyClue":"Look for the date at the beginning and ask yourself if the author is writing for an audience or simply recording their own personal memory.","link":"","linkText":""}}],"metadata":{"gradesSupported":[3,4,5,6],"difficultiesSupported":["easy","medium","hard"],"selectorPolicy":"grade+difficulty selects exact matches first, with 15 exact-match questions for every supported grade and difficulty"}};
  const bank = window.QUESTION_BANK = window.QUESTION_BANK || {};
  const existing = bank["grammar-narrative-writing"];
  if (existing && Array.isArray(existing.questions)) {
    const seen = new Set(existing.questions.map(question => question && question.id));
    chunkSet.questions.forEach(question => {
      if (!seen.has(question && question.id)) existing.questions.push(question);
    });
  } else {
    bank["grammar-narrative-writing"] = chunkSet;
  }
})();
