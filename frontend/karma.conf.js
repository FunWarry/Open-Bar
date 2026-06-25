// Karma configuration — Angular 17+ : le plugin @angular-devkit est injecté automatiquement
// par le builder karma. Ce fichier ajoute uniquement des reporters supplémentaires.
module.exports = function (config) {
  // En CI (GitHub Actions), ajouter le reporter JUnit pour publier les résultats en annotations PR
  if (process.env['CI']) {
    config.plugins = (config.plugins || []).concat([require('karma-junit-reporter')]);
    config.reporters = (config.reporters || []).concat(['junit']);
    config.junitReporter = {
      outputDir: 'reports',
      outputFile: 'test-results.xml',
      useBrowserName: false,
    };
  }
};
