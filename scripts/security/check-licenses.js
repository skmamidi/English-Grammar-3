#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_LICENSES = Object.freeze([
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MIT'
]);

const LICENSE_OVERRIDES = Object.freeze({
  fsevents: 'MIT',
  playwright: 'Apache-2.0',
  'playwright-core': 'Apache-2.0'
});

function loadPackageLicenses(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const lockPath = path.join(rootDir, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  return Object.entries(lock.packages || {})
    .filter(([packagePath]) => packagePath && packagePath.startsWith('node_modules/'))
    .map(([packagePath, metadata]) => {
      const name = metadata.name || packagePath.replace(/^node_modules\//, '');
      return {
        name,
        version: String(metadata.version || ''),
        license: normalizeLicense(metadata.license || readPackageLicense(rootDir, packagePath, name))
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function checkLicensePolicy(options = {}) {
  const packages = Array.isArray(options.packages)
    ? options.packages
    : loadPackageLicenses(options);
  const blockers = [];
  const warnings = [];
  packages.forEach(pkg => {
    const license = normalizeLicense(pkg.license || LICENSE_OVERRIDES[pkg.name]);
    if (!license || !ALLOWED_LICENSES.includes(license)) {
      blockers.push({
        name: pkg.name,
        version: pkg.version,
        license: license || 'missing',
        reason: 'license_not_allowed'
      });
    }
  });
  return { blockers, warnings, packages };
}

function readPackageLicense(rootDir, packagePath, name) {
  const packageJsonPath = path.join(rootDir, packagePath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.license) return pkg.license;
  }
  return LICENSE_OVERRIDES[name] || '';
}

function normalizeLicense(value) {
  return String(value || '').replace(/[()]/g, '').trim();
}

function formatResult(result) {
  if (!result.blockers.length) return 'License policy passed.';
  return result.blockers.map(item => `${item.name}@${item.version}: ${item.license} (${item.reason})`).join('\n');
}

if (require.main === module) {
  const result = checkLicensePolicy();
  if (result.blockers.length) {
    console.error(formatResult(result));
    process.exitCode = 1;
  } else {
    console.log(formatResult(result));
  }
}

module.exports = {
  ALLOWED_LICENSES,
  LICENSE_OVERRIDES,
  checkLicensePolicy,
  loadPackageLicenses
};
