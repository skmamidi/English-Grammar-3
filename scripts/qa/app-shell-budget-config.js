const DEFAULT_APP_SHELL_BUDGET_LIMITS = Object.freeze({
  javascriptFile: Object.freeze({ warnBytes: 96 * 1024, failBytes: 256 * 1024 }),
  javascriptTotal: Object.freeze({ warnBytes: 900 * 1024, failBytes: 1536 * 1024 }),
  cssFile: Object.freeze({ warnBytes: 128 * 1024, failBytes: 192 * 1024 }),
  cssTotal: Object.freeze({ warnBytes: 160 * 1024, failBytes: 240 * 1024 }),
  htmlFile: Object.freeze({ warnBytes: 80 * 1024, failBytes: 128 * 1024 }),
  htmlTotal: Object.freeze({ warnBytes: 420 * 1024, failBytes: 640 * 1024 }),
  serviceWorkerTotal: Object.freeze({ warnBytes: 32 * 1024, failBytes: 64 * 1024 }),
  assetFile: Object.freeze({ warnBytes: 128 * 1024, failBytes: 256 * 1024 }),
  assetTotal: Object.freeze({ warnBytes: 512 * 1024, failBytes: 1024 * 1024 }),
  releaseMetadataTotal: Object.freeze({ warnBytes: 32 * 1024, failBytes: 64 * 1024 })
});

module.exports = {
  DEFAULT_APP_SHELL_BUDGET_LIMITS
};
