#!/usr/bin/env node
/**
 * JSON I/O Tests for WavePaint
 * Tests JSON serialization and deserialization
 */

const {
    describe, it,
    assertEqual, assertType, assertTrue, assertFalse,
    assertGreaterThan, assertContains, assertDeepEqual
} = require('../testFramework.cjs');

const { createTestDocument, createTestDocumentWithSignals } = require('../mocks.cjs');

// ============================================================================
// JSON I/O CORE TESTS
// ============================================================================

describe('JSON I/O - Core', () => {
    it('saveToFile function exists', () => {
        assertType(saveToFile, 'function');
    });

    it('loadFromFileContent function exists', () => {
        assertType(loadFromFileContent, 'function');
    });

    it('JSON serialization produces valid structure', () => {
        const doc = createTestDocumentWithSignals();
        
        const root = {};
        root.sampleCount = doc.m_sampleCount;
        root.subStepCount = doc.m_subStepCount;
        
        const sigArray = [];
        for (const s of doc.m_signals) {
            const so = {};
            so.name = s.name;
            so.type = s.type === SignalType.Bit ? 'bit' : 
                      s.type === SignalType.Vector ? 'vector' : 'blank';
            so.color = s.color || '#000000';
            so.values = [...s.values];
            so.labels = [...s.labels];
            sigArray.push(so);
        }
        root.signals = sigArray;
        root.markers = doc.m_markers.map(m => ({ id: m.id, position: m.position, color: m.color }));
        root.arrows = [];
        
        const jsonStr = JSON.stringify(root, null, 2);
        
        assertGreaterThan(jsonStr.length, 0, 'JSON string should not be empty');
        assertContains(jsonStr, '"sampleCount"');
        assertContains(jsonStr, '"signals"');
        assertContains(jsonStr, '"CLK"');
    });

    it('JSON deserialization loads correctly', () => {
        const jsonContent = JSON.stringify({
            sampleCount: 8,
            subStepCount: 0,
            signals: [
                {
                    name: 'CLK',
                    type: 'bit',
                    color: '#00ff00',
                    values: [0, 1, 0, 1, 0, 1, 0, 1],
                    labels: ['', '', '', '', '', '', '', '']
                },
                {
                    name: 'DATA',
                    type: 'vector',
                    color: '#ff0000',
                    values: [10, 20, 30, 40, 50, 60, 70, 80],
                    labels: ['0x0A', '0x14', '0x1E', '0x28', '0x32', '0x3C', '0x46', '0x50']
                }
            ],
            markers: [{ id: 1, position: 4, color: '#ffff00' }],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        });
        
        const doc = new WaveDocument();
        const success = loadFromFileContent(doc, jsonContent);
        
        assertTrue(success, 'loadFromFileContent should return true');
        assertEqual(doc.m_sampleCount, 8);
        assertEqual(doc.m_signals.length, 2);
        assertEqual(doc.m_signals[0].name, 'CLK');
        assertEqual(doc.m_signals[0].type, SignalType.Bit);
        assertEqual(doc.m_signals[1].name, 'DATA');
        assertEqual(doc.m_signals[1].type, SignalType.Vector);
        assertEqual(doc.m_markers.length, 1);
        assertEqual(doc.m_markers[0].position, 4);
    });

    it('JSON round-trip preserves data', () => {
        const originalDoc = createTestDocumentWithSignals();
        
        const root = {
            sampleCount: originalDoc.m_sampleCount,
            subStepCount: originalDoc.m_subStepCount,
            signals: originalDoc.m_signals.map(s => ({
                name: s.name,
                type: s.type === SignalType.Bit ? 'bit' : 
                      s.type === SignalType.Vector ? 'vector' : 'blank',
                color: s.color || '#000000',
                values: [...s.values],
                labels: [...s.labels]
            })),
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        };
        
        const jsonStr = JSON.stringify(root);
        
        const newDoc = new WaveDocument();
        const success = loadFromFileContent(newDoc, jsonStr);
        
        assertTrue(success);
        assertEqual(newDoc.m_sampleCount, originalDoc.m_sampleCount);
        assertEqual(newDoc.m_signals.length, originalDoc.m_signals.length);
        assertEqual(newDoc.m_signals[0].name, originalDoc.m_signals[0].name);
        assertDeepEqual(newDoc.m_signals[0].values, originalDoc.m_signals[0].values);
    });
});

// ============================================================================
// JSON I/O ERROR HANDLING TESTS
// ============================================================================

