/**
 * English Language Quiz App - grammar subchunk: grammar-narrative-writing 5
 * Generated from assets/question-bank-source/grammar.json.
 * Generator version: 1.
 * Source hash: sha256:d5cd49b8c2d5e59d5b6569349945179cf2b76b33fe033c9c9defb068efcc9a84.
 */
(function () {
  'use strict';
  const chunkSet = {"title":"Narrative Writing","topic":"Grammar & Usage","questions":[{"id":"grammar-narrative-writing-q0201","version":4,"contentHash":"sha256:74f57f16edc41f22c2f09bb17738805f9ce8a123ae22c1021dd1fa63c63e656d","question":"May 4, 2019 – We took a quiz a bout characte rs in mytho logy today. Which type of writing is this?","choices":["let ter","story","journ al","poem"],"correct":2,"explanation":{"correct":"Answer: journ al. Rule or clue: Narrative writing develops characters, setting, events, dialogue, and sensory details to tell a story. \"journ al\" fits the exact writing job in the prompt with clear, focused wording.","incorrect":[{"choice":"let ter","reason":"\"let ter\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part."},{"choice":"story","reason":"\"story\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part."},"",{"choice":"poem","reason":"\"poem\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part."}]},"metadata":{"gradeLevels":[3,4,5,6],"difficultyByGrade":{"3":"medium","4":"medium","5":"medium","6":"medium"},"primaryDifficulty":"medium","intrinsicDifficulty":"medium","cognitiveDemand":"identify-and-apply","languageDemand":"sentence-context","skills":["grammar","writing","language usage"],"feedbackFocus":"use the writing or language-usage clue and compare each answer choice to the rule","estimatedTimeSeconds":55,"reviewPriority":"normal","sourceSet":"grammar-narrative-writing","sequence":201,"sourceFile":"Proficient-4_Writing strategies_Application_Style.pdf","sourceQuestionNumber":7,"sourceCategory":"writing-strategies-application-style","testFocus":["MAP"],"Test focus":["MAP"],"skillIds":["grammar.usage","grammar.writing"],"standardIds":["L.3-6.1","W.3-6.5"]},"studyAid":{}}],"metadata":{"gradesSupported":[3,4,5,6],"difficultiesSupported":["easy","medium","hard"],"selectorPolicy":"grade+difficulty selects exact matches first, with 15 exact-match questions for every supported grade and difficulty"}};
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
