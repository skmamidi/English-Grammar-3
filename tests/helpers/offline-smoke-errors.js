'use strict';

const progressiveEnhancement = require('../../assets/progressive-enhancement-domain');

function isAllowedOfflineSmokeResourceNoise(error) {
  const url = getErrorUrl(error);
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/favicon.ico';
  } catch (parseError) {
    return /\/favicon\.ico(?:$|\?)/.test(url);
  }
}

function isAppOwnedAsset(url) {
  const value = getErrorUrl(url);
  return /\/assets\/|\/topics\/|\/index\.html(?:$|\?)|\/reports\.html(?:$|\?)|\/character-library\.html(?:$|\?)/.test(value);
}

function isExpectedOfflineResourceError(error, options = {}) {
  if (!options.allowOfflineResourceErrors) return false;
  const status = Number(error && error.status);
  const failure = String(error && error.failure || '');
  const url = getErrorUrl(error);
  return status === 503 ||
    /ERR_INTERNET_DISCONNECTED/.test(failure) ||
    (/ERR_ABORTED/.test(failure) && /\/assets\/story-lesson-chunks\//.test(url));
}

function formatOfflineSmokeResourceErrors(errors, options = {}) {
  return (Array.isArray(errors) ? errors : [])
    .filter(error => !isAllowedOfflineSmokeResourceNoise(error))
    .filter(error => !isAllowedOptionalFeatureFailure(error, options))
    .filter(error => !isExpectedOfflineResourceError(error, options))
    .map(formatResourceError);
}

function isAllowedOptionalFeatureFailure(error, options = {}) {
  return options.allowOptionalFeatureFailures === true &&
    progressiveEnhancement.isOptionalFeatureFailure(error);
}

function formatResourceError(error) {
  const status = error && error.status ? `${error.status}` : 'request failed';
  const url = getErrorUrl(error);
  const failure = error && error.failure ? ` (${error.failure})` : '';
  return `${status} ${url}${failure}`;
}

function getErrorUrl(error) {
  if (error && typeof error === 'object' && error.url) return String(error.url);
  return String(error || '');
}

module.exports = {
  formatOfflineSmokeResourceErrors,
  isAllowedOfflineSmokeResourceNoise,
  isAppOwnedAsset
};
