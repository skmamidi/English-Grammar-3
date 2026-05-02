/**
 * English Language Quiz App - grammar subchunk: grammar-narrative-writing 5
 * Generated from assets/question-bank-source/grammar.json.
 * Generator version: 1.
 * Source hash: sha256:8e967b406557ee2538ac74b1b10940ba3bb66cca6ae34781e1c15557959237ec.
 */
(function () {
  'use strict';
  const chunkSet = {"title":"Narrative Writing","topic":"Grammar & Usage","questions":[{"id":"grammar-narrative-writing-q0201","version":4,"contentHash":"sha256:dab73075af8e8604f076a1e78b2b0f999bf7186e2f41dab029d07d17302b9d7b","question":"May 4, 2019 – We took a quiz a bout characte rs in mytho logy today. Which type of writing is this?","choices":["let ter","story","journ al","poem"],"correct":2,"explanation":{"correct":"Answer: journ al. Rule or clue: Narrative writing develops characters, setting, events, dialogue, and sensory details to tell a story. \"journ al\" fits the exact writing job in the prompt with clear, focused wording.","incorrect":["Not: let ter. \"let ter\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part.","Not: story. \"story\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part.","","Not: poem. \"poem\" misses the writing job in the prompt because it is off topic, too vague, the wrong tone, or the wrong sentence part."]},"metadata":{"gradeLevels":[3,4,5,6],"difficultyByGrade":{"3":"medium","4":"medium","5":"medium","6":"medium"},"primaryDifficulty":"medium","intrinsicDifficulty":"medium","cognitiveDemand":"identify-and-apply","languageDemand":"sentence-context","skills":["grammar","writing","language usage"],"feedbackFocus":"use the writing or language-usage clue and compare each answer choice to the rule","estimatedTimeSeconds":55,"reviewPriority":"normal","sourceSet":"grammar-narrative-writing","sequence":201,"sourceFile":"Proficient-4_Writing strategies_Application_Style.pdf","sourceQuestionNumber":7,"sourceCategory":"writing-strategies-application-style","testFocus":["MAP"],"Test focus":["MAP"],"skillIds":["grammar.usage","grammar.writing"],"standardIds":["L.3-6.1","W.3-6.5"]}}],"metadata":{"gradesSupported":[3,4,5,6],"difficultiesSupported":["easy","medium","hard"],"selectorPolicy":"grade+difficulty selects exact matches first, with 15 exact-match questions for every supported grade and difficulty"}};
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
