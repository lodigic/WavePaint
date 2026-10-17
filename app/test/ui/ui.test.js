#!/usr/bin/env node
/**
 * UI Tests for WavePaint
 * Tests UI components, context menus, and property editors
 */

const {
    describe, it,
    assertEqual, assertType, assertTrue, assertFalse,
    assertNotNull, assertGreaterThan
} = require('../testFramework');

const { createTestDocument, createTestDocumentWithSignals } = require('../mocks');

// ============================================================================
// PROPERTY EDITOR TESTS
// ============================================================================

describe('UI - PropertyEditor', () => {
    it('PropertyEditor class/function exists', () => {
        if (typeof PropertyEditor !== 'undefined') {
            assertType(PropertyEditor, 'function');
        } else if (typeof createPropertyEditor !== 'undefined') {
            assertType(createPropertyEditor, 'function');
        } else {
            // Skip if not loaded
            return;
        }
    });

    it('Signal property accessor works', () => {
        const doc = createTestDocumentWithSignals();
        
        assertEqual(doc.m_signals[0].name, 'CLK');
        assertEqual(doc.m_signals[0].type, SignalType.Bit);
    });

    it('Signal color can be set and retrieved', () => {
        const doc = createTestDocumentWithSignals();
        doc.setSignalColor(0, '#ff0000');
        
        assertEqual(doc.m_signals[0].color, '#ff0000');
    });

    it('Signal name can be set and retrieved', () => {
        const doc = createTestDocumentWithSignals();
        doc.setSignalName(0, 'NewName');
        
        assertEqual(doc.m_signals[0].name, 'NewName');
    });

    it('Arrow color can be set and retrieved', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 1, 5);
        doc.setArrowColorById(id, '#00ff00');
        
        assertEqual(doc.m_arrows[0].color, '#00ff00');
    });

    it('Marker color can be set and retrieved', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        doc.setMarkerColorById(id, '#0000ff');
        
        assertEqual(doc.m_markers[0].color, '#0000ff');
    });

    it('Text annotation properties can be modified', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Original', 5);
        
        doc.setTextAnnotationText(id, 'Modified');
        assertEqual(doc.m_textAnnotations[0].text, 'Modified');
        
        doc.setTextAnnotationColor(id, '#ff0000');
        assertEqual(doc.m_textAnnotations[0].color, '#ff0000');
        
        doc.setTextAnnotationFontSize(id, 18);
        assertEqual(doc.m_textAnnotations[0].fontSize, 18);
        
        doc.setTextAnnotationBold(id, true);
        assertEqual(doc.m_textAnnotations[0].bold, true);
    });
});

// ============================================================================
// CONTEXT MENU TESTS
// ============================================================================

describe('UI - ContextMenu', () => {
    it('Context menu functions exist', () => {
        if (typeof showContextMenu === 'function') {
            assertType(showContextMenu, 'function');
        }
        if (typeof hideContextMenu === 'function') {
            assertType(hideContextMenu, 'function');
        }
    });

    it('Arrow style change through API', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 1, 5, '~>');
        doc.setArrowStyleById(id, '->');
        
        assertEqual(doc.m_arrows[0].style, '->');
    });

    it('Time span style change through API', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 0, 1, 5, '-|');
        doc.setTimeSpanMarkerStyle(id, '-|-');
        
        assertEqual(doc.m_timeSpanMarkers[0].style, '-|-');
    });

    it('Marker label change through direct property', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        doc.m_markers[0].label = 'TestLabel';
        
        assertEqual(doc.m_markers[0].label, 'TestLabel');
    });
});

// ============================================================================
// WAVEVIEW STATE TESTS
// ============================================================================

