#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function buildNativeDesignTokenExport(options = {}) {
  const root = options.root || repoRoot;
  const css = fs.readFileSync(path.join(root, 'assets', 'design-tokens.css'), 'utf8');
  const tokens = parseRootTokens(css);
  return {
    schemaVersion: 1,
    generatedFrom: 'assets/design-tokens.css',
    color: {
      primary: colorToken(tokens['--gq-color-primary'], 'brand action'),
      primaryStrong: colorToken(tokens['--gq-color-primary-strong'], 'pressed action'),
      accent: colorToken(tokens['--gq-color-accent'], 'accent'),
      success: colorToken(tokens['--gq-color-success'], 'positive state'),
      danger: colorToken(tokens['--gq-color-danger'], 'critical state'),
      warning: colorToken(tokens['--gq-color-warning'], 'warning state'),
      surface: colorToken(tokens['--gq-color-surface'], 'base surface'),
      surfaceMuted: colorToken(tokens['--gq-color-surface-muted'], 'muted surface'),
      text: colorToken(tokens['--gq-color-text'], 'primary text'),
      textMuted: colorToken(tokens['--gq-color-text-muted'], 'secondary text'),
      border: colorToken(tokens['--gq-color-border'], 'border'),
      focus: colorToken(tokens['--gq-color-focus'], 'keyboard focus'),
      link: colorToken(tokens['--gq-color-link'], 'link text'),
      linkVisited: colorToken(tokens['--gq-color-link-visited'], 'visited link'),
      buttonBg: colorToken(tokens['--gq-color-button-bg'], 'button background'),
      buttonText: colorToken(tokens['--gq-color-button-text'], 'button text'),
      alertBg: colorToken(tokens['--gq-color-alert-bg'], 'alert background'),
      alertBorder: colorToken(tokens['--gq-color-alert-border'], 'alert border'),
      alertText: colorToken(tokens['--gq-color-alert-text'], 'alert text'),
      feedbackCorrect: colorToken(tokens['--gq-color-feedback-correct'], 'correct feedback'),
      feedbackIncorrect: colorToken(tokens['--gq-color-feedback-incorrect'], 'incorrect feedback')
    },
    typeScale: {
      sm: sizeToken(tokens['--gq-font-size-sm']),
      md: sizeToken(tokens['--gq-font-size-md']),
      lg: sizeToken(tokens['--gq-font-size-lg']),
      xl: sizeToken(tokens['--gq-font-size-xl'])
    },
    spacing: {
      1: sizeToken(tokens['--gq-space-1']),
      2: sizeToken(tokens['--gq-space-2']),
      3: sizeToken(tokens['--gq-space-3']),
      4: sizeToken(tokens['--gq-space-4']),
      6: sizeToken(tokens['--gq-space-6']),
      8: sizeToken(tokens['--gq-space-8'])
    },
    radius: {
      sm: sizeToken(tokens['--gq-radius-sm']),
      md: sizeToken(tokens['--gq-radius-md']),
      lg: sizeToken(tokens['--gq-radius-lg'])
    },
    focus: {
      ring: { value: tokens['--gq-focus-ring'], nativeRole: 'focusHalo' },
      minimumTargetSize: { value: tokens['--gq-button-min-height'], nativeRole: 'minimumTapTarget' }
    },
    contrast: {
      minimumTextRatio: 4.5,
      pairs: [
        contrastPair('primary-on-surface', tokens['--gq-color-primary'], tokens['--gq-color-surface']),
        contrastPair('button-text', tokens['--gq-color-button-text'], tokens['--gq-color-button-bg']),
        contrastPair('alert-text', tokens['--gq-color-alert-text'], tokens['--gq-color-alert-bg'])
      ]
    },
    motion: {
      reducedMotion: {
        required: true,
        nativeRole: 'reduceMotion',
        rule: 'disable non-essential transitions and feedback animations'
      }
    },
    elevation: {
      raised: { value: '0 8px 24px rgba(15, 23, 42, 0.12)', nativeRole: 'cardShadow' },
      overlay: { value: '0 16px 40px rgba(15, 23, 42, 0.16)', nativeRole: 'modalShadow' }
    },
    icons: {
      names: ['alert', 'check', 'close', 'info', 'offline', 'settings']
    },
    assets: [
      {
        role: 'app-icon',
        platforms: ['ios', 'ipadOS', 'web'],
        scaleFactors: [1, 2, 3],
        license: 'project-owned',
        cacheCategory: 'critical-shell',
        localizationSensitive: false,
        variants: ['default', 'dark', 'high-contrast']
      }
    ]
  };
}

