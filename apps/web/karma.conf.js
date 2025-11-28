// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/web'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,

    // CUSTOM TIMEOUT CONFIGURATIONS FOR STABILITY
    // These increased timeouts prevent disconnects during slow tests or CI environments

    // Time (ms) to wait for browser to send messages before considering it disconnected
    // Increased from 60000 (60s) to 120000 (120s) to handle slow tests in CI
    browserNoActivityTimeout: 120000,

    // Time (ms) to wait for browser to reconnect after disconnect
    // Increased from 5000 (5s) to 10000 (10s) for better reconnection handling
    browserDisconnectTimeout: 10000,

    // Number of times to retry reconnecting a browser before giving up
    // Increased from 3 to 5 to handle transient network issues
    browserDisconnectTolerance: 5,

    // Time (ms) to wait for browser to start and connect to Karma
    // Increased from 120000 (120s) to 240000 (240s) for slow CI environments
    captureTimeout: 240000,

    // Optional: Set to false to run tests only once (useful for CI)
    // Set to true for development (watches files and re-runs tests)
    singleRun: false,

    // Optional: Enable/disable watching files and executing tests whenever any file changes
    autoWatch: true,

    // Log level: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // Enable / disable colors in the output (reporters and logs)
    colors: true,

    // Web server port
    port: 9876,
  });
};
