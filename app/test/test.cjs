#!/usr/bin/env node
/**
 * WavePaint Modular Test Runner
 * 
 * Runs tests from the modular test structure:
 *   - test/core/*.test.cjs   - Core module tests
 *   - test/io/*.test.cjs     - I/O module tests
 *   - test/ui/*.test.cjs     - UI component tests
 * 
 * Run with: node test-modular.js
 * Options:
 *   -v, --verbose   Show all passing tests
 *   --core          Run only core tests
 *   --io            Run only I/O tests
 *   --ui            Run only UI tests
 *   --help          Show help
 * 
 * Exit code 0 = all tests passed
 * Exit code 1 = some tests failed
 */

const path = require('path');
const fs = require('fs');
const { colors } = require('./testFramework.cjs');

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const coreOnly = args.includes('--core');
const ioOnly = args.includes('--io');
const uiOnly = args.includes('--ui');

// If no specific flag, run all
const runCore = coreOnly || (!ioOnly && !uiOnly);
const runIO = ioOnly || (!coreOnly && !uiOnly);
const runUI = uiOnly || (!coreOnly && !ioOnly);

if (showHelp) {
    console.log(`
${colors.bright}WavePaint Modular Test Runner${colors.reset}

Usage: node test-modular.js [options]

Options:
  -v, --verbose   Show all passing tests (not just failures)
  --core          Run only core tests (test/core/*.test.cjs)
  --io            Run only I/O tests (test/io/*.test.cjs)
  --ui            Run only UI tests (test/ui/*.test.cjs)
  -h, --help      Show this help message

Examples:
  node test-modular.js              Run all modular tests
  node test-modular.js --core       Run only core tests  
  node test-modular.js --io         Run only I/O tests
  node test-modular.js --ui         Run only UI tests
  node test-modular.js -v           Run all tests with verbose output
`);
    process.exit(0);
}

console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║              WavePaint Modular Test Runner                    ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

// Load mocks first (sets up global environment)
console.log(`${colors.dim}Loading mock environment...${colors.reset}`);
const mocks = require('./mocks.cjs');

// Load core modules
console.log(`${colors.dim}Loading core modules...${colors.reset}`);
const coreLoaded = mocks.loadCoreModules();
console.log(`  ${colors.green}✓${colors.reset} Loaded ${coreLoaded} core modules`);

// Load I/O modules
console.log(`${colors.dim}Loading I/O modules...${colors.reset}`);
const ioLoaded = mocks.loadIOModules();
console.log(`  ${colors.green}✓${colors.reset} Loaded ${ioLoaded} I/O modules`);

console.log('');

// Import the test framework
const { testFramework } = require('./testFramework.cjs');

/**
 * Load all test files from a directory
 */
function loadTestsFromDir(dir, label) {
    const dirPath = path.join(__dirname, dir);
    
    if (!fs.existsSync(dirPath)) {
        console.log(`${colors.yellow}⚠${colors.reset} Directory ${dir} not found, skipping`);
        return 0;
    }
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.test.cjs'));
    
    if (files.length === 0) {
        console.log(`${colors.yellow}⚠${colors.reset} No test files found in ${dir}`);
        return 0;
    }
    
    console.log(`${colors.dim}Loading ${label} tests from ${dir}...${colors.reset}`);
    
    let count = 0;
    for (const file of files) {
        try {
            require(path.join(dirPath, file));
            console.log(`  ${colors.green}✓${colors.reset} ${file}`);
            count++;
        } catch (err) {
            console.log(`  ${colors.red}✗${colors.reset} ${file}: ${err.message}`);
        }
    }
    
    return count;
}

// Load test files from modular directories
let totalTestFiles = 0;

if (runCore) {
    totalTestFiles += loadTestsFromDir('core', 'Core');
}

if (runIO) {
    totalTestFiles += loadTestsFromDir('io', 'I/O');
}

if (runUI) {
    totalTestFiles += loadTestsFromDir('ui', 'UI');
}

if (totalTestFiles === 0) {
    console.log(`${colors.yellow}No test files loaded. Exiting.${colors.reset}`);
    process.exit(0);
}

console.log('');
console.log(`${colors.dim}Loaded ${totalTestFiles} test files${colors.reset}`);
console.log('');

// Run all tests
testFramework.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error(`${colors.red}Fatal error running tests:${colors.reset}`, err);
    process.exit(1);
});
