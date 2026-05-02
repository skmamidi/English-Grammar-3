const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const domainName = process.argv[2];
const startAfterId = process.argv[3] || '';

if (!domainName) {
  console.error('Usage: node scripts/run-gemini-subtopics.js <domain> [startAfterSetId]');
  process.exit(1);
}

const checklistFile = path.join(__dirname, '../GEMINI_CONTENT_CHECKLIST.md');
const runSummaryFile = path.join(__dirname, '../content-review/last-gemini-run.json');
const sourceFile = path.join(__dirname, `../assets/question-bank-source/${domainName}.json`);
const generator = path.join(__dirname, 'ai-generate-explanations.js');

if (!fs.existsSync(sourceFile)) {
  console.error(`Source file not found: ${sourceFile}`);
  process.exit(1);
}

function readChecklist() {
  if (!fs.existsSync(checklistFile)) return '';
  return fs.readFileSync(checklistFile, 'utf-8');
}

function parseSetIds() {
  const source = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  return Object.keys(source.sets);
}

function isDone(checklist, setId) {
  return checklist.includes(`- [x] \`${setId}\``);
}

function nextUnfinishedSet(setIds, checklist, afterSetId) {
  const startIndex = afterSetId ? setIds.indexOf(afterSetId) + 1 : 0;
  for (const setId of setIds.slice(startIndex)) {
    if (!isDone(checklist, setId)) return setId;
  }
  return null;
}

function runSet(setId) {
  console.log(`\nLaunching ${setId}`);
  const result = spawnSync('node', [generator, domainName, setId], {
    encoding: 'utf-8',
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 1;
}

function readRunSummary() {
  if (!fs.existsSync(runSummaryFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(runSummaryFile, 'utf-8'));
  } catch {
    return null;
  }
}

const setIds = parseSetIds();
let checklist = readChecklist();
let current = nextUnfinishedSet(setIds, checklist, startAfterId);

if (!current) {
  console.log('All subtopics are already complete.');
  process.exit(0);
}

while (current) {
  const exitCode = runSet(current);
  if (exitCode !== 0) {
    console.error(`Run failed for ${current} with exit code ${exitCode}.`);
    process.exit(exitCode);
  }

  checklist = readChecklist();
  const summary = readRunSummary();
  const runCompleted = summary && summary.completed && summary.setId === current;

  if (!isDone(checklist, current)) {
    if (runCompleted) {
      console.log(`Checklist missing for ${current}, but run summary confirms completion. Marking it now.`);
      const checklistSource = fs.readFileSync(checklistFile, 'utf-8');
      const escaped = current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^- \\[ \\] (\`${escaped}\` - .+)$`, 'm');
      const updated = checklistSource.replace(pattern, '- [x] $1');
      if (updated !== checklistSource) {
        fs.writeFileSync(checklistFile, updated);
        checklist = updated;
      }
    } else {
      console.error(`Checklist was not updated for ${current}; stopping to avoid skipping a subtopic.`);
      process.exit(1);
    }
  }

  current = nextUnfinishedSet(setIds, checklist, current);
}

console.log('\nAll remaining subtopics for this domain are complete.');
