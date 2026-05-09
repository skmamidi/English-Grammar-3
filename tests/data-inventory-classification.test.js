const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const access = require('../assets/access-control');
const {
  DATA_INVENTORY,
  REQUIRED_DATA_CATEGORIES,
  SENSITIVITY_LEVELS,
  buildDataInventoryMap,
  validateDataInventory,
  validateDataInventoryEntry
} = require('../assets/data-inventory-classification');

const repoRoot = path.resolve(__dirname, '..');

test('data inventory defines required provider-neutral classifications', () => {
  assert.deepEqual(REQUIRED_DATA_CATEGORIES, [
    'public_content',
    'generated_question_content',
    'learner_progress',
    'learner_answer_attempt',
    'guardian_relationship',
    'organization_tenant_metadata',
    'classroom_assignment',
    'institutional_report_projection',
    'institutional_export_manifest',
    'privacy_preference',
    'telemetry_event',
    'audit_event',
    'content_governance',
    'release_artifact',
    'sync_metadata',
    'operational_config',
    'future_native_metadata',
    'future_billing_metadata'
  ]);

  const validation = validateDataInventory(DATA_INVENTORY);
  assert.deepEqual(validation.errors, []);
  assert.deepEqual(Object.keys(buildDataInventoryMap(DATA_INVENTORY)), REQUIRED_DATA_CATEGORIES);
});

test('each classification carries sensitivity lifecycle access and provider metadata', () => {
  DATA_INVENTORY.forEach(entry => {
    assert.ok(SENSITIVITY_LEVELS.includes(entry.sensitivity), `${entry.id} has a known sensitivity`);
    assert.ok(entry.sourceOfTruth, `${entry.id} has a source of truth`);
    assert.ok(entry.retentionOwner, `${entry.id} has a retention owner`);
    assert.ok(entry.exportBehavior, `${entry.id} has export behavior`);
    assert.ok(entry.deleteBehavior, `${entry.id} has delete behavior`);
    assert.ok(entry.telemetryEligibility, `${entry.id} has telemetry eligibility`);
    assert.ok(entry.providerExposure, `${entry.id} has provider exposure`);
    assert.ok(Array.isArray(entry.storageLocations) && entry.storageLocations.length > 0, `${entry.id} has storage locations`);
    assert.ok(Array.isArray(entry.accessRoles) && entry.accessRoles.length > 0, `${entry.id} has access roles`);
    assert.ok(Array.isArray(entry.protectedBy) && entry.protectedBy.length >= 2, `${entry.id} links controls`);
  });
});

test('classification access roles stay aligned to the access-control domain', () => {
  const knownRoles = new Set([
    ...Object.values(access.Roles),
    'anonymous',
    'automation',
    'provider_operator',
    'future_billing_provider',
    'native_platform_runtime'
  ]);

  DATA_INVENTORY.forEach(entry => {
    entry.accessRoles.forEach(role => {
      assert.ok(knownRoles.has(role), `${entry.id} references known role ${role}`);
    });
  });

  assert.ok(buildDataInventoryMap(DATA_INVENTORY).learner_progress.accessRoles.includes(access.Roles.STUDENT));
  assert.ok(buildDataInventoryMap(DATA_INVENTORY).guardian_relationship.accessRoles.includes(access.Roles.PARENT_GUARDIAN));
  assert.ok(buildDataInventoryMap(DATA_INVENTORY).organization_tenant_metadata.accessRoles.includes(access.Roles.TEACHER));
  assert.ok(buildDataInventoryMap(DATA_INVENTORY).classroom_assignment.accessRoles.includes(access.Roles.TEACHER));
  assert.ok(buildDataInventoryMap(DATA_INVENTORY).institutional_report_projection.accessRoles.includes(access.Roles.TEACHER));
  assert.ok(buildDataInventoryMap(DATA_INVENTORY).institutional_export_manifest.accessRoles.includes(access.Roles.SYSTEM_ADMIN));
  assert.ok(buildDataInventoryMap(DATA_INVENTORY).audit_event.accessRoles.includes(access.Roles.SYSTEM_ADMIN));
});

test('validation rejects missing fields unknown roles and unsafe sensitive examples', () => {
  assert.deepEqual(validateDataInventoryEntry({
    id: 'learner_progress',
    sensitivity: 'mystery',
    accessRoles: ['super_admin'],
    sampleValues: ['learnerId=learner-123', 'token=abc']
  }).errors, [
    'learner_progress label is required',
    'learner_progress sensitivity is unknown',
    'learner_progress sourceOfTruth is required',
    'learner_progress storageLocations must not be empty',
    'learner_progress retentionOwner is required',
    'learner_progress accessRoles contains unknown role super_admin',
    'learner_progress exportBehavior is required',
    'learner_progress deleteBehavior is required',
    'learner_progress telemetryEligibility is required',
    'learner_progress providerExposure is required',
    'learner_progress protectedBy must list at least two controls',
    'learner_progress sampleValues contains sensitive example material'
  ]);
});

test('inventory document is privacy-safe and linked to governance controls', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'data-inventory.md'), 'utf8');
  [
    'public_content',
    'generated_question_content',
    'learner_progress',
    'learner_answer_attempt',
    'guardian_relationship',
    'organization_tenant_metadata',
    'classroom_assignment',
    'institutional_report_projection',
    'institutional_export_manifest',
    'privacy_preference',
    'telemetry_event',
    'audit_event',
    'content_governance',
    'release_artifact',
    'sync_metadata',
    'operational_config',
    'future_native_metadata',
    'future_billing_metadata',
    'roles-and-permissions.md',
    'backend-storage-rules.md',
    'learner-data-lifecycle.md',
    'release-checklist.md',
    'app-telemetry-privacy.test.js'
  ].forEach(required => assert.match(doc, new RegExp(escapeRegex(required))));

  assert.doesNotMatch(doc, /learnerId\s*=|studentId\s*=|token\s*=|secret\s*=|password\s*=|customer_[A-Za-z0-9]+|subscription_[A-Za-z0-9]+|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
  assert.match(doc, /provider-neutral/i);
  assert.match(doc, /not a live data catalog/i);
});

test('ci contract wires the data inventory test into the unit gate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:unit'], /tests\/data-inventory-classification\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
