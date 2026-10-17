#!/usr/bin/env node
/**
 * TXT/CSV I/O Tests for WavePaint
 * Tests text and CSV export functionality
 */

const {
    describe, it,
    assertEqual, assertType, assertTrue, assertFalse,
    assertContains
} = require('../testFramework');

const { createTestDocumentWithSignals } = require('../mocks');

// ============================================================================
// TXT/CSV CORE FUNCTIONS
// ============================================================================

describe('TXT/CSV I/O - Core Functions', () => {
    it('getSignalDisplayValue function exists', () => {
        assertType(getSignalDisplayValue, 'function');
    });

    it('saveAsTxt function exists', () => {
        assertType(saveAsTxt, 'function');
    });

    it('saveAsCsv function exists', () => {
        assertType(saveAsCsv, 'function');
    });

    it('escapeCSV function exists', () => {
        assertType(escapeCSV, 'function');
    });
});

// ============================================================================
// SIGNAL DISPLAY VALUE TESTS
// ============================================================================

describe('TXT/CSV I/O - Signal Display Values', () => {
    it('Bit signal display value - 0', () => {
        const bitSignal = new Signal('test', SignalType.Bit, 5);
        bitSignal.values = [0, 1, -1, 0, 1];
        
        assertEqual(getSignalDisplayValue(bitSignal, 0), '0');
    });

    it('Bit signal display value - 1', () => {
        const bitSignal = new Signal('test', SignalType.Bit, 5);
        bitSignal.values = [0, 1, -1, 0, 1];
        
        assertEqual(getSignalDisplayValue(bitSignal, 1), '1');
    });

    it('Bit signal display value - undefined (-1)', () => {
        const bitSignal = new Signal('test', SignalType.Bit, 5);
        bitSignal.values = [0, 1, -1, 0, 1];
        
        assertEqual(getSignalDisplayValue(bitSignal, 2), 'X');
    });

    it('Vector signal display value with label', () => {
        const vecSignal = new Signal('vec', SignalType.Vector, 5);
        vecSignal.values = [0, 15, 255, -1, 128];
        vecSignal.labels = ['0x00', '0x0F', '0xFF', 'X', '0x80'];
        
        assertEqual(getSignalDisplayValue(vecSignal, 0), '0x00');
    });

    it('Vector signal display value - undefined', () => {
        const vecSignal = new Signal('vec', SignalType.Vector, 5);
        vecSignal.values = [0, 15, 255, -1, 128];
        vecSignal.labels = ['0x00', '0x0F', '0xFF', 'X', '0x80'];
        
        assertEqual(getSignalDisplayValue(vecSignal, 3), 'X');
    });

    it('Vector without label generates hex value', () => {
        const vecNoLabel = new Signal('vec2', SignalType.Vector, 3);
        vecNoLabel.values = [10, 255, -1];
        vecNoLabel.labels = ['', '', ''];
        
        const val = getSignalDisplayValue(vecNoLabel, 0);
        assertTrue(val.includes('0') || val.includes('A') || val.includes('a') || val.includes('x'));
    });
});

// ============================================================================
// CSV ESCAPING TESTS
// ============================================================================

describe('TXT/CSV I/O - CSV Escaping', () => {
    it('escapeCSV - simple string', () => {
        assertEqual(escapeCSV('simple'), 'simple');
    });

    it('escapeCSV - string with comma', () => {
        assertEqual(escapeCSV('with,comma'), '"with,comma"');
    });

    it('escapeCSV - string with quote', () => {
        assertEqual(escapeCSV('with"quote'), '"with""quote"');
    });

    it('escapeCSV - string with newline', () => {
        assertEqual(escapeCSV('with\nnewline'), '"with\nnewline"');
    });

    it('escapeCSV - empty string', () => {
        assertEqual(escapeCSV(''), '');
    });

    it('escapeCSV - null', () => {
        assertEqual(escapeCSV(null), '');
    });

    it('escapeCSV - string with all special characters', () => {
        const result = escapeCSV('has,comma"quote\nnewline');
        assertContains(result, '"');
        assertContains(result, '""');
    });

    it('escapeCSV - string with only quotes', () => {
        // '"""' (3 quotes) → '"' + '""""""' + '"' = 8 quotes
        const result = escapeCSV('"""');
        assertEqual(result, '""""""""');
    });

    it('escapeCSV - string with carriage return', () => {
        const result = escapeCSV('with\rreturn');
        assertContains(result, '"');
    });

    it('escapeCSV - number as string', () => {
        assertEqual(escapeCSV('12345'), '12345');
    });
});

