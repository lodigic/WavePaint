#!/usr/bin/env node
/**
 * Marker Tests for WavePaint
 * Tests marker creation, validation, and manipulation
 */

const {
    describe, it,
    assertEqual, assertGreaterThan, assertLessThan
} = require('../testFramework.cjs');

const { createTestDocument } = require('../mocks.cjs');

// ============================================================================
// MARKER TESTS
// ============================================================================

describe('Markers', () => {
    it('Add marker', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        assertGreaterThan(id, 0, 'Marker id should be positive');
        assertEqual(doc.m_markers.length, 1);
        assertEqual(doc.m_markers[0].position, 5);
    });

    it('Add multiple markers', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        doc.addMarker(1);
        doc.addMarker(3);
        doc.addMarker(7);
        assertEqual(doc.m_markers.length, 3);
    });

    it('Remove marker by id', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        assertEqual(doc.m_markers.length, 1);
        doc.subMarkerById(id);
        assertEqual(doc.m_markers.length, 0);
    });

    it('Remove non-existent marker', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.addMarker(5);
        
        // Should not throw, just do nothing
        doc.subMarkerById(99999);
        assertEqual(doc.m_markers.length, 1);
    });

    it('Marker invalid sample - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(-5);
        assertLessThan(id, 1, 'Should reject negative sample');
    });

    it('Marker invalid sample - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(100);
        assertLessThan(id, 1, 'Should reject out of bounds sample');
    });

    it('Marker at boundary - first sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(0);
        assertGreaterThan(id, 0, 'Should allow marker at sample 0');
    });

    it('Marker at boundary - last sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(9);
        assertGreaterThan(id, 0, 'Should allow marker at last sample');
    });

    it('Marker color setting', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        doc.setMarkerColorById(id, '#00ff00');
        assertEqual(doc.m_markers[0].color, '#00ff00');
    });

    it('Marker label setting', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        // Set label directly on marker object since no setMarkerLabelById exists
        doc.m_markers[0].label = 'Test Label';
        assertEqual(doc.m_markers[0].label, 'Test Label');
    });

    it('Marker position change', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        doc.setMarkerPosition(id, 8);
        assertEqual(doc.m_markers[0].position, 8);
    });

    it('Marker position change - out of bounds rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        doc.setMarkerPosition(id, 100);
        assertEqual(doc.m_markers[0].position, 5, 'Position should not change');
    });

    it('Clear all markers', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        doc.addMarker(1);
        doc.addMarker(3);
        doc.addMarker(7);
        assertEqual(doc.m_markers.length, 3);
        
        doc.clearMarkers();
        assertEqual(doc.m_markers.length, 0);
    });

    it('Marker list access', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        doc.addMarker(2);
        doc.addMarker(6);
        
        const list = doc.markerList();
        assertEqual(list.length, 2);
    });

    it('Multiple markers at same sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id1 = doc.addMarker(5);
        const id2 = doc.addMarker(5);
        
        // Both should be valid and independent
        assertGreaterThan(id1, 0);
        assertGreaterThan(id2, 0);
        assertEqual(doc.m_markers.length, 2);
    });

    it('Marker with empty label', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        doc.m_markers[0].label = '';
        assertEqual(doc.m_markers[0].label, '');
    });

    it('Marker with very long label', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addMarker(5);
        const longLabel = 'A'.repeat(1000);
        doc.m_markers[0].label = longLabel;
        assertEqual(doc.m_markers[0].label, longLabel);
    });

    it('Marker unique IDs', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const ids = [];
        for (let i = 0; i < 10; i++) {
            ids.push(doc.addMarker(i));
        }
        
        const uniqueIds = new Set(ids);
        assertEqual(uniqueIds.size, ids.length, 'All IDs should be unique');
    });
});

module.exports = {};