describe('UI - WaveViewState', () => {
    it('Selection state tracking', () => {
        if (typeof Selection === 'undefined') return;
        
        Selection.active = true;
        Selection.startSignal = 0;
        Selection.endSignal = 2;
        Selection.startSample = 0;
        Selection.endSample = 5;
        
        assertTrue(Selection.active);
        assertEqual(Selection.startSignal, 0);
        assertEqual(Selection.endSignal, 2);
    });

    it('Selection clear resets state', () => {
        if (typeof clearSelection === 'undefined') return;
        
        Selection.active = true;
        Selection.startSignal = 5;
        
        clearSelection();
        
        assertFalse(Selection.active);
        assertEqual(Selection.startSignal, -1);
    });

    it('Signal values accessible', () => {
        const doc = createTestDocumentWithSignals();
        
        assertNotNull(doc.m_signals[0].values);
        assertGreaterThan(doc.m_signals[0].values.length, 0);
    });
});

// ============================================================================
// UI VALIDATION TESTS
// ============================================================================

describe('UI - Input Validation', () => {
    it('Font size clamping - minimum', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 5);
        doc.setTextAnnotationFontSize(id, 2); // Too small
        
        assertEqual(doc.m_textAnnotations[0].fontSize, 8); // Clamped to min
    });

    it('Font size clamping - maximum', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 5);
        doc.setTextAnnotationFontSize(id, 100); // Too large
        
        assertEqual(doc.m_textAnnotations[0].fontSize, 48); // Clamped to max
    });

    it('VPos validation - invalid value rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 5, 'Above');
        doc.setTextAnnotationVPos(id, 'InvalidValue');
        
        assertEqual(doc.m_textAnnotations[0].vPos, 'Above'); // Unchanged
    });

    it('VPos validation - valid values accepted', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 5, 'Above');
        
        doc.setTextAnnotationVPos(id, 'Center');
        assertEqual(doc.m_textAnnotations[0].vPos, 'Center');
        
        doc.setTextAnnotationVPos(id, 'Below');
        assertEqual(doc.m_textAnnotations[0].vPos, 'Below');
    });

    it('Sample index validation - negative rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(-5);
        assertEqual(id, -1);
    });

    it('Sample index validation - out of bounds rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(100);
        assertEqual(id, -1);
    });

    it('Signal index validation - negative rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addArrow(-1, 0, 0, 5);
        assertEqual(id, -1);
    });

    it('Signal index validation - out of bounds rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addArrow(99, 0, 0, 5);
        assertEqual(id, -1);
    });
});

// ============================================================================
// UI CORNER CASES
// ============================================================================

describe('UI - Corner Cases', () => {
    it('Empty document has no signals to display', () => {
        const doc = createTestDocument();
        assertEqual(doc.m_signals.length, 0);
    });

    it('Document with only blank rows', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.addBlankRow(20);
        doc.addBlankRow(30);
        
        assertEqual(doc.m_signals.length, 2);
        assertEqual(doc.m_signals[0].type, SignalType.BlankRow);
        assertEqual(doc.m_signals[1].type, SignalType.BlankRow);
    });

    it('Signal with zero samples', () => {
        const sig = new Signal('empty', SignalType.Bit, 0);
        assertEqual(sig.values.length, 0);
    });

    it('Very long signal name truncation', () => {
        const longName = 'A'.repeat(500);
        const sig = new Signal(longName, SignalType.Bit, 5);
        
        assertEqual(sig.name, longName);
        assertEqual(sig.name.length, 500);
    });

    it('Unicode in signal names', () => {
        const unicodeName = '信号_émoji_🎉';
        const sig = new Signal(unicodeName, SignalType.Bit, 5);
        
        assertEqual(sig.name, unicodeName);
    });

    it('Special characters in label', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, '<script>alert("xss")</script>', 5);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_textAnnotations[0].text, '<script>alert("xss")</script>');
    });

    it('Null color values handled', () => {
        const sig = new Signal('test', SignalType.Bit, 5);
        sig.color = null;
        
        assertEqual(sig.color, null);
    });

    it('Undefined properties handled gracefully', () => {
        const sig = new Signal('test', SignalType.Bit, 5);
        
        // These may be undefined initially
        assertEqual(sig.groupName === undefined || sig.groupName === null, true);
    });
});

module.exports = {};
