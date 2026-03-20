module.exports = {
  default: {
    paths: ['e2e/features/**/*.feature'],
    require: [
      'e2e/support/world.ts',
      'e2e/support/hooks.ts',
      'e2e/steps/**/*.steps.ts',
    ],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      ['allure-cucumberjs/reporter', { resultsDir: 'e2e/allure-results' }],
      ['html', 'e2e/reports/rapport-qa.html'],
      ['json', 'e2e/reports/rapport-qa.json'],
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    publishQuiet: true,
  },
}
