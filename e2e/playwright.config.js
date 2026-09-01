module.exports = {
  testDir: __dirname,
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "results.json" }]],
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10000,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
};
