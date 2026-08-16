// Karma configuration file — reconstruit de façon autonome car angular.json référence
// désormais `karmaConfig`, ce qui désactive l'injection automatique du builder Angular
// (frameworks, plugins, browsers). Voir https://karma-runner.github.io/6.4/config/configuration-file.html
if (!process.env.CHROME_BIN && process.platform === 'win32') {
  const fs = require('node:fs');
  const edgePath = String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`;
  const edge64 = String.raw`C:\Program Files\Microsoft\Edge\Application\msedge.exe`;
  if (fs.existsSync(edgePath)) {
    process.env.CHROME_BIN = edgePath;
  } else if (fs.existsSync(edge64)) {
    process.env.CHROME_BIN = edge64;
  }
}

module.exports = function karma (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false, // laisse le rapport Jasmine visible dans le navigateur
      jasmine: {
        random: false,
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('node:path').join(__dirname, './coverage/gestion-cocktail-frontend'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }],
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
    browserDisconnectTimeout: 30000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 60000,
    captureTimeout: 60000,
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    }
  });

  // En CI (GitHub Actions), ajouter le reporter JUnit pour publier les résultats en annotations PR
  if (process.env['CI']) {
    config.plugins.push(require('karma-junit-reporter'));
    config.reporters.push('junit');
    config.junitReporter = {
      outputDir: 'reports',
      outputFile: 'test-results.xml',
      useBrowserName: false,
    };
  }
};
