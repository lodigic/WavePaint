#!/usr/bin/env node
/**
 * Test Framework for WavePaint
 * Simple test framework that works with Node.js
 */

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m'
};

class TestFramework {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };
        this.failedTests = [];
        this.currentSuite = null;
        this.startTime = 0;
        this.verbose = process.argv.includes('-v') || process.argv.includes('--verbose');
    }

    /**
     * Define a test suite
     */
    describe(suiteName, fn) {
        this.currentSuite = suiteName;
        try {
            fn();
        } catch (e) {
            console.error(`${colors.red}Error setting up suite "${suiteName}": ${e.message}${colors.reset}`);
        }
        this.currentSuite = null;
    }

    /**
     * Define a test case
     */
    it(testName, fn) {
        this.tests.push({
            suite: this.currentSuite || 'General',
            name: testName,
            fn: fn,
            status: 'pending',
            error: null,
            duration: 0
        });
    }

    /**
     * Skip a test
     */
    skip(testName, reason = '') {
        this.tests.push({
            suite: this.currentSuite || 'General',
            name: testName,
            fn: null,
            status: 'skipped',
            error: reason,
            duration: 0
        });
    }

    /**
     * Run all registered tests
     */
    async run() {
        this.startTime = Date.now();
        this.results = { passed: 0, failed: 0, skipped: 0, total: this.tests.length };
        this.failedTests = [];

        console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bright}${colors.blue}                    WAVEPAINT TEST SUITE                        ${colors.reset}`);
        console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

        // Group tests by suite
        const suites = {};
        for (const test of this.tests) {
            if (!suites[test.suite]) {
                suites[test.suite] = [];
            }
            suites[test.suite].push(test);
        }

        // Run tests suite by suite
        for (const [suiteName, suiteTests] of Object.entries(suites)) {
            console.log(`${colors.cyan}${colors.bright}▶ ${suiteName}${colors.reset}`);

            for (const test of suiteTests) {
                if (test.status === 'skipped') {
                    this.results.skipped++;
                    console.log(`  ${colors.yellow}○ SKIP${colors.reset} ${test.name}${test.error ? ` (${test.error})` : ''}`);
                    continue;
                }

                const testStart = Date.now();
                try {
                    await test.fn();
                    test.status = 'passed';
                    test.duration = Date.now() - testStart;
                    this.results.passed++;
                    if (this.verbose) {
                        console.log(`  ${colors.green}✓ PASS${colors.reset} ${test.name} ${colors.dim}(${test.duration}ms)${colors.reset}`);
                    }
                } catch (e) {
                    test.status = 'failed';
                    test.error = e;
                    test.duration = Date.now() - testStart;
                    this.results.failed++;
                    this.failedTests.push(test);
                    console.log(`  ${colors.red}✗ FAIL${colors.reset} ${test.name}`);
                    console.log(`    ${colors.red}Error: ${e.message}${colors.reset}`);
                    if (e.stack && this.verbose) {
                        console.log(`    ${colors.dim}${e.stack.split('\n').slice(1, 4).join('\n    ')}${colors.reset}`);
                    }
                }
            }
            console.log('');
        }

        this.printSummary();
        return this.results.failed === 0;
    }

    /**
     * Print test summary
     */
    printSummary() {
        const duration = Date.now() - this.startTime;
        
        console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bright}                         SUMMARY                               ${colors.reset}`);
        console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

        const passedStr = `${colors.green}${this.results.passed} passed${colors.reset}`;
        const failedStr = this.results.failed > 0 
            ? `${colors.red}${this.results.failed} failed${colors.reset}` 
            : `${colors.dim}0 failed${colors.reset}`;
        const skippedStr = this.results.skipped > 0 
            ? `${colors.yellow}${this.results.skipped} skipped${colors.reset}` 
            : '';

        console.log(`  Tests:    ${passedStr}, ${failedStr}${skippedStr ? ', ' + skippedStr : ''}`);
        console.log(`  Total:    ${this.results.total} tests`);
        console.log(`  Duration: ${duration}ms\n`);

        if (this.failedTests.length > 0) {
            console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}\n`);
            for (const test of this.failedTests) {
                console.log(`  ${colors.red}✗${colors.reset} ${test.suite} › ${test.name}`);
                console.log(`    ${colors.dim}${test.error.message}${colors.reset}`);
                if (test.error.expected !== undefined && test.error.actual !== undefined) {
                    console.log(`    ${colors.dim}Expected: ${JSON.stringify(test.error.expected)}${colors.reset}`);
                    console.log(`    ${colors.dim}Actual:   ${JSON.stringify(test.error.actual)}${colors.reset}`);
                }
                console.log('');
            }
        }

        if (this.results.failed === 0) {
            console.log(`${colors.bgGreen}${colors.bright} ALL TESTS PASSED ${colors.reset}\n`);
        } else {
            console.log(`${colors.bgRed}${colors.bright} TESTS FAILED ${colors.reset}\n`);
        }
    }
}

// Assertion functions
class AssertionError extends Error {
    constructor(message, expected, actual) {
        super(message);
        this.name = 'AssertionError';
        this.expected = expected;
        this.actual = actual;
    }
}

function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new AssertionError(message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
        throw new AssertionError(msg, expected, actual);
    }
}

function assertNotEqual(actual, notExpected, message) {
    if (actual === notExpected) {
        const msg = message || `Expected value to not equal ${JSON.stringify(notExpected)}`;
        throw new AssertionError(msg, `not ${notExpected}`, actual);
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        const msg = message || `Objects not equal`;
        throw new AssertionError(msg, expected, actual);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new AssertionError(message || 'Expected non-null value', 'non-null', value);
    }
}

function assertNull(value, message) {
    if (value !== null && value !== undefined) {
        throw new AssertionError(message || 'Expected null or undefined', null, value);
    }
}

function assertTrue(value, message) {
    if (value !== true) {
        throw new AssertionError(message || 'Expected true', true, value);
    }
}

function assertFalse(value, message) {
    if (value !== false) {
        throw new AssertionError(message || 'Expected false', false, value);
    }
}

function assertType(value, type, message) {
    if (typeof value !== type) {
        throw new AssertionError(message || `Expected type ${type}, got ${typeof value}`, type, typeof value);
    }
}

function assertArray(value, message) {
    if (!Array.isArray(value)) {
        throw new AssertionError(message || 'Expected array', 'array', typeof value);
    }
}

function assertThrows(fn, message) {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) {
        throw new AssertionError(message || 'Expected function to throw');
    }
}

function assertDoesNotThrow(fn, message) {
    try {
        fn();
    } catch (e) {
        throw new AssertionError(message || `Expected function not to throw, but threw: ${e.message}`);
    }
}

function assertContains(haystack, needle, message) {
    if (typeof haystack === 'string') {
        if (!haystack.includes(needle)) {
            throw new AssertionError(message || `Expected string to contain "${needle}"`, needle, haystack);
        }
    } else if (Array.isArray(haystack)) {
        if (!haystack.includes(needle)) {
            throw new AssertionError(message || `Expected array to contain ${JSON.stringify(needle)}`, needle, haystack);
        }
    } else {
        throw new AssertionError('assertContains requires string or array');
    }
}

function assertGreaterThan(actual, expected, message) {
    if (!(actual > expected)) {
        throw new AssertionError(message || `Expected ${actual} > ${expected}`, `> ${expected}`, actual);
    }
}

function assertLessThan(actual, expected, message) {
    if (!(actual < expected)) {
        throw new AssertionError(message || `Expected ${actual} < ${expected}`, `< ${expected}`, actual);
    }
}

function assertHexColor(value, message) {
    if (!/^#[0-9a-fA-F]{6}$/i.test(value)) {
        throw new AssertionError(message || `Expected hex color, got ${value}`, '#RRGGBB', value);
    }
}

// Create singleton instance
const testFramework = new TestFramework();

// Export for use
module.exports = {
    TestFramework,
    testFramework,
    describe: testFramework.describe.bind(testFramework),
    it: testFramework.it.bind(testFramework),
    skip: testFramework.skip.bind(testFramework),
    run: testFramework.run.bind(testFramework),
    // Assertions
    assert,
    assertEqual,
    assertNotEqual,
    assertDeepEqual,
    assertNotNull,
    assertNull,
    assertTrue,
    assertFalse,
    assertType,
    assertArray,
    assertThrows,
    assertDoesNotThrow,
    assertContains,
    assertGreaterThan,
    assertLessThan,
    assertHexColor,
    AssertionError,
    colors
};
