const assert = require('node:assert/strict');
const test = require('node:test');

const components = require('../../assets/components/control-components');
const { createComponentHarness } = require('../helpers/component-harness');

test('action buttons expose accessible names focus visibility touch targets and events', () => {
  const harness = createComponentHarness();
  harness.render(components.renderActionButton({
    label: 'Save goal settings',
    icon: 'save',
    event: 'save-goals',
    variant: 'primary'
  }));

  const button = harness.getByRole('button', { name: 'Save goal settings' });
  assert.equal(button.attrs['data-icon'], 'save');
  assert.match(button.attrs.class, /component-action-button/);
  harness.assertTouchTarget('button', 44);
  harness.assertFocusVisible('button');

  harness.click('button');
  assert.deepEqual(harness.emitted.map(event => event.name), ['save-goals']);
});

test('filter fields and segmented controls keep labels states and overflow safe', () => {
  const harness = createComponentHarness();
  harness.render([
    components.renderFilterField({
      label: 'Skill filter',
      name: 'skill',
      value: 'grammar',
      options: [
        { value: 'all', label: 'All skills' },
        { value: 'grammar', label: 'Grammar' }
      ]
    }),
    components.renderSegmentedControl({
      label: 'Dashboard view',
      name: 'view',
      selected: 'guardian',
      options: [
        { value: 'learner', label: 'Learner' },
        { value: 'guardian', label: 'Guardian' }
      ]
    })
  ].join(''));

  assert.equal(harness.getByRole('combobox', { name: 'Skill filter' }).attrs.name, 'skill');
  const group = harness.getByRole('group', { name: 'Dashboard view' });
  assert.match(group.text, /LearnerGuardian/);
  assert.equal(harness.getByRole('button', { name: 'Guardian' }).attrs['aria-pressed'], 'true');
  harness.assertNoOverflowText({ maxWordLength: 24 });
});

test('dashboard rows empty states and dialog shells keep semantic state boundaries', () => {
  const harness = createComponentHarness();
  harness.render([
    components.renderDashboardListRow({
      label: 'Weekly practice',
      value: '4 of 5 sessions',
      meta: 'On track',
      status: 'success',
      event: 'open-goal-row'
    }),
    components.renderEmptyState({
      title: 'No reports yet',
      message: 'Choose a quiz to start collecting progress.',
      actionLabel: 'Browse topics',
      event: 'browse-topics'
    }),
    components.renderDialogShell({
      title: 'Delete saved session',
      body: 'This removes the local saved session only.',
      closeLabel: 'Close dialog'
    })
  ].join(''));

  assert.match(harness.getByRole('listitem', { name: 'Weekly practice success' }).text, /4 of 5 sessions/);
  assert.match(harness.getByRole('status', { name: 'No reports yet' }).text, /Browse topics/);
  const dialog = harness.getByRole('dialog', { name: 'Delete saved session' });
  assert.equal(dialog.attrs['aria-modal'], 'true');
  assert.equal(harness.getByRole('button', { name: 'Close dialog' }).attrs.type, 'button');
  harness.assertNoUnsafeCopy();
});
