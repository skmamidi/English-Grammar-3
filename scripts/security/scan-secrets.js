#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SCAN_TARGETS = Object.freeze([
  'assets',
  'server',
  'scripts',
  'tests',
  'docs',
  '.github/workflows',
  'assets/release-manifest.json',
  'assets/release-manifest.js'
]);

const DEFAULT_ALLOWLIST = Object.freeze([
  { path: 'tests/secret-scan.test.js', ruleId: 'pem-private-key' },
  { path: 'tests/secret-scan.test.js', ruleId: 'service-account-json' },
  { path: 'tests/secret-scan.test.js', ruleId: 'bearer-token' },
  { path: 'tests/secret-scan.test.js', ruleId: 'env-file' }
]);

const RULES = Object.freeze([
  {
    id: 'pem-private-key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g
  },
  {
    id: 'service-account-json',
    pattern: /"type"\s*:\s*"service_account"[\s\S]{0,2000}"private_key"\s*:/g
  },
  {
    id: 'firebase-private-key',
    pattern: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/g
  },
  {
    id: 'bearer-token',
    pattern: /Bearer\s+(?:gh[pousr]_|github_pat_|sk-|ya29\.|xox[baprs]-)[A-Za-z0-9_\-]{20,}/g
  },
  {
    id: 'private-selection-signing-material',
    pattern: /\bSELECTION_PRIVATE_KEY\s*=\s*(?!\s*(?:example|placeholder|abc)\b)[^\s#'"]{12,}/g
  }
]);

function scanRepositoryForSecrets(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const targets = options.targets || DEFAULT_SCAN_TARGETS;
  const files = collectFiles(rootDir, targets).map(filePath => ({
    path: path.relative(rootDir, filePath).split(path.sep).join('/'),
    content: fs.readFileSync(filePath, 'utf8')
  }));
  const allowlist = (options.allowlist || DEFAULT_ALLOWLIST).map(normalizeAllow);
  return scanFilesForSecrets({ files, allowlist });
}

function scanFilesForSecrets(options = {}) {
  const files = Array.isArray(options.files) ? options.files : [];
  const allowlist = (options.allowlist || DEFAULT_ALLOWLIST).map(normalizeAllow);
  const findings = [];
  files.forEach(file => {
    const filePath = normalizePath(file.path);
    const content = String(file.content || '');
    if (isEnvFile(filePath) && !isAllowed({ path: filePath, ruleId: 'env-file' }, allowlist)) {
      findings.push(finding('env-file', filePath, 1, 'Environment files must not be committed.'));
    }
    RULES.forEach(rule => {
      Array.from(content.matchAll(rule.pattern)).forEach(match => {
        const line = getLineNumber(content, match.index || 0);
        if (!isAllowed({ path: filePath, ruleId: rule.id, line }, allowlist)) {
          findings.push(finding(rule.id, filePath, line, `Potential secret matched ${rule.id}.`));
        }
      });
    });
  });
  return findings.sort((left, right) => `${left.path}:${left.line}:${left.ruleId}`.localeCompare(`${right.path}:${right.line}:${right.ruleId}`));
}

function collectFiles(rootDir, targets) {
  const files = [];
  targets.forEach(target => {
    const targetPath = path.resolve(rootDir, target);
    if (!targetPath.startsWith(rootDir) || !fs.existsSync(targetPath)) return;
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      walk(targetPath, files);
    } else if (isTextFile(targetPath)) {
      files.push(targetPath);
    }
  });
  return Array.from(new Set(files));
}

function walk(dir, files) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (['.git', 'node_modules', 'test-results', 'playwright-report'].includes(entry.name)) return;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (isTextFile(fullPath)) {
      files.push(fullPath);
    }
  });
}

function isTextFile(filePath) {
  return /\.(?:js|json|html|css|md|yml|yaml|txt|mjs|cjs|env|lock|backup)$/.test(filePath) || isEnvFile(filePath);
}

function isEnvFile(filePath) {
  const base = path.basename(filePath);
  return base === '.env' || /^\.env\./.test(base);
}

function finding(ruleId, filePath, line, message) {
  return { ruleId, path: filePath, line, message };
}

function isAllowed(candidate, allowlist) {
  return allowlist.some(item => {
    if (item.ruleId && item.ruleId !== candidate.ruleId) return false;
    if (item.path && item.path !== candidate.path) return false;
    if (item.line && item.line !== candidate.line) return false;
    return true;
  });
}

function normalizeAllow(item) {
  return {
    path: normalizePath(item && item.path),
    ruleId: String(item && item.ruleId || '').trim(),
    line: Number(item && item.line) || 0
  };
}

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function formatFindings(findings) {
  return findings.map(item => `${item.path}:${item.line} ${item.ruleId} ${item.message}`).join('\n');
}

if (require.main === module) {
  const findings = scanRepositoryForSecrets();
  if (findings.length) {
    console.error(formatFindings(findings));
    process.exitCode = 1;
  } else {
    console.log('Secret scan passed.');
  }
}

module.exports = {
  DEFAULT_ALLOWLIST,
  DEFAULT_SCAN_TARGETS,
  formatFindings,
  scanFilesForSecrets,
  scanRepositoryForSecrets
};
