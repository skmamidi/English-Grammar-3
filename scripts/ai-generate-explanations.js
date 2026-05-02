const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// ─── Validate environment ────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not set.');
  console.error('Usage: GEMINI_API_KEY=your_key node scripts/ai-generate-explanations.js <domain> <setId>');
  process.exit(1);
}

const domainName = process.argv[2];
const targetSetId = process.argv[3];
const extraArgs = process.argv.slice(4);
const runAllSets = targetSetId === '--all' || extraArgs.includes('--all');
const pauseAfterArg = extraArgs.find(arg => arg.startsWith('--pause-after='));
const pauseAfterSets = pauseAfterArg ? Number(pauseAfterArg.split('=')[1]) : 2;
const startAfterArg = extraArgs.find(arg => arg.startsWith('--start-after='));
const startAfterId = startAfterArg ? startAfterArg.split('=')[1] : '';
const chainNext = extraArgs.includes('--chain-next');

if (!domainName || (!targetSetId && !runAllSets)) {
  console.error('Usage: node scripts/ai-generate-explanations.js <domain> <setId>');
  console.error('   or: node scripts/ai-generate-explanations.js <domain> --all [--pause-after=2]');
  console.error('   or: node scripts/ai-generate-explanations.js <domain> <setId> --chain-next');
  console.error('Example: node scripts/ai-generate-explanations.js grammar grammar-double-negatives');
  process.exit(1);
}

// ─── File paths ──────────────────────────────────────────────────────────────
const sourceFile     = path.join(__dirname, `../assets/question-bank-source/${domainName}.json`);
const reviewRecordsFile = path.join(__dirname, '../content-review/ai-authoring-records.json');
const checklistFile = path.join(__dirname, '../GEMINI_CONTENT_CHECKLIST.md');
const runSummaryFile = path.join(__dirname, '../content-review/last-gemini-run.json');

