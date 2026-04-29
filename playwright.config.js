module.exports = {
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 15 * 1000
  }
};
