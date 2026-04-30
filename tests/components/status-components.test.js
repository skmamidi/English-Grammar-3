const assert = require('node:assert/strict');
const test = require('node:test');

const components = require('../../assets/components/status-components');
const { createComponentHarness } = require('../helpers/component-harness');

test('offline banner renders hidden loading visible error and retry states', () => {
  assert.match(components.renderOfflineBanner({ state: 'hidden' }), /hidden/);
  assert.match(components.renderOfflineBanner({ state: 'loading' }), /Checking connection/);
  const error = components.renderOfflineBanner({ state: 'error', message: 'raw stack token' });
  assert.match(error, /Connection issue/);
  assert.equal(error.includes('raw stack token'), false);
  assert.match(components.renderOfflineBanner({ state: 'offline', retryEvent: 'retry-offline' }), /data-event="retry-offline"/);
});

test('dashboard summary card covers empty disabled and normal states', () => {
  assert.match(components.renderDashboardSummaryCard({ label: 'Accuracy', value: '' }), /No data yet/);
  assert.match(components.renderDashboardSummaryCard({ label: 'Accuracy', value: '78%', disabled: true }), /aria-disabled="true"/);
  assert.match(components.renderDashboardSummaryCard({ label: 'Accuracy', value: '78%' }), /78%/);
});

test('question report status pill normalizes labels and remains keyboard discoverable', () => {
  const harness = createComponentHarness();
  harness.render(components.renderQuestionReportStatusPill({ status: 'resolved' }));

  assert.equal(harness.getByRole('status', { name: 'Question report status resolved' }).text, 'Resolved');
});
