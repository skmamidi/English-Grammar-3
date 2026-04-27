(function () {
  'use strict';

  const STORAGE_KEY = 'grammarQuestTheme';
  const root = document.documentElement;
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getStoredTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function getSystemTheme() {
    return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
  }

  function getEffectiveTheme() {
    return getStoredTheme() || getSystemTheme();
  }

  function applyTheme(theme) {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = safeTheme;
    root.style.colorScheme = safeTheme;
  }

  function updateToggle(button) {
    if (!button) return;
    const theme = getEffectiveTheme();
    const isDark = theme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    button.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  applyTheme(getEffectiveTheme());

  window.GrammarQuestTheme = {
    apply: applyTheme,
    current: getEffectiveTheme,
    storageKey: STORAGE_KEY
  };

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.querySelector('[data-theme-toggle]');
    updateToggle(toggle);

    if (toggle) {
      toggle.addEventListener('click', function () {
        const nextTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch (error) {
          // Theme still applies for this page when storage is unavailable.
        }
        applyTheme(nextTheme);
        updateToggle(toggle);
      });
    }
  });

  if (mediaQuery) {
    const handleSystemChange = function () {
      if (!getStoredTheme()) {
        applyTheme(getSystemTheme());
        updateToggle(document.querySelector('[data-theme-toggle]'));
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
    }
  }
})();