if (!fs.existsSync(sourceFile)) {
  console.error(`Error: Source file not found: ${sourceFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
// ─── Gemini model ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite-preview',
  generationConfig: { responseMimeType: 'application/json' },
});

// ─── Prompt template ─────────────────────────────────────────────────────────
//
// Generates ALL pedagogical content for a question in one call:
//   • explanation.correct   — the "rule or clue" shown after a correct answer
//   • explanation.incorrect[] — per-choice structured feedback
//   • studyAid.definition   — the rule definition shown in the Study Aid panel
//   • studyAid.example      — concrete examples shown in the first (always-visible) clue panel
//   • studyAid.strategyClue — a process hint shown via the Strategy Clue button (no answer leak)
//
const PROMPT_TEMPLATE = `
You are an expert English grammar educator writing content for a student quiz application (grades 3–6).
Given a quiz question, you must produce ALL pedagogical content in a single JSON response.

Return a JSON object with exactly this structure:
{
  "explanationCorrect": "<string>",
  "incorrectExplanations": [
    { "choice": "<exact choice string>", "category": "<2-5 word label>", "reason": "<contextual explanation>" },
    ...one object per incorrect choice...
  ],
  "studyAid": {
    "definition": "<clear rule definition, 1-2 sentences>",
    "example": "<1-3 short concrete examples of the rule in action>",
    "strategyClue": "<process hint — see RULE 7>",
    "link": "<keep the existing link URL if provided, otherwise use an empty string>",
    "linkText": "<keep the existing linkText if provided, otherwise use an empty string>"
  }
}

RULES:
1. "explanationCorrect": Start with "Answer: <correct choice>." then state the key rule or clue that makes this the right answer. Be concise and specific to this question's sentence/words.
2. "incorrectExplanations[].choice": the EXACT choice string as given — do not paraphrase.
3. "incorrectExplanations[].category": a short 2-5 word label for the error type (e.g. "double negative", "missing apostrophe", "definite article", "subject-verb disagreement").
4. "incorrectExplanations[].reason": a contextual, encouraging explanation of WHY this specific choice is wrong. Reference the actual words in the sentence. Never say just "It is wrong." Explain the rule.
5. "studyAid.definition": one clear, memorable rule statement a grade 3-6 student can understand.
6. "studyAid.example": 2-4 brief, concrete examples of the rule in action (correct vs. incorrect pairs are ideal).
7. "studyAid.strategyClue": A SHORT process hint (1-2 sentences) that tells the student HOW to think through this specific question. 
   - MUST be meaningfully different from "explanationCorrect" and must not restate the final answer explanation in different words.
   - MUST NOT name, quote, or strongly imply the correct answer choice.
   - MUST describe a testable mental step or decision path (e.g. "Count the negative words in each sentence — standard English uses only one.").
   - Should be specific to this question's wording, not a generic grammar tip.
   - If "explanationCorrect" says why the answer is right, the strategy clue should say how to find it.

GOLD STANDARD EXAMPLE (for an article question):
{
  "explanationCorrect": "Answer: an. The word 'apple' begins with the vowel sound 'ah', so it requires 'an'. We use 'a' before consonant sounds and 'an' before vowel sounds.",
  "incorrectExplanations": [
    {
      "choice": "a",
      "category": "indefinite article (consonant)",
      "reason": "The word 'apple' begins with a vowel sound, so 'a' is incorrect. Use 'a' only before consonant sounds like 'b', 'd', or 't'."
    },
    {
      "choice": "the",
      "category": "definite article",
      "reason": "The sentence says '___ apple a day', referring to *any* apple in general, not a specific one. Use the indefinite article 'an' here, not the definite article 'the'."
    },
    {
      "choice": "no article",
      "category": "missing article",
      "reason": "Singular countable nouns like 'apple' always need an article in this context. Omitting it produces an ungrammatical sentence."
    }
  ],
  "studyAid": {
    "definition": "Use 'a' before words starting with consonant sounds and 'an' before words starting with vowel sounds. It is the *sound*, not the spelling, that matters.",
    "example": "a banana, an apple, a university (sounds like 'yoo'), an hour (silent h)",
    "strategyClue": "Say the first sound of each word after the blank. If it sounds like a vowel, you need 'an'; if it sounds like a consonant, you need 'a'.",
    "link": "https://www.grammar-monster.com/glossary/articles.htm",
    "linkText": "Grammar Monster - Articles"
  }
}

Now generate the full JSON for this question:
Question Prompt: "{PROMPT}"
Correct Answer: "{CORRECT}"
Incorrect Choices: {INCORRECT_LIST}
Existing study aid link (preserve these): link="{EXISTING_LINK}" linkText="{EXISTING_LINK_TEXT}"

Respond ONLY with the raw JSON object.
`;

// ─── Main processing function ─────────────────────────────────────────────────
function promptForEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(message, () => {
    rl.close();
    resolve();
  }));
}

function parseGeneratedJson(responseText) {
  try {
    return JSON.parse(responseText);
  } catch {
    const cleaned = responseText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(cleaned);
  }
}

async function probeGeminiConnectivity() {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models';
  try {
    const response = await fetch(url, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });
    const bodyText = await response.text();
    console.log(`Gemini probe: ok status=${response.status}`);
    console.log(`Gemini probe body (first 300 chars): ${bodyText.slice(0, 300)}`);
    return true;
  } catch (error) {
    const cause = error?.cause?.message ? ` cause=${error.cause.message}` : '';
    console.log(`Gemini probe: failed${cause} :: ${error.message}`);
    return false;
  }
}

function markChecklistComplete(setId) {
  if (!fs.existsSync(checklistFile)) return;

  const source = fs.readFileSync(checklistFile, 'utf-8');
  const escaped = setId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^- \\[ \\] (\`${escaped}\` - .+)$`, 'm');
  const updated = source.replace(pattern, '- [x] $1');

  if (updated !== source) {
    fs.writeFileSync(checklistFile, updated);
    console.log(`Checklist updated: ${setId}`);
  } else {
    console.log(`Checklist already marked or entry not found: ${setId}`);
  }
}

async function fetchContent(promptText) {
  try {
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();
    return parseGeneratedJson(responseText);
  } catch (error) {
    const status = error?.status ? ` status=${error.status}` : '';
    const statusText = error?.statusText ? ` statusText=${error.statusText}` : '';
    const cause = error?.cause?.message ? ` cause=${error.cause.message}` : '';
    const details = error?.message ? error.message : String(error);
    throw new Error(`API Call Failed:${status}${statusText}${cause} :: ${details}`);
  }
}

