/**
 * Test runner for modularity improvement tests
 * Runs all test suites and generates coverage reports
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.test.js'],
  collectCoverageFrom: [
    'src/server/**/*.js',
    '!src/server/**/*.test.js',
    '!src/tests/**/*',
    '!src/main/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js',
    '<rootDir>/src/tests/**/*.spec.js'
  ]
};

// Test suites to run
const TEST_SUITES = [
  {
    name: 'Setup Tests',
    pattern: 'src/tests/setup.test.js',
    description: 'Basic environment and setup validation'
  },
  {
    name: 'Contract Tests',
    pattern: 'src/tests/contracts/**/*.test.js',
    description: 'Module interface contract validation'
  },
  {
    name: 'Integration Tests',
    pattern: 'src/tests/integration/**/*.test.js',
    description: 'Module integration and interaction tests'
  },
  {
    name: 'End-to-End Tests',
    pattern: 'src/tests/e2e/**/*.test.js',
    description: 'Complete workflow validation'
  },
  {
    name: 'Existing Tests',
    pattern: 'src/tests/*.test.js',
    description: 'Original test suite validation'
  }
];

/**
 * Run a specific test suite
 */
async function runTestSuite(suite) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`📝 ${suite.description}`);
    console.log(`🔍 Pattern: ${suite.pattern}\n`);

    const jestPath = path.join(__dirname, '../node_modules/.bin/jest');
    const args = [
      suite.pattern,
      '--verbose',
      '--no-cache',
      '--forceExit',
      '--detectOpenHandles'
    ];

    const jest = spawn('node', [
      path.join(__dirname, '../node_modules/jest/bin/jest.js'),
      ...args
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        USE_SQLITE: 'true',
        SQLITE_PATH: './data/test_password_manager.db',
        JWT_SECRET: 'test-jwt-secret-for-modularity-tests',
        ENCRYPTION_KEY: 'test-encryption-key-32-characters-long',
        SKIP_DB_CONNECTION: 'false'
      }
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${suite.name} completed successfully`);
        resolve({ suite: suite.name, success: true, code });
      } else {
        console.log(`❌ ${suite.name} failed with code ${code}`);
        resolve({ suite: suite.name, success: false, code });
      }
    });

    jest.on('error', (error) => {
      console.error(`💥 Error running ${suite.name}:`, error.message);
      reject({ suite: suite.name, error: error.message });
    });
  });
}

/**
 * Run coverage analysis
 */
async function runCoverageAnalysis() {
  return new Promise((resolve, reject) => {
    console.log('\n📊 Running coverage analysis...\n');

    const jest = spawn('node', [
      path.join(__dirname, '../node_modules/jest/bin/jest.js'),
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=html',
      '--coverageReporters=json',
      '--no-cache',
      '--forceExit'
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        USE_SQLITE: 'true',
        SQLITE_PATH: './data/test_password_manager.db'
      }
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Coverage analysis completed');
        resolve({ success: true, code });
      } else {
        console.log(`❌ Coverage analysis failed with code ${code}`);
        resolve({ success: false, code });
      }
    });

    jest.on('error', (error) => {
      console.error('💥 Error running coverage analysis:', error.message);
      reject({ error: error.message });
    });
  });
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  const timestamp = new Date().toISOString();
  const totalSuites = results.length;
  const successfulSuites = results.filter(r => r.success).length;
  const failedSuites = results.filter(r => !r.success);

  const report = {
    timestamp,
    summary: {
      total: totalSuites,
      successful: successfulSuites,
      failed: failedSuites.length,
      successRate: `${Math.round((successfulSuites / totalSuites) * 100)}%`
    },
    results,
    failedSuites: failedSuites.map(r => ({
      suite: r.suite,
      code: r.code
    }))
  };

  // Write report to file
  const reportPath = path.join(__dirname, '../test-reports/modularity-test-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

/**
 * Main test runner
 */
async function runModularityTests() {
  console.log('🚀 Starting Modularity Test Suite');
  console.log('=====================================\n');

  const startTime = Date.now();
  const results = [];

  try {
    // Run each test suite
    for (const suite of TEST_SUITES) {
      try {
        const result = await runTestSuite(suite);
        results.push(result);
      } catch (error) {
        results.push({
          suite: suite.name,
          success: false,
          error: error.error || error.message
        });
      }
    }

    // Generate test report
    const report = generateTestReport(results);

    // Display summary
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    console.log(`Total Suites: ${report.summary.total}`);
    console.log(`Successful: ${report.summary.successful}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);

    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Suites:');
      report.failedSuites.forEach(suite => {
        console.log(`  - ${suite.suite} (exit code: ${suite.code})`);
      });
    }

    // Run coverage analysis if all tests passed
    if (report.summary.failed === 0) {
      console.log('\n🎉 All test suites passed! Running coverage analysis...');
      try {
        await runCoverageAnalysis();
      } catch (error) {
        console.log('⚠️  Coverage analysis failed, but tests passed');
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\n⏱️  Total execution time: ${duration} seconds`);
    console.log(`📄 Report saved to: test-reports/modularity-test-report.json`);

    // Exit with appropriate code
    process.exit(report.summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error running test suite:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runModularityTests();
}

module.exports = {
  runModularityTests,
  runTestSuite,
  runCoverageAnalysis,
  generateTestReport,
  TEST_SUITES,
  TEST_CONFIG
};
