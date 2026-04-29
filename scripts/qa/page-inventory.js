#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function listHtmlFiles(root = repoRoot) {
  const files = [];
  walk(root, files);
  return files
    .filter(file => file.endsWith('.html'))
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .sort();
}

function walk(dir, files) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git') return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  });
}

function getTopicIndexPages(root = repoRoot) {
  return listHtmlFiles(root).filter(file => /^topics\/[^/]+\/index\.html$/.test(file));
}

function getSubtopicPages(root = repoRoot) {
  return listHtmlFiles(root).filter(file => /^topics\/[^/]+\/subtopics\/[^/]+\.html$/.test(file));
}

function getRepresentativeSubtopicPages(root = repoRoot) {
  const byDomain = new Map();
  getSubtopicPages(root).forEach(file => {
    const domain = file.split('/')[1];
    if (!byDomain.has(domain)) byDomain.set(domain, file);
  });
  return Array.from(byDomain.values()).sort();
}

function getCorePages(root = repoRoot) {
  return ['index.html', ...getTopicIndexPages(root), 'reports.html', 'character-library.html']
    .filter(file => fs.existsSync(path.join(root, file)));
}

if (require.main === module) {
  console.log(JSON.stringify({
    corePages: getCorePages(),
    representativeSubtopics: getRepresentativeSubtopicPages(),
    allSubtopics: getSubtopicPages()
  }, null, 2));
}

module.exports = {
  repoRoot,
  listHtmlFiles,
  getTopicIndexPages,
  getSubtopicPages,
  getRepresentativeSubtopicPages,
  getCorePages
};
