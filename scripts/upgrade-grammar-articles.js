const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../assets/question-bank-source/grammar.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const set = data.sets['grammar-correct-article'];

function getCategory(choice) {
  const lower = choice.toLowerCase();
  if (lower === 'a') return 'indefinite article (consonant)';
  if (lower === 'an') return 'indefinite article (vowel)';
  if (lower === 'the') return 'definite article';
  if (lower === 'no article') return 'missing word';
  if (lower.includes("'")) return 'punctuation error';
  if (lower.includes('.')) return 'punctuation error';
  if (lower.match(/^[A-Z]/)) return 'capitalization error';
  return 'incorrect grammar';
}

function refineReason(choice, oldReason, correctChoice) {
  // If the old reason is already decent, we can keep it, but let's make it sound more pedagogical.
  let reason = oldReason;
  
  if (reason.includes('leaves out the article')) {
    reason = `Singular, countable nouns or specific contexts here require an article. '${choice}' incorrectly omits it.`;
  } else if (choice === 'a' && correctChoice === 'an') {
    reason = `The next word begins with a vowel sound. Use 'an' before vowel sounds, so '${choice}' is incorrect.`;
  } else if (choice === 'an' && correctChoice === 'a') {
    reason = `The next word begins with a consonant sound. Use 'a' before consonant sounds, so '${choice}' is incorrect.`;
  } else if (choice === 'the' && (correctChoice === 'a' || correctChoice === 'an')) {
    reason = `The sentence refers to a general or non-specific item, requiring an indefinite article ('a' or 'an') rather than the definite article '${choice}'.`;
  } else if ((choice === 'a' || choice === 'an') && correctChoice === 'the') {
    reason = `The sentence refers to a specific, unique, or previously mentioned noun, requiring the definite article 'the' instead of '${choice}'.`;
  }

  // Clean up legacy weirdness where the reason starts with the choice text
  if (reason.startsWith(`"${choice}"`) || reason.startsWith(`'${choice}'`)) {
    // Keep it as is or lowercase the first letter if needed, but our refined reasons override most anyway.
  }

  return reason;
}

let updatedCount = 0;

set.questions.forEach((q) => {
  // Skip q0001 as it's already our gold standard
  if (q.id === 'grammar-correct-article-q0001') return;

  const correctChoice = q.choices[q.correctIndex];

  if (q.explanation && Array.isArray(q.explanation.incorrect)) {
    q.explanation.incorrect = q.explanation.incorrect.map((exp) => {
      if (!exp || typeof exp !== 'object') return exp;

      return {
        choice: exp.choice,
        category: getCategory(exp.choice),
        reason: refineReason(exp.choice, exp.reason, correctChoice)
      };
    });
    updatedCount++;
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
console.log(`Successfully upgraded ${updatedCount} questions in the grammar-correct-article set to the Gold Standard.`);
