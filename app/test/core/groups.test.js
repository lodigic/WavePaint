#!/usr/bin/env node
/**
 * Groups Tests for WavePaint
 * Tests signal group creation, nesting, and manipulation
 */

const {
    describe, it,
    assertEqual, assertDeepEqual, assertGreaterThan, assertNotNull
} = require('../testFramework');

const { createTestDocument } = require('../mocks');

// ============================================================================
// GROUPS TESTS
// ============================================================================

describe('Groups - SignalGroup Class', () => {
    it('SignalGroup class instantiation', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'TestGroup', [0, 1, 2]);
        assertEqual(group.id, 1);
        assertEqual(group.name, 'TestGroup');
        assertDeepEqual(group.signalIndices, [0, 1, 2]);
        assertEqual(group.collapsed, false);
    });

    it('SignalGroup start/end index', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'G', [2, 5, 3, 8]);
        assertEqual(group.startIndex, 2);
        assertEqual(group.endIndex, 8);
    });

    it('SignalGroup empty indices', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'Empty', []);
        assertEqual(group.startIndex, -1);
        assertEqual(group.endIndex, -1);
    });

    it('SignalGroup nested depth', () => {
        if (typeof SignalGroup === 'undefined') return;
        const parent = new SignalGroup(1, 'Parent', [0, 1, 2], null, 0);
        const child = new SignalGroup(2, 'Child', [1, 2], 1, 1);
        assertEqual(parent.depth, 0);
        assertEqual(child.depth, 1);
        assertEqual(child.parentId, 1);
    });

    it('SignalGroup single signal', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'Single', [5]);
        assertEqual(group.startIndex, 5);
        assertEqual(group.endIndex, 5);
    });

    it('SignalGroup collapsed state', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'G', [0, 1]);
        assertEqual(group.collapsed, false);
        group.collapsed = true;
        assertEqual(group.collapsed, true);
    });

    it('SignalGroup color property', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'G', [0, 1]);
        group.color = '#ff0000';
        assertEqual(group.color, '#ff0000');
    });
});

describe('Groups - Document Integration', () => {
    it('getGroupsContainingSignal helper', () => {
        if (typeof getGroupsContainingSignal !== 'function') return;
        const doc = createTestDocument();
        doc.m_signalGroups = [
            new SignalGroup(1, 'G1', [0, 1, 2]),
            new SignalGroup(2, 'G2', [3, 4])
        ];
        const groups = getGroupsContainingSignal(doc, 1);
        assertEqual(groups.length, 1);
        assertEqual(groups[0].name, 'G1');
    });

    it('getGroupsContainingSignal - signal in no groups', () => {
        if (typeof getGroupsContainingSignal !== 'function') return;
        const doc = createTestDocument();
        doc.m_signalGroups = [
            new SignalGroup(1, 'G1', [0, 1, 2])
        ];
        const groups = getGroupsContainingSignal(doc, 5);
        assertEqual(groups.length, 0);
    });

    it('getGroupsContainingSignal - signal in multiple groups', () => {
        if (typeof getGroupsContainingSignal !== 'function') return;
        const doc = createTestDocument();
        doc.m_signalGroups = [
            new SignalGroup(1, 'Parent', [0, 1, 2, 3]),
            new SignalGroup(2, 'Child', [1, 2], 1, 1)
        ];
        const groups = getGroupsContainingSignal(doc, 1);
        assertEqual(groups.length, 2);
    });

    it('Group bracket constants exist', () => {
        if (typeof GROUP_VISUAL === 'undefined') return;
        assertGreaterThan(GROUP_VISUAL.bracketWidth, 0);
        assertGreaterThan(GROUP_VISUAL.lineWidth, 0);
        assertNotNull(GROUP_VISUAL.defaultColor);
    });

    it('Document m_signalGroups initialization', () => {
        const doc = createTestDocument();
        assertNotNull(doc.m_signalGroups);
        assertEqual(Array.isArray(doc.m_signalGroups), true);
    });

    it('Add group to document', () => {
        if (typeof SignalGroup === 'undefined') return;
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const group = new SignalGroup(1, 'TestGroup', [0, 1]);
        doc.m_signalGroups.push(group);
        
        assertEqual(doc.m_signalGroups.length, 1);
        assertEqual(doc.m_signalGroups[0].name, 'TestGroup');
    });

    it('Nested groups hierarchy', () => {
        if (typeof SignalGroup === 'undefined') return;
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        for (let i = 0; i < 5; i++) {
            doc.m_signals.push(new Signal(`sig${i}`, SignalType.Bit, 10));
        }
        
        const parent = new SignalGroup(1, 'Parent', [0, 1, 2, 3, 4], null, 0);
        const child1 = new SignalGroup(2, 'Child1', [0, 1], 1, 1);
        const child2 = new SignalGroup(3, 'Child2', [2, 3, 4], 1, 1);
        
        doc.m_signalGroups.push(parent);
        doc.m_signalGroups.push(child1);
        doc.m_signalGroups.push(child2);
        
        assertEqual(doc.m_signalGroups.length, 3);
        
        // Verify parent-child relationships
        assertEqual(child1.parentId, 1);
        assertEqual(child2.parentId, 1);
        assertEqual(parent.parentId, null);
    });

    it('Group toggle collapse', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'G', [0, 1, 2]);
        assertEqual(group.collapsed, false);
        
        group.collapsed = !group.collapsed;
        assertEqual(group.collapsed, true);
        
        group.collapsed = !group.collapsed;
        assertEqual(group.collapsed, false);
    });

    it('Group with non-contiguous indices', () => {
        if (typeof SignalGroup === 'undefined') return;
        const group = new SignalGroup(1, 'Sparse', [0, 3, 7, 10]);
        assertEqual(group.startIndex, 0);
        assertEqual(group.endIndex, 10);
    });
});

module.exports = {};