describe('JSON I/O - Error Handling', () => {
    it('Empty document loads successfully', () => {
        const emptyJson = JSON.stringify({
            sampleCount: 1,
            subStepCount: 0,
            signals: [],
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        });
        
        const emptyDoc = new WaveDocument();
        const success = loadFromFileContent(emptyDoc, emptyJson);
        
        assertTrue(success);
        assertEqual(emptyDoc.m_signals.length, 0);
    });

    it('Invalid JSON returns false', () => {
        const invalidDoc = new WaveDocument();
        const success = loadFromFileContent(invalidDoc, 'not valid json');
        
        assertFalse(success);
    });

    it('Missing sampleCount returns false', () => {
        const missingCountJson = JSON.stringify({ signals: [] });
        const missingDoc = new WaveDocument();
        const success = loadFromFileContent(missingDoc, missingCountJson);
        
        assertFalse(success);
    });

    it('Large document loads successfully', () => {
        const largeJson = JSON.stringify({
            sampleCount: 1000,
            subStepCount: 0,
            signals: [{
                name: 'LARGE',
                type: 'vector',
                values: Array(1000).fill(0xFFFFFFFF),
                labels: Array(1000).fill('0xFFFFFFFF')
            }],
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        });
        
        const largeDoc = new WaveDocument();
        const success = loadFromFileContent(largeDoc, largeJson);
        
        assertTrue(success);
        assertEqual(largeDoc.m_signals[0].values.length, 1000);
    });
});

// ============================================================================
// JSON I/O CORNER CASES
// ============================================================================

describe('JSON I/O - Corner Cases', () => {
    it('Extreme values preserved in round-trip', () => {
        const doc = createTestDocument(5);
        
        const edgeSig = new Signal('EDGE', SignalType.Vector, 5);
        edgeSig.values = [0, 0xFFFFFFFF, -1, 0x7FFFFFFF, 1];
        edgeSig.labels = ['MIN', 'MAX32', 'UNDEF', 'MAX_SIGNED', 'ONE'];
        doc.m_signals.push(edgeSig);
        
        const root = {
            sampleCount: doc.m_sampleCount,
            subStepCount: 0,
            signals: [{
                name: 'EDGE',
                type: 'vector',
                values: [...edgeSig.values],
                labels: [...edgeSig.labels]
            }],
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        };
        
        const jsonStr = JSON.stringify(root);
        const loadedDoc = new WaveDocument();
        loadFromFileContent(loadedDoc, jsonStr);
        
        assertDeepEqual(loadedDoc.m_signals[0].values, edgeSig.values);
        assertDeepEqual(loadedDoc.m_signals[0].labels, edgeSig.labels);
    });

    it('Special character names preserved', () => {
        const doc = createTestDocument(3);
        
        const specialNames = [
            'signal_with_underscore',
            'signal-with-dash',
            'signal.with.dots',
            'UPPERCASE_SIG',
            'MixedCase123'
        ];
        
        for (const name of specialNames) {
            const sig = new Signal(name, SignalType.Bit, 3);
            sig.values = [0, 1, 0];
            doc.m_signals.push(sig);
        }
        
        const root = {
            sampleCount: doc.m_sampleCount,
            subStepCount: 0,
            signals: doc.m_signals.map(s => ({
                name: s.name,
                type: 'bit',
                values: [...s.values],
                labels: []
            })),
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        };
        
        const jsonStr = JSON.stringify(root);
        const loadedDoc = new WaveDocument();
        loadFromFileContent(loadedDoc, jsonStr);
        
        for (let i = 0; i < specialNames.length; i++) {
            assertEqual(loadedDoc.m_signals[i].name, specialNames[i]);
        }
    });

    it('Single sample document round-trip', () => {
        const singleRoot = {
            sampleCount: 1,
            subStepCount: 0,
            signals: [{
                name: 'single',
                type: 'bit',
                values: [1],
                labels: ['']
            }],
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        };
        
        const singleDoc = new WaveDocument();
        const success = loadFromFileContent(singleDoc, JSON.stringify(singleRoot));
        
        assertTrue(success);
        assertEqual(singleDoc.m_signals[0].values[0], 1);
    });

    it('Unicode in signal names', () => {
        const root = {
            sampleCount: 3,
            subStepCount: 0,
            signals: [{
                name: '信号_émoji_🎉',
                type: 'bit',
                values: [0, 1, 0],
                labels: []
            }],
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        };
        
        const doc = new WaveDocument();
        const success = loadFromFileContent(doc, JSON.stringify(root));
        
        assertTrue(success);
        assertEqual(doc.m_signals[0].name, '信号_émoji_🎉');
    });

    it('Very long signal name', () => {
        const longName = 'A'.repeat(500);
        const root = {
            sampleCount: 1,
            subStepCount: 0,
            signals: [{
                name: longName,
                type: 'bit',
                values: [0],
                labels: []
            }],
            markers: [],
            arrows: [],
            timeJumps: [],
            timeSpanMarkers: [],
            groups: [],
            textAnnotations: []
        };
        
        const doc = new WaveDocument();
        const success = loadFromFileContent(doc, JSON.stringify(root));
        
        assertTrue(success);
        assertEqual(doc.m_signals[0].name, longName);
    });
});

module.exports = {};
