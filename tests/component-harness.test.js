const assert = require('node:assert/strict');
const test = require('node:test');

const { createComponentHarness } = require('./helpers/component-harness');

test('component harness renders fixtures and queries accessible names', () => {
  const harness = createComponentHarness();
  harness.render('<button type="button" aria-label="Save privacy settings">Save</button>');

  assert.equal(harness.getByRole('button', { name: 'Save privacy settings' }).text, 'Save');
  assert.equal(harness.queryByText('Save').text, 'Save');
});

test('component harness simulates clicks keyboard and captures emitted events', () => {
  const harness = createComponentHarness();
  harness.render('<button type="button" data-event="save">Save</button>');
  harness.click('button');
  harness.keydown('button', 'Enter');

  assert.deepEqual(harness.events.map(event => event.type), ['click', 'keydown']);
  assert.deepEqual(harness.emitted.map(event => event.name), ['save', 'save']);
});

test('component harness checks focus target attributes overflow and unsafe copy', () => {
  const harness = createComponentHarness();
  harness.render('<button type="button" class="focus-ring" data-min-target="44" aria-label="Open report">Open</button>');

  const button = harness.getByRole('button', { name: 'Open report' });
  assert.equal(button.attrs.type, 'button');
  harness.assertTouchTarget('button', 44);
  harness.assertFocusVisible('button');
  harness.assertNoOverflowText({ maxWordLength: 24 });
  harness.assertNoUnsafeCopy();
});
