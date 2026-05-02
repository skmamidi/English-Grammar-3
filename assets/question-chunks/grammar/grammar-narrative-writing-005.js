/**
 * English Language Quiz App - grammar subchunk: grammar-narrative-writing 5
 * Generated from assets/question-bank-source/grammar.json.
 * Generator version: 1.
 * Source hash: sha256:22c29c435bd1c9ebad934750832f84e6ffdee8763dbb035b1b20ed40431a5255.
 */
(function () {
  'use strict';
  const chunkSet = {"title":"Narrative Writing","topic":"Grammar & Usage","questions":[{"id":"grammar-narrative-writing-q0201","version":2,"contentHash":"sha256:1fc643d8390a9df40282ed7602144cda717edb8d96c4315784943fcebbb68ed6","question":"May 4, 2019 – We took a quiz a bout characte rs in mytho logy today. Which type of writing is this?","choices":["let ter","story","journ al","poem"],"correct":2,"explanation":{"correct":"Answer: journ al. Rule or clue: The best answer must match the exact clue in the question. \"journ al\" best fits the writing purpose in the prompt because it is clear, precise, and focused on the topic.","incorrect":["Not: let ter. \"let ter\" does not fit the writing purpose as well; it is too vague, off topic, too informal, or not the requested sentence part.","Not: story. \"story\" does not fit the writing purpose as well; it is too vague, off topic, too informal, or not the requested sentence part.","","Not: poem. \"poem\" does not fit the writing purpose as well; it is too vague, off topic, too informal, or not the requested sentence part."]},"metadata":{"gradeLevels":[3,4,5,6],"difficultyByGrade":{"3":"medium","4":"medium","5":"medium","6":"medium"},"primaryDifficulty":"medium","intrinsicDifficulty":"medium","cognitiveDemand":"identify-and-apply","languageDemand":"sentence-context","skills":["grammar","writing","language usage"],"feedbackFocus":"use the writing or language-usage clue and compare each answer choice to the rule","estimatedTimeSeconds":55,"reviewPriority":"normal","sourceSet":"grammar-narrative-writing","sequence":201,"sourceFile":"Proficient-4_Writing strategies_Application_Style.pdf","sourceQuestionNumber":7,"sourceCategory":"writing-strategies-application-style","testFocus":["MAP"],"Test focus":["MAP"],"skillIds":["grammar.usage","grammar.writing"],"standardIds":["L.3-6.1","W.3-6.5"]}}],"metadata":{"gradesSupported":[3,4,5,6],"difficultiesSupported":["easy","medium","hard"],"selectorPolicy":"grade+difficulty selects exact matches first, with 15 exact-match questions for every supported grade and difficulty"}};
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