async function processQuestion(q, reviewRecords, sourceSetId) {
  if (!q.explanation || !Array.isArray(q.explanation.incorrect)) return false;

  const correctChoice = q.choices[q.correct];
  const incorrectChoices = q.choices.filter((_, i) => i !== q.correct);
  const promptText = q.question || (q.prompt && (q.prompt.text || q.prompt)) || 'Unknown Prompt';
  const existingLink = q.studyAid?.link || '';
  const existingLinkText = q.studyAid?.linkText || '';

  process.stdout.write(`  ${q.id} ... `);

  try {
    const aiPrompt = PROMPT_TEMPLATE
      .replace('{PROMPT}', promptText)
      .replace('{CORRECT}', correctChoice)
      .replace('{INCORRECT_LIST}', JSON.stringify(incorrectChoices))
      .replace('{EXISTING_LINK}', existingLink)
      .replace('{EXISTING_LINK_TEXT}', existingLinkText);

    const generated = await fetchContent(aiPrompt);

    if (generated.explanationCorrect) {
      q.explanation.correct = generated.explanationCorrect;
    }

    if (Array.isArray(generated.incorrectExplanations)) {
      q.explanation.incorrect = q.choices.map((choice, index) => {
        if (index === q.correct) return '';

        const genExp = generated.incorrectExplanations.find(e => e.choice === choice);
        if (genExp) {
          return {
            choice: genExp.choice,
            category: genExp.category,
            reason: genExp.reason,
          };
        }
        return q.explanation.incorrect[index] ?? '';
      });
    }

    if (generated.studyAid) {
      q.studyAid = {
        definition:   generated.studyAid.definition   || q.studyAid?.definition   || '',
        example:      generated.studyAid.example      || q.studyAid?.example      || '',
        strategyClue: generated.studyAid.strategyClue || q.studyAid?.strategyClue || '',
        link:         generated.studyAid.link         || existingLink,
        linkText:     generated.studyAid.linkText     || existingLinkText,
      };
    }

    reviewRecords.push({
      questionId: q.id,
      sourceSet: sourceSetId,
      assistance: {
        purpose: 'explanation+studyAid',
        modelFamily: 'gemini-3.1-pro-preview',
        humanReviewed: false,
      },
      timestamp: new Date().toISOString(),
    });

    console.log('✓');
    return true;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    return false;
  }
}

async function runProcessSet(setId, reviewRecords) {
  const set = data.sets[setId];
  if (!set) {
    throw new Error(`Set '${setId}' not found in ${domainName}.json`);
  }

  console.log(`\nStarting AI generation for: ${setId} (${set.questions.length} questions)`);
  console.log('Generating: explanation.correct | explanation.incorrect[] | studyAid.definition | studyAid.example | studyAid.strategyClue\n');

  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let seenStartAfter = !startAfterId;

  for (const q of set.questions) {
    if (!seenStartAfter) {
      if (q.id === startAfterId) {
        seenStartAfter = true;
      }
      skippedCount++;
      continue;
    }

    if (!q.explanation || !Array.isArray(q.explanation.incorrect)) {
      skippedCount++;
      continue;
    }

    const updated = await processQuestion(q, reviewRecords, setId);
    if (updated) updatedCount++;
    else errorCount++;
    await new Promise(r => setTimeout(r, 3000));
  }

  fs.writeFileSync(sourceFile, JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(reviewRecordsFile, JSON.stringify(reviewRecords, null, 2) + '\n');
  fs.writeFileSync(runSummaryFile, JSON.stringify({
    setId,
    updatedCount,
    errorCount,
    skippedCount,
    completed: true,
    finishedAt: new Date().toISOString(),
  }, null, 2) + '\n');

  console.log(`\nDone. Updated: ${updatedCount}  Errors: ${errorCount}  Skipped: ${skippedCount}`);
  if (updatedCount > 0) {
    markChecklistComplete(setId);
  }
  return { updatedCount, errorCount };
}

async function runProcessDomain() {
  const reviewRecords = fs.existsSync(reviewRecordsFile)
    ? JSON.parse(fs.readFileSync(reviewRecordsFile, 'utf-8'))
    : [];

  const probeOk = await probeGeminiConnectivity();
  if (!probeOk) {
    console.log('Gemini probe failed before generation started; continuing so we can capture the same error path on the first question.');
  }

  const setIds = runAllSets ? Object.keys(data.sets) : [targetSetId];
  let processed = 0;

  for (const setId of setIds) {
    await runProcessSet(setId, reviewRecords);
    processed++;

    if (runAllSets && processed === pauseAfterSets && processed < setIds.length) {
      await promptForEnter(`\nPaused after ${processed} sub-topic(s). Review the updated JSON, then press Enter to continue...`);
    }
  }

  if (chainNext && !runAllSets && setIds.length === 1) {
    const nextSetIds = Object.keys(data.sets);
    const currentIndex = nextSetIds.indexOf(targetSetId);
    for (const nextSetId of nextSetIds.slice(currentIndex + 1)) {
      const checklistSource = fs.existsSync(checklistFile) ? fs.readFileSync(checklistFile, 'utf-8') : '';
      if (checklistSource.includes(`- [x] \`${nextSetId}\``)) {
        continue;
      }
      console.log(`\nChaining to next unfinished set: ${nextSetId}`);
      await runProcessSet(nextSetId, reviewRecords);
      break;
    }
  }

  console.log(`Review records → ${reviewRecordsFile}`);
  console.log('\nNext: npm run questions:normalize && npm run chunks:write && npm run qa:content');
}

runProcessDomain().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
