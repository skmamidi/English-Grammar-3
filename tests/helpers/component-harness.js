function createComponentHarness() {
  const state = {
    html: '',
    events: [],
    emitted: []
  };
  return {
    get events() {
      return state.events.slice();
    },
    get emitted() {
      return state.emitted.slice();
    },
    render(html) {
      state.html = String(html || '');
    },
    getByRole(role, options = {}) {
      const element = findElementByRole(state.html, role, options.name);
      if (!element) throw new Error(`role_not_found:${role}:${options.name || ''}`);
      return element;
    },
    queryByText(text) {
      const element = findElementByText(state.html, text);
      if (!element) throw new Error(`text_not_found:${text}`);
      return element;
    },
    click(selector) {
      const element = findElementBySelector(state.html, selector);
      recordEvent(state, 'click', element);
    },
    keydown(selector, key) {
      const element = findElementBySelector(state.html, selector);
      recordEvent(state, 'keydown', element, { key });
    }
  };
}

function recordEvent(state, type, element, detail = {}) {
  state.events.push({ type, selector: element.selector, detail });
  if (element.eventName) state.emitted.push({ name: element.eventName, type, detail });
}

function findElementByRole(html, role, name) {
  const elements = parseElements(html);
  return elements.find(element => element.role === role && (!name || element.accessibleName === name)) || null;
}

function findElementByText(html, text) {
  const needle = String(text || '');
  return parseElements(html).find(element => element.text.includes(needle)) || null;
}

function findElementBySelector(html, selector) {
  const elements = parseElements(html);
  const normalized = String(selector || '').toLowerCase();
  const found = elements.find(element => element.tag === normalized || element.selector === normalized);
  if (!found) throw new Error(`selector_not_found:${selector}`);
  return found;
}

function parseElements(html) {
  const elements = [];
  const pattern = /<([a-z0-9-]+)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);
    const text = stripTags(match[3]).trim();
    const role = attrs.role || implicitRole(tag);
    elements.push({
      tag,
      selector: tag,
      role,
      text,
      accessibleName: attrs['aria-label'] || text,
      eventName: attrs['data-event'] || ''
    });
  }
  return elements;
}

function parseAttributes(source) {
  const attrs = {};
  const pattern = /([a-zA-Z0-9_-]+(?:-[a-zA-Z0-9_-]+)*)=(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(source))) {
    attrs[match[1]] = match[2] || match[3] || '';
  }
  return attrs;
}

function implicitRole(tag) {
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  return '';
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, '');
}

module.exports = {
  createComponentHarness
};
