// Karma configuration file — reconstruit de façon autonome car angular.json référence
// désormais `karmaConfig`, ce qui désactive l'injection automatique du builder Angular
// (frameworks, plugins, browsers). Voir https://karma-runner.github.io/6.4/config/configuration-file.html
module.exports = function (config) {
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
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/gestion-cocktail-frontend'),
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
