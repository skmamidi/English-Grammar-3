#!/usr/bin/env node

const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const checklistFile = path.join(__dirname, '../GEMINI_CONTENT_CHECKLIST.md');

function checkTopicDone(lastSetId) {
  if (!fs.existsSync(checklistFile)) return false;
  const checklist = fs.readFileSync(checklistFile, 'utf-8');
  return checklist.includes(`- [x] \`${lastSetId}\``);
}

function runTopic(domainName) {
  console.log(`\n======================================================`);
  console.log(`Starting generation for topic: ${domainName}`);
  console.log(`======================================================\n`);
  
  const res = spawnSync('node', ['scripts/ai-generate-explanations.js', domainName, '--all', '--pause-after=100'], {
    encoding: 'utf-8',
    stdio: 'inherit',
    env: process.env
  });
  return res.status === 0;
}

const topicsToChain = [
  { domain: 'vocabulary', lastSet: 'vocabulary-spelling-patterns' },
  { domain: 'reference-skills', lastSet: 'reference-skills-nonfiction-text-features' },
  { domain: 'capitalization', lastSet: 'capitalization-names-of-places' },
  { domain: 'reading-comprehension', lastSet: 'reading-comprehension-test-taking-reading-skills' }
];

function checkNext() {
  // Step 1: Wait for current active topic (Vocabulary) to fully complete.
  if (!checkTopicDone(topicsToChain[0].lastSet)) {
    console.log(`[Watcher] Vocabulary is still in progress. Checking again in 30 seconds...`);
    setTimeout(checkNext, 30000);
    return;
  }

  // Step 2: Once Vocabulary is done, iterate through the remaining topics sequentially.
  for (let i = 1; i < topicsToChain.length; i++) {
    const t = topicsToChain[i];
    if (!checkTopicDone(t.lastSet)) {
      console.log(`Chaining next topic: ${t.domain}`);
      const ok = runTopic(t.domain);
      if (!ok) {
        console.error(`Error while generating content for topic: ${t.domain}`);
        process.exit(1);
      }
    } else {
      console.log(`Topic already marked complete: ${t.domain}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`All requested topics are completely updated!`);
  console.log(`======================================================\n`);
}

checkNext();