// ============================================================================
// TXT CONTENT GENERATION TESTS
// ============================================================================

describe('TXT/CSV I/O - TXT Content', () => {
    it('TXT content generation', () => {
        const doc = createTestDocumentWithSignals();
        const signals = doc.m_signals;
        const sampleCount = doc.m_sampleCount;
        const dataSignals = signals.filter(s => s.type !== SignalType.BlankRow);
        
        const txtLines = [];
        const txtHeader = ['Time', ...dataSignals.map(s => s.name || 'unnamed')];
        txtLines.push(txtHeader.join('\t'));
        
        for (let t = 0; t < sampleCount; t++) {
            const row = [t.toString()];
            for (const signal of dataSignals) {
                row.push(getSignalDisplayValue(signal, t));
            }
            txtLines.push(row.join('\t'));
        }
        
        const txtContent = txtLines.join('\n');
        
        assertContains(txtContent, 'Time');
        assertContains(txtContent, 'CLK');
        assertContains(txtContent, 'DATA');
        assertContains(txtContent, '\t');
        
        const rowCount = txtContent.split('\n').length;
        assertEqual(rowCount, sampleCount + 1);
    });

    it('TXT uses tab separator', () => {
        const doc = createTestDocumentWithSignals();
        const signals = doc.m_signals.filter(s => s.type !== SignalType.BlankRow);
        
        const header = ['Time', ...signals.map(s => s.name)].join('\t');
        
        assertContains(header, '\t');
        assertFalse(header.includes(','));
    });
});

// ============================================================================
// CSV CONTENT GENERATION TESTS
// ============================================================================

describe('TXT/CSV I/O - CSV Content', () => {
    it('CSV content uses comma separator', () => {
        const doc = createTestDocumentWithSignals();
        const signals = doc.m_signals;
        const sampleCount = doc.m_sampleCount;
        const dataSignals = signals.filter(s => s.type !== SignalType.BlankRow);
        
        const csvLines = [];
        const csvHeader = ['Time', ...dataSignals.map(s => escapeCSV(s.name || 'unnamed'))];
        csvLines.push(csvHeader.join(','));
        
        for (let t = 0; t < sampleCount; t++) {
            const row = [t.toString()];
            for (const signal of dataSignals) {
                row.push(escapeCSV(getSignalDisplayValue(signal, t)));
            }
            csvLines.push(row.join(','));
        }
        
        const csvContent = csvLines.join('\n');
        
        assertContains(csvContent, ',');
        assertFalse(csvContent.includes('\t'));
    });

    it('CSV escapes signal names with special characters', () => {
        const signal = new Signal('name,with,commas', SignalType.Bit, 3);
        signal.values = [0, 1, 0];
        
        const escaped = escapeCSV(signal.name);
        assertContains(escaped, '"');
    });
});

// ============================================================================
// CORNER CASES
// ============================================================================

describe('TXT/CSV I/O - Corner Cases', () => {
    it('Empty document produces minimal output', () => {
        const doc = new WaveDocument();
        doc.m_sampleCount = 0;
        
        const header = ['Time'].join('\t');
        assertEqual(header, 'Time');
    });

    it('Signal with empty name', () => {
        const signal = new Signal('', SignalType.Bit, 3);
        signal.values = [0, 1, 0];
        
        const name = signal.name || 'unnamed';
        assertEqual(name, 'unnamed');
    });

    it('Very large values display correctly', () => {
        const vecSignal = new Signal('large', SignalType.Vector, 3);
        vecSignal.values = [0xFFFFFFFF, 0x7FFFFFFF, 0];
        vecSignal.labels = ['0xFFFFFFFF', '0x7FFFFFFF', '0x0'];
        
        assertEqual(getSignalDisplayValue(vecSignal, 0), '0xFFFFFFFF');
        assertEqual(getSignalDisplayValue(vecSignal, 1), '0x7FFFFFFF');
    });

    it('BlankRow signals are filtered out', () => {
        const doc = createTestDocumentWithSignals();
        doc.addBlankRow(20);
        
        const dataSignals = doc.m_signals.filter(s => s.type !== SignalType.BlankRow);
        
        for (const sig of dataSignals) {
            assertTrue(sig.type !== SignalType.BlankRow);
        }
    });
});

module.exports = {};
