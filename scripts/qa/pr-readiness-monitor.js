#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const VALID_STATUSES = new Set(['ready', 'in_progress', 'completed', 'blocked', 'superseded']);
const VALID_REVIEW_STATUSES = new Set(['passed', 'failed', 'pending']);
const ROADMAP_EVIDENCE_ROWS = [{
  item: 'F-006',
  evidence: ['8.12']
}, {
  item: 'F-007',
  evidence: ['8.12']
}, {
  item: '17.2',
  evidence: ['10.9']
}, {
  item: '17.3',
  evidence: ['11.1']
}, {
  item: '17.4',
  evidence: ['12.1']
}, {
  item: '17.5',
  evidence: ['6.9']
}];

function parseArgs(argv) {
  const options = {
    now: new Date(),
    lookbackMinutes: null,
    json: false,
    rootDir: process.cwd()
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--now') {
      index += 1;
      options.now = new Date(argv[index]);
    } else if (arg.startsWith('--now=')) {
      options.now = new Date(arg.slice('--now='.length));
    } else if (arg === '--lookback-minutes') {
      index += 1;
      options.lookbackMinutes = Number(argv[index]);
    } else if (arg.startsWith('--lookback-minutes=')) {
      options.lookbackMinutes = Number(arg.slice('--lookback-minutes='.length));
    } else if (arg === '--root') {
      index += 1;
      options.rootDir = argv[index];
    } else if (arg.startsWith('--root=')) {
      options.rootDir = arg.slice('--root='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (Number.isNaN(options.now.getTime())) {
    throw new Error('Invalid --now value; expected an ISO timestamp.');
  }

  if (options.lookbackMinutes !== null && (!Number.isFinite(options.lookbackMinutes) || options.lookbackMinutes < 0)) {
    throw new Error('Invalid --lookback-minutes value; expected a non-negative number.');
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseRoadmap(markdown) {
  const items = new Map();
  const rowPattern = /^\|\s*(✅|⬜)\s*\|\s*([A-Z]-\d+|\d+\.\d+)\s*\|\s*([^|]+?)\s*\|/;

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(rowPattern);
    if (!match) continue;
    items.set(match[2].trim(), {
      status: match[1],
      task: match[3].trim()
    });
  }

  return items;
}

function parseIso(value, label, issues) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${label} must be an ISO timestamp.`);
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    issues.push(`${label} is not a valid ISO timestamp: ${value}`);
    return null;
  }

  return parsed;
}

function isRecent(date, now, lookbackMinutes) {
  const deltaMs = now.getTime() - date.getTime();
  return deltaMs >= 0 && deltaMs <= lookbackMinutes * 60 * 1000;
}

function validateRegistry(registry, rootDir, options = {}) {
  const issues = [];
  const warnings = [];
  const now = options.now || new Date();
  const lookbackMinutes = options.lookbackMinutes ?? registry.policy?.recentCompletionLookbackMinutes ?? 30;
  const readyMinimum = registry.policy?.readyPrMinimum ?? 5;
  const roadmapPath = path.join(rootDir, 'docs/milestone-roadmap.md');
  const roadmap = parseRoadmap(fs.readFileSync(roadmapPath, 'utf8'));
  addRoadmapConsistencyIssues(roadmap, issues);

  if (registry.schemaVersion !== 1) {
    issues.push('docs/prs/status.json must use schemaVersion 1.');
  }

  parseIso(registry.updatedAt, 'updatedAt', issues);

  if (!Number.isFinite(lookbackMinutes) || lookbackMinutes < 0) {
    issues.push('policy.recentCompletionLookbackMinutes must be a non-negative number.');
  }

  if (!Number.isInteger(readyMinimum) || readyMinimum < 0) {
    issues.push('policy.readyPrMinimum must be a non-negative integer.');
  }

  if (!Array.isArray(registry.prs)) {
    issues.push('prs must be an array.');
    return buildResult({ issues, warnings, now, lookbackMinutes, readyMinimum, roadmap, prs: [] });
  }

  const seenNumbers = new Set();
  const recentCompleted = [];
  const readyPrs = [];

  for (const pr of registry.prs) {
    const label = `PR ${pr.number ?? '(missing number)'}`;

    if (!Number.isInteger(pr.number) || pr.number <= 0) {
      issues.push(`${label} must provide a positive integer number.`);
      continue;
    }

    if (seenNumbers.has(pr.number)) {
      issues.push(`PR ${pr.number} is duplicated in docs/prs/status.json.`);
    }
    seenNumbers.add(pr.number);

    if (!VALID_STATUSES.has(pr.status)) {
      issues.push(`PR ${pr.number} has invalid status "${pr.status}".`);
    }

    if (typeof pr.file !== 'string' || pr.file.trim() === '') {
      issues.push(`PR ${pr.number} must provide a file path.`);
    } else if (!fs.existsSync(path.join(rootDir, pr.file))) {
      issues.push(`PR ${pr.number} file does not exist: ${pr.file}`);
    }

    if (!Array.isArray(pr.roadmapItems) || pr.roadmapItems.length === 0) {
      issues.push(`PR ${pr.number} must list at least one roadmapItems entry.`);
    } else {
      for (const item of pr.roadmapItems) {
        const roadmapItem = roadmap.get(item);
        if (!roadmapItem) {
          issues.push(`PR ${pr.number} references unknown roadmap item ${item}.`);
          continue;
        }

        if (pr.status === 'completed' && roadmapItem.status !== '✅') {
          issues.push(`PR ${pr.number} is completed but roadmap item ${item} is not checked off.`);
        }

        if (pr.status === 'ready' && roadmapItem.status === '✅') {
          issues.push(`PR ${pr.number} is ready but roadmap item ${item} is already checked off.`);
        }
      }
    }

    if (pr.status === 'completed') {
      const completedAt = parseIso(pr.completedAt, `PR ${pr.number} completedAt`, issues);
      if (completedAt && isRecent(completedAt, now, lookbackMinutes)) {
        recentCompleted.push(pr);
      }

      if (!pr.review) {
        issues.push(`PR ${pr.number} is completed but has no review record.`);
      } else {
        if (!VALID_REVIEW_STATUSES.has(pr.review.status)) {
          issues.push(`PR ${pr.number} has invalid review status "${pr.review.status}".`);
        }
        const reviewedAt = parseIso(pr.review.reviewedAt, `PR ${pr.number} review.reviewedAt`, issues);
        if (completedAt && reviewedAt && reviewedAt.getTime() < completedAt.getTime()) {
          issues.push(`PR ${pr.number} review.reviewedAt is earlier than completedAt.`);
        }
        if (pr.review.status !== 'passed') {
          issues.push(`PR ${pr.number} is completed but review status is "${pr.review.status}".`);
        }
        if (!Array.isArray(pr.review.commands) || pr.review.commands.length === 0) {
          warnings.push(`PR ${pr.number} review has no recorded validation commands.`);
        }
      }
    }

    if (pr.status === 'ready') {
      readyPrs.push(pr);
    }
  }

  const incompleteRoadmapCount = Array.from(roadmap.values()).filter((item) => item.status === '⬜').length;
  const requiredReadyCount = Math.min(readyMinimum, incompleteRoadmapCount);
  const activeQueueCount = readyPrs.length + recentCompleted.length;
  if (activeQueueCount < requiredReadyCount) {
    issues.push(`Only ${activeQueueCount} active PR(s) are queued or recently completed; ${requiredReadyCount} required while roadmap work remains.`);
  }

  return buildResult({
    issues,
    warnings,
    now,
    lookbackMinutes,
    readyMinimum,
    roadmap,
    prs: registry.prs,
    recentCompleted,
    readyPrs,
    activeQueueCount,
    requiredReadyCount
  });
}

function addRoadmapConsistencyIssues(roadmap, issues) {
  ROADMAP_EVIDENCE_ROWS.forEach(rule => {
    const item = roadmap.get(rule.item);
    if (!item || item.status === '✅') return;
    const completedEvidence = rule.evidence.filter(number => roadmap.get(number)?.status === '✅');
    if (completedEvidence.length === rule.evidence.length) {
      completedEvidence.forEach(number => {
        issues.push(`roadmap item ${rule.item} is unchecked but evidence item ${number} is checked off.`);
      });
    }
  });
}

function buildResult({
  issues,
  warnings,
  now,
  lookbackMinutes,
  readyMinimum,
  roadmap,
  prs,
  recentCompleted = [],
  readyPrs = [],
  activeQueueCount = readyPrs.length,
  requiredReadyCount = 0
}) {
  const incompleteRoadmapItems = Array.from(roadmap.entries())
    .filter(([, item]) => item.status === '⬜')
    .map(([number, item]) => ({ number, task: item.task }));

  return {
    ok: issues.length === 0,
    now: now.toISOString(),
    lookbackMinutes,
    readyMinimum,
    requiredReadyCount,
    activeQueueCount,
    recentCompleted: recentCompleted.map((pr) => ({
      number: pr.number,
      title: pr.title,
      completedAt: pr.completedAt,
      reviewedAt: pr.review?.reviewedAt,
      roadmapItems: pr.roadmapItems
    })),
    readyPrs: readyPrs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      roadmapItems: pr.roadmapItems
    })),
    incompleteRoadmapCount: incompleteRoadmapItems.length,
    incompleteRoadmapItems,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
    trackedPrCount: prs.length
  };
}

function formatResult(result) {
  const lines = [];
  lines.push(`PR readiness monitor: ${result.ok ? 'passed' : 'failed'}`);
  lines.push(`Tracked PRs: ${result.trackedPrCount}`);
  lines.push(`Recent completed PRs (${result.lookbackMinutes} min): ${result.recentCompleted.length || 'none'}`);
  for (const pr of result.recentCompleted) {
    lines.push(`  PR ${pr.number}: ${pr.title} (completed ${pr.completedAt}, reviewed ${pr.reviewedAt})`);
  }
  lines.push(`Ready PRs: ${result.readyPrs.length}/${result.requiredReadyCount}`);
  for (const pr of result.readyPrs) {
    lines.push(`  PR ${pr.number}: ${pr.title} -> ${pr.roadmapItems.join(', ')}`);
  }
  lines.push(`Active ready/recent queue: ${result.activeQueueCount}/${result.requiredReadyCount}`);
  lines.push(`Incomplete roadmap items: ${result.incompleteRoadmapCount}`);

  if (result.warnings.length) {
    lines.push('Warnings:');
    for (const warning of result.warnings) lines.push(`  - ${warning}`);
  }

  if (result.issues.length) {
    lines.push('Issues:');
    for (const issue of result.issues) lines.push(`  - ${issue}`);
  }

  return lines.join('\n');
}

function main(argv = process.argv) {
  const options = parseArgs(argv);
  const registryPath = path.join(options.rootDir, 'docs/prs/status.json');
  const registry = readJson(registryPath);
  const result = validateRegistry(registry, options.rootDir, options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatResult(result)}\n`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
}

if (require.main === module) {
  main();
}

module.exports = {
  parseRoadmap,
  validateRegistry,
  formatResult,
  main
};
