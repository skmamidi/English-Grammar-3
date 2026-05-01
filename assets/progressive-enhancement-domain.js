(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestProgressiveEnhancement = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FEATURES = {
    'page-shell': {
      critical: true,
      label: 'Page shell',
      message: 'The page shell could not load.',
      recovery: 'Refresh the page, then try the link again.'
    },
    'topic-navigation': {
      critical: true,
      label: 'Topic navigation',
      message: 'Topic navigation could not load.',
      recovery: 'Refresh the page or return to the home page.'
    },
    'manifest-loading': {
      critical: true,
      label: 'Question manifest',
      message: 'Question metadata could not load.',
      recovery: 'Refresh the page before starting this quiz.'
    },
    'quiz-loader': {
      critical: true,
      label: 'Quiz loader',
      message: 'The quiz loader could not start.',
      recovery: 'Refresh the page or choose another topic.'
    },
    'question-chunk': {
      critical: true,
      label: 'Question chunk',
      message: 'A required question file could not load.',
      recovery: 'Reconnect and refresh the page while online, or return to the topic and try again.'
    },
    telemetry: {
      critical: false,
      label: 'Telemetry',
      message: 'Telemetry is unavailable, but learner practice can continue.',
      recovery: 'No action is needed.'
    },
    preloading: {
      critical: false,
      label: 'Preloading',
      message: 'Background question preloading is unavailable, but required questions will still load on demand.',
      recovery: 'Continue normally.'
    },
    'sync-adapter': {
      critical: false,
      label: 'Sync',
      message: 'Sync is unavailable, so local progress is preserved on this device.',
      recovery: 'Sign in or reconnect later to retry sync.'
    },
    'auth-provider': {
      critical: false,
      label: 'Auth',
      message: 'Account sign-in is unavailable, but local signed-out practice can continue.',
      recovery: 'Continue in local mode or try sign-in later.'
    },
    'service-worker-registration': {
      critical: false,
      label: 'Offline support',
      message: 'Offline support is unavailable, but online practice can continue.',
      recovery: 'Refresh later to retry offline support.'
    },
    'server-selection': {
      critical: false,
      label: 'Server selection',
      message: 'Server question selection is unavailable, so local question chunks are being used.',
      recovery: 'Continue normally.'
    }
  };

  const OPTIONAL_ASSET_PATTERNS = [
    { pattern: /\/assets\/question-selection-telemetry\.js(?:$|\?)/, feature: 'telemetry' },
    { pattern: /\/assets\/app-telemetry\.js(?:$|\?)/, feature: 'telemetry' },
    { pattern: /\/assets\/question-preload-policy\.js(?:$|\?)/, feature: 'preloading' },
    { pattern: /\/assets\/question-preloader\.js(?:$|\?)/, feature: 'preloading' },
    { pattern: /\/assets\/auth-service\.js(?:$|\?)/, feature: 'auth-provider' },
    { pattern: /\/assets\/learner-state-sync-adapter\.js(?:$|\?)/, feature: 'sync-adapter' },
    { pattern: /\/assets\/service-worker-registration\.js(?:$|\?)/, feature: 'service-worker-registration' }
  ];

  function getFeature(feature) {
    return FEATURES[normalizeFeature(feature)] || {
      critical: true,
      label: 'Unknown feature',
      message: 'A required app feature could not load.',
      recovery: 'Refresh the page and try again.'
    };
  }

  function classifyFailure(input = {}) {
    const featureName = normalizeFeature(input.feature) || featureFromUrl(input.url);
    const feature = getFeature(featureName);
    const fatal = feature.critical === true;
    return {
      feature: featureName || 'unknown',
      category: fatal ? 'critical' : 'optional',
      fatal,
      code: fatal ? 'critical_feature_unavailable' : 'optional_feature_unavailable',
      message: feature.message,
      recovery: feature.recovery,
      status: Number(input.status) || 0
    };
  }

  async function runWithBoundary(feature, operation, options = {}) {
    try {
      return await operation();
    } catch (error) {
      const failure = classifyFailure({ feature, error });
      if (typeof options.emit === 'function') options.emit(failure);
      if (failure.fatal) {
        const boundaryError = new Error(`${failure.message} ${failure.recovery}`);
        boundaryError.code = failure.code;
        boundaryError.feature = failure.feature;
        boundaryError.recovery = failure.recovery;
        throw boundaryError;
      }
      return typeof options.fallback === 'function' ? options.fallback(failure) : options.fallback;
    }
  }

  function isOptionalFeatureFailure(error) {
    return Boolean(featureFromUrl(getUrl(error)));
  }

  function featureFromUrl(url) {
    const value = getUrl(url);
    const match = OPTIONAL_ASSET_PATTERNS.find(item => item.pattern.test(value));
    return match ? match.feature : '';
  }

  function normalizeFeature(feature) {
    return String(feature || '').trim().toLowerCase();
  }

  function getUrl(value) {
    if (value && typeof value === 'object' && value.url) return String(value.url);
    return String(value || '');
  }

  return {
    classifyFailure,
    featureFromUrl,
    getFeature,
    isOptionalFeatureFailure,
    runWithBoundary
  };
});
