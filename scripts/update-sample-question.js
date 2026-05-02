const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../assets/question-bank-source/grammar.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const set = data.sets['grammar-correct-article'];
const q0001 = set.questions.find(q => q.id === 'grammar-correct-article-q0001');

if (q0001) {
  q0001.explanation = {
    "correct": "Answer: an. The word 'apple' begins with the vowel sound 'ah', so it requires the article 'an'. Remember, we use 'a' before consonant sounds and 'an' before vowel sounds.",
    "incorrect": [
      {
        "choice": "a",
        "category": "indefinite article (consonant)",
        "reason": "The word 'apple' begins with a vowel sound, so 'a' is incorrect. Use 'a' only before consonant sounds."
      },
      "",
      {
        "choice": "the",
        "category": "definite article",
        "reason": "The sentence says '___ apple a day', referring to *any* apple in general, not a specific one. Therefore, the indefinite article 'an' is needed instead of the definite article 'the'."
      },
      {
        "choice": "no article",
        "category": "missing word",
        "reason": "Singular, countable nouns like 'apple' require an article before them in this context."
      }
    ]
  };
  
  q0001.studyAid = {
    "definition": "Use 'a' before words starting with consonant sounds and 'an' before words starting with vowel sounds. Focus on the *sound*, not the spelling.",
    "example": "a banana, an apple, a university (sounds like 'yoo'), an hour (silent h)",
    "link": "https://www.grammar-monster.com/glossary/articles.htm",
    "linkText": "Grammar Monster - Articles"
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log('Successfully updated grammar-correct-article-q0001');
} else {
  console.error('Could not find question grammar-correct-article-q0001');
}
