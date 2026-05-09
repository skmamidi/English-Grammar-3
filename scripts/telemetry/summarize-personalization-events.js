#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const telemetry = require('../../assets/personalization-telemetry-policy');

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write('Usage: node scripts/telemetry/summarize-personalization-events.js <events.json>\\nSummarizes aggregate personalization rollout events without learner/content payloads.\\n');
    return 0;
  }
  const file = argv[0];
  if (!file) {
    process.stderr.write('Missing events JSON path. Use --help for usage.\\n');
    return 1;
  }
  const events = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(telemetry.summarizePersonalizationEvents(events), null, 2)}\\n`);
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { main };
