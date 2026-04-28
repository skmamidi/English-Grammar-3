(function () {
  'use strict';

  const catalog = window.GrammarQuestCharacters;
  const root = document.getElementById('character-library-root');
  const picker = document.getElementById('library-character-set');
  const resetButton = document.getElementById('reset-character-names');

  if (!catalog || !root || !picker) return;

  const expressionNames = catalog.expressionNames || [
    'curious', 'confident', 'puzzled', 'coaching', 'celebrate', 'surprised',
    'delighted', 'thinking', 'focused', 'worried', 'brave', 'gentle',
    'excited', 'amused', 'determined', 'proud', 'unsure', 'amazed',
    'calm', 'silly', 'reading', 'whispering', 'urgent', 'relieved'
  ];

  function render() {
    renderPicker();
    root.innerHTML = catalog.sets.map(renderSet).join('');
  }

  function renderPicker() {
    const selected = catalog.getSelectedCharacterSetId();
    picker.innerHTML = [
      '<option value="auto">Auto rotate all casts</option>',
      ...catalog.sets.map(set => `<option value="${escapeHtml(set.id)}">${escapeHtml(set.name)}</option>`)
    ].join('');
    picker.value = selected;
  }

  function renderSet(set) {
    const palette = set.palette.map(color => `<span style="background:${escapeHtml(color)}"></span>`).join('');
    return `
      <section class="character-set-section" aria-labelledby="${escapeHtml(set.id)}-title">
        <div class="character-set-heading">
          <div>
            <div class="quest-kicker">${escapeHtml(set.tone)}</div>
            <h2 id="${escapeHtml(set.id)}-title">${escapeHtml(set.name)}</h2>
          </div>
          <div class="character-palette" aria-label="${escapeHtml(set.name)} palette">${palette}</div>
        </div>
        <div class="character-library-grid">
          ${set.characters.map(character => renderCharacterCard(set, character)).join('')}
        </div>
      </section>
    `;
  }

  function renderCharacterCard(set, character) {
    const characterName = catalog.getCharacterDisplayName(character);
    const petName = catalog.getPetDisplayName(character.pet);
    return `
      <article class="character-profile-card" data-character-id="${escapeHtml(character.id)}">
        <div class="character-profile-main">
          <div class="character-preview">
            ${catalog.renderCharacter(character, set, 'delighted')}
            <div class="library-pet-preview">
              ${catalog.renderPet(character.pet, 'excited')}
            </div>
          </div>
          <div class="character-profile-copy">
            <span class="quest-kicker">${escapeHtml(character.role)}</span>
            <h3>${escapeHtml(characterName)}</h3>
            <p>${escapeHtml(character.backstory)}</p>
            <div class="pet-profile">
              <strong>${escapeHtml(petName)}</strong>
              <span>${escapeHtml(character.pet.species)}</span>
              <p>${escapeHtml(character.pet.backstory)}</p>
            </div>
          </div>
        </div>
        <div class="name-editor-grid" aria-label="Customize names">
          <label>
            <span>Character name</span>
            <input type="text" value="${escapeHtml(characterName)}" placeholder="${escapeHtml(character.name)}" data-name-kind="character" data-id="${escapeHtml(character.id)}">
          </label>
          <label>
            <span>Pet name</span>
            <input type="text" value="${escapeHtml(petName)}" placeholder="${escapeHtml(character.pet.name)}" data-name-kind="pet" data-id="${escapeHtml(character.pet.id)}">
          </label>
        </div>
        <details class="expression-library">
          <summary>${expressionNames.length} facial expressions</summary>
          <div class="expression-grid">
            ${expressionNames.map(expression => renderExpression(set, character, expression)).join('')}
          </div>
        </details>
      </article>
    `;
  }

  function renderExpression(set, character, expression) {
    return `
      <div class="expression-chip">
        ${catalog.renderCharacter(character, set, expression)}
        <span>${escapeHtml(titleCase(expression))}</span>
      </div>
    `;
  }

  picker.addEventListener('change', () => {
    catalog.setSelectedCharacterSetId(picker.value);
    render();
  });

  root.addEventListener('input', event => {
    const input = event.target.closest('[data-name-kind]');
    if (!input) return;
    if (input.dataset.nameKind === 'character') {
      catalog.setCharacterDisplayName(input.dataset.id, input.value);
    } else {
      catalog.setPetDisplayName(input.dataset.id, input.value);
    }
  });

  root.addEventListener('change', event => {
    const input = event.target.closest('[data-name-kind]');
    if (!input) return;
    render();
  });

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      catalog.resetCustomNames();
      render();
    });
  }

  function titleCase(value) {
    return String(value).replace(/([A-Z])/g, ' $1').replace(/\b\w/g, char => char.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render();
})();
