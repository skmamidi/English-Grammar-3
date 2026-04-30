#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourceFiles = [
  'assets/app-entry.js',
  'assets/privacy-settings-ui.js'
];
const outputDir = 'assets/build';

function buildFrontend(options = {}) {
  const root = options.root || repoRoot;
  const outDir = path.join(root, outputDir);
  fs.mkdirSync(outDir, { recursive: true });
  const files = sourceFiles.map(sourcePath => {
    const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
    const targetPath = path.join(outputDir, path.basename(sourcePath)).split(path.sep).join('/');
    fs.writeFileSync(path.join(root, targetPath), source);
    return describeFile(root, targetPath);
  }).sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    schemaVersion: 1,
    strategy: 'native-esm-copy',
    generatedQuestionArtifactsBundled: false,
    entrypoints: ['assets/build/app-entry.js'],
    files
  };
  const manifestPath = path.join(root, outputDir, 'frontend-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function describeFile(root, relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
}

if (require.main === module) {
  const manifest = buildFrontend();
  console.log(`Built ${manifest.files.length} frontend module file(s).`);
}

module.exports = {
  buildFrontend
};
