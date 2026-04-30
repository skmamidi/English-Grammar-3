const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  ALLOWED_LICENSES,
  checkLicensePolicy,
  loadPackageLicenses
} = require('../scripts/security/check-licenses');

test('license policy allows reviewed permissive dependency licenses', () => {
  assert.ok(ALLOWED_LICENSES.includes('Apache-2.0'));
  assert.ok(ALLOWED_LICENSES.includes('MIT'));

  const result = checkLicensePolicy({
    packages: [
      { name: 'playwright', version: '1.59.1', license: 'Apache-2.0' },
      { name: 'tiny-helper', version: '1.0.0', license: 'MIT' }
    ]
  });

  assert.deepEqual(result.blockers, []);
});

test('license policy blocks missing unknown and copyleft-incompatible licenses', () => {
  const result = checkLicensePolicy({
    packages: [
      { name: 'mystery', version: '1.0.0', license: '' },
      { name: 'copyleft', version: '1.0.0', license: 'GPL-3.0' },
      { name: 'unknown', version: '1.0.0', license: 'SEE LICENSE IN LICENSE' }
    ]
  });

  assert.deepEqual(result.blockers.map(item => item.name), ['mystery', 'copyleft', 'unknown']);
});

test('license loader reads package metadata from lockfile and node_modules fallback', () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, '..', 'test-results', 'license-policy-'));
  fs.mkdirSync(path.join(tmpDir, 'node_modules', 'playwright'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
    lockfileVersion: 3,
    packages: {
      '': {},
      'node_modules/playwright': { version: '1.59.1' }
    }
  }, null, 2));
  fs.writeFileSync(path.join(tmpDir, 'node_modules', 'playwright', 'package.json'), JSON.stringify({
    name: 'playwright',
    version: '1.59.1',
    license: 'Apache-2.0'
  }, null, 2));

  assert.deepEqual(loadPackageLicenses({ rootDir: tmpDir }), [{
    name: 'playwright',
    version: '1.59.1',
    license: 'Apache-2.0'
  }]);
});