function validateNativeDesignTokenExport(exportDoc) {
  const input = exportDoc && typeof exportDoc === 'object' ? exportDoc : {};
  const errors = [];
  ['color', 'typeScale', 'spacing', 'radius', 'focus', 'contrast', 'motion', 'elevation', 'icons', 'assets'].forEach(category => {
    if (!input[category]) errors.push(error('missing_category', `missing ${category}`));
  });

  Object.keys(input.color || {}).forEach(name => {
    if (/page|hero|route|screen/i.test(name)) errors.push(error('page_specific_token', `${name} is page-specific`));
  });

  const surface = input.color && input.color.surface && input.color.surface.value;
  const primary = input.color && input.color.primary && input.color.primary.value;
  if (surface && primary && contrastRatio(primary, surface) < 4.5) {
    errors.push(error('contrast_ratio_too_low', 'primary color must meet text contrast against surface'));
  }
  (input.contrast && input.contrast.pairs || []).forEach(pair => {
    if (contrastRatio(pair.foreground, pair.background) < (input.contrast.minimumTextRatio || 4.5)) {
      errors.push(error('contrast_ratio_too_low', `${pair.name} is below minimum contrast`));
    }
  });

  (input.assets || []).forEach(asset => {
    if (!asset.license) errors.push(error('missing_asset_license', `${asset.role || 'asset'} requires license`));
    if (!Array.isArray(asset.platforms) || !asset.platforms.includes('ios') || !asset.platforms.includes('ipadOS')) {
      errors.push(error('missing_native_platform', `${asset.role || 'asset'} must declare ios and ipadOS availability`));
    }
    if (!Array.isArray(asset.scaleFactors) || !asset.scaleFactors.includes(2) || !asset.scaleFactors.includes(3)) {
      errors.push(error('missing_scale_factors', `${asset.role || 'asset'} must declare native scale factors`));
    }
    if (!asset.cacheCategory) errors.push(error('missing_cache_category', `${asset.role || 'asset'} requires cache category`));
  });

  return { ok: errors.length === 0, errors };
}

function parseRootTokens(source) {
  const root = source.match(/:root\s*{([\s\S]*?)}/);
  if (!root) return {};
  return Object.fromEntries(Array.from(root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
    .map(match => [match[1], match[2].trim()]));
}

function colorToken(value, role) {
  return { value, role };
}

function sizeToken(value) {
  return { value };
}

function contrastPair(name, foreground, background) {
  return {
    name,
    foreground,
    background,
    ratio: Number(contrastRatio(foreground, background).toFixed(2))
  };
}

function contrastRatio(foreground, background) {
  const light = relativeLuminance(hexToRgb(foreground));
  const dark = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(light, dark);
  const darker = Math.min(light, dark);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb) {
  const channels = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function hexToRgb(hex) {
  const match = String(hex || '').trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return [0, 0, 0];
  return [0, 2, 4].map(index => Number.parseInt(match[1].slice(index, index + 2), 16));
}

function error(code, message) {
  return { code, message };
}

function writeNativeDesignTokenExport(options = {}) {
  const root = options.root || repoRoot;
  const exportDoc = buildNativeDesignTokenExport({ root });
  const outputPath = path.join(root, 'assets', 'native-design-tokens.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(exportDoc, null, 2)}\n`);
  return { exportDoc, outputPath };
}

if (require.main === module) {
  const result = writeNativeDesignTokenExport({});
  process.stdout.write(`Wrote ${path.relative(repoRoot, result.outputPath)}\n`);
}

module.exports = {
  buildNativeDesignTokenExport,
  validateNativeDesignTokenExport,
  writeNativeDesignTokenExport
};
