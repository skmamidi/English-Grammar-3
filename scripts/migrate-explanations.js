const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../assets/question-bank-source');
const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.json'));

let totalMigrated = 0;

files.forEach(file => {
  const filePath = path.join(sourceDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let modified = false;

  Object.values(data.sets || {}).forEach(set => {
    (set.questions || []).forEach(question => {
      if (question.explanation && Array.isArray(question.explanation.incorrect)) {
        const migratedIncorrect = question.explanation.incorrect.map((text, idx) => {
          if (typeof text !== 'string') return text;
          if (!text) return text;
          
          let reason = text;
          let choiceText = question.choices && question.choices[idx] ? question.choices[idx] : '';
          
          // Try to clean up "Not: [choice]." from the reason.
          const notPrefixRegex = /^Not:\s*(.+?)\.\s+/i;
          const match = text.match(notPrefixRegex);
          if (match) {
            reason = text.substring(match[0].length).trim();
          }

          modified = true;
          totalMigrated++;
          return {
            choice: choiceText,
            reason: reason
          };
        });
        
        question.explanation.incorrect = migratedIncorrect;
      }
    });
  });

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Migrated ${file}`);
  }
});

console.log(`Migration complete. Migrated ${totalMigrated} explanations.`);
