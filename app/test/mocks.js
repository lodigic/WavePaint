#!/usr/bin/env node
/**
 * Mock environment for WavePaint tests
 * Provides mock DOM, window, and loads core modules
 */

const fs = require('fs');
const path = require('path');

// Mock console to suppress debug output during tests (unless --debug flag)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const debugMode = process.argv.includes('--debug');

if (!debugMode) {
    // Suppress console.log except for our test output
    console.log = (...args) => {
        // Check if it's debug output from loaded modules (contains common patterns)
        const msg = args.join(' ');
        if (msg.includes('[invalidateWaveDromPreservedData]') ||
            msg.includes('[moveSignal]') ||
            msg.includes('WaveDromIO:') ||
            msg.includes('Loading WaveDromConstants') ||
            msg.includes('Error loading file:') ||
            msg.includes('Failed to parse WaveDrom')) {
            return; // Suppress
        }
        originalConsoleLog.apply(console, args);
    };
    
    // Also suppress console.error for expected error messages during tests
    console.error = (...args) => {
        const msg = args.join(' ');
        if (msg.includes('Error loading file:') ||
            msg.includes('Failed to parse') ||
            msg.includes('is not valid JSON')) {
            return; // Suppress expected errors during tests
        }
        originalConsoleError.apply(console, args);
    };
}

// ============================================================================
// MOCK DOM ENVIRONMENT
// ============================================================================

// Mock window object
global.window = global;

// Mock document
global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                getContext: () => ({
                    measureText: (text) => ({ width: text.length * 8 }),
                    fillText: () => {},
                    strokeText: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {},
                    fill: () => {},
                    arc: () => {},
                    bezierCurveTo: () => {},
                    quadraticCurveTo: () => {},
                    closePath: () => {},
                    save: () => {},
                    restore: () => {},
                    translate: () => {},
                    scale: () => {},
                    rotate: () => {},
                    clearRect: () => {},
                    fillRect: () => {},
                    strokeRect: () => {},
                    setLineDash: () => {},
                    getLineDash: () => [],
                    strokeStyle: '#000000',
                    fillStyle: '#000000',
                    lineWidth: 1,
                    font: '12px sans-serif'
                }),
                width: 800,
                height: 600,
                style: {},
                toDataURL: () => 'data:image/png;base64,mock'
            };
        }
        return {
            style: {},
            appendChild: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {},
                contains: () => false
            }
        };
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body: {
        appendChild: () => {},
        removeChild: () => {}
    },
    head: {
        appendChild: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};

// Mock localStorage
global.localStorage = {
    _data: {},
    getItem: function(key) { return this._data[key] || null; },
    setItem: function(key, value) { this._data[key] = String(value); },
    removeItem: function(key) { delete this._data[key]; },
    clear: function() { this._data = {}; }
};

// Mock console methods if needed (preserve for test output)
// global.console is already available in Node.js

// ============================================================================
// LOAD CORE MODULES
// ============================================================================

const APP_DIR = path.join(__dirname, '..');

/**
 * Load a JS file and eval it in global context
 * We wrap the eval to capture function declarations and make them global
 */
function loadModule(relativePath) {
    const fullPath = path.join(APP_DIR, relativePath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: Module not found: ${relativePath}`);
        return false;
    }
    try {
        let code = fs.readFileSync(fullPath, 'utf-8');
        
        // Convert function declarations to global assignments
        // This handles: function foo() { ... }
        code = code.replace(/^function\s+(\w+)\s*\(/gm, 'global.$1 = function $1(');
        
        // Handle async functions: async function foo() { ... }
        code = code.replace(/^async\s+function\s+(\w+)\s*\(/gm, 'global.$1 = async function $1(');
        
        // Handle const/let/var at the start of line for objects/classes
        code = code.replace(/^(const|let|var)\s+(\w+)\s*=/gm, 'global.$2 =');
        
        // Handle class declarations
        code = code.replace(/^class\s+(\w+)/gm, 'global.$1 = class $1');
        
        // Wrap eval in a try-catch to capture errors
        eval(code);
        return true;
    } catch (e) {
        console.error(`Error loading ${relativePath}: ${e.message}`);
        if (process.argv.includes('--debug')) {
            console.error(e.stack);
        }
        return false;
    }
}

/**
 * Load all core modules
 */
function loadCoreModules() {
    const modules = [
        'core/core.js',
        'core/Signals.js',
        'core/Arrows.js',
        'core/Markers.js',
        'core/Groups.js',
        'core/Selection.js',
        'core/UndoRedo.js',
        'core/TextAnnotations.js',
        'core/TimeSpanMarkers.js',
        'core/Cut.js',
        'core/SignalTypes.js'
    ];

    let loaded = 0;
    for (const mod of modules) {
        if (loadModule(mod)) {
            loaded++;
        }
    }
    
    // Make core classes available globally (they should already be, but ensure it)
    if (typeof WaveDocument !== 'undefined') global.WaveDocument = WaveDocument;
    if (typeof Signal !== 'undefined') global.Signal = Signal;
    if (typeof SignalType !== 'undefined') global.SignalType = SignalType;
    if (typeof Radix !== 'undefined') global.Radix = Radix;
    if (typeof SegmentStyle !== 'undefined') global.SegmentStyle = SegmentStyle;
    if (typeof Marker !== 'undefined') global.Marker = Marker;
    if (typeof TimeJump !== 'undefined') global.TimeJump = TimeJump;
    if (typeof TimeSpanMarker !== 'undefined') global.TimeSpanMarker = TimeSpanMarker;
    if (typeof SignalGroup !== 'undefined') global.SignalGroup = SignalGroup;
    if (typeof Selection !== 'undefined') global.Selection = Selection;
    if (typeof DriveStrength !== 'undefined') global.DriveStrength = DriveStrength;
    
    // Note: clockMarkers is part of Signal, no separate enum needed
    
    return loaded;
}

/**
 * Load IO modules
 */
function loadIOModules() {
    const modules = [
        'io/JsonIO.js',
        'io/TxtCsvIO.js',
        'io/wavedrom/WaveDromConstants.js',
        'io/wavedrom/WaveDromUtils.js',
        'io/wavedrom/WaveDromImport.js',
        'io/wavedrom/WaveDromExport.js',
        'io/wavedrom/WaveDromIO.js',
        'io/export/ExportSVG.js'
    ];

    let loaded = 0;
    for (const mod of modules) {
        if (loadModule(mod)) {
            loaded++;
        }
    }
    
    // Make IO functions available globally
    if (typeof saveToFile !== 'undefined') global.saveToFile = saveToFile;
    if (typeof loadFromFileContent !== 'undefined') global.loadFromFileContent = loadFromFileContent;
    if (typeof getSignalDisplayValue !== 'undefined') global.getSignalDisplayValue = getSignalDisplayValue;
    if (typeof saveAsTxt !== 'undefined') global.saveAsTxt = saveAsTxt;
    if (typeof saveAsCsv !== 'undefined') global.saveAsCsv = saveAsCsv;
    if (typeof escapeCSV !== 'undefined') global.escapeCSV = escapeCSV;
    
    // WaveDrom functions
    if (typeof WaveDromIO !== 'undefined') {
        global.WaveDromIO = WaveDromIO;
        global.exportToWaveDrom = WaveDromIO.exportToWaveDrom;
        global.exportToWaveDromString = WaveDromIO.exportToWaveDromString;
        global.importFromWaveDrom = WaveDromIO.importFromWaveDrom;
        global.parseWaveDromCode = WaveDromIO.parseWaveDromCode;
        global.generateWaveDromPreview = WaveDromIO.generateWaveDromPreview;
    }
    
    // Also directly exported functions
    if (typeof exportToWaveDrom !== 'undefined') global.exportToWaveDrom = exportToWaveDrom;
    if (typeof exportToWaveDromString !== 'undefined') global.exportToWaveDromString = exportToWaveDromString;
    if (typeof importFromWaveDrom !== 'undefined') global.importFromWaveDrom = importFromWaveDrom;
    if (typeof parseWaveDromCode !== 'undefined') global.parseWaveDromCode = parseWaveDromCode;
    if (typeof WAVEDROM_COLORS !== 'undefined') global.WAVEDROM_COLORS = WAVEDROM_COLORS;
    if (typeof WaveValue !== 'undefined') global.WaveValue = WaveValue;
    
    // From WaveDromConstants if available
    if (typeof WaveDromConstants !== 'undefined') {
        global.WAVEDROM_COLORS = WaveDromConstants.WAVEDROM_COLORS;
        global.WaveValue = WaveDromConstants.WaveValue;
    }
    
    // SVG Export
    if (typeof SVGContext !== 'undefined') global.SVGContext = SVGContext;
    if (typeof exportToSVG !== 'undefined') global.exportToSVG = exportToSVG;
    
    return loaded;
}

/**
 * Load UI modules (if available, some may require browser)
 */
function loadUIModules() {
    const modules = [
        'ui/Skins.js',
        'ui/waveview/WaveViewConstants.js',
        'ui/waveview/WaveViewTheme.js'
    ];

    let loaded = 0;
    for (const mod of modules) {
        if (loadModule(mod)) {
            loaded++;
        }
    }
    return loaded;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a test WaveDocument with signals
 */
function createTestDocument(sampleCount = 10) {
    const doc = new WaveDocument();
    doc.m_sampleCount = sampleCount;
    doc.m_subStepCount = 0;
    doc.m_signals = [];
    doc.m_markers = [];
    doc.m_arrows = [];
    doc.m_timeJumps = [];
    doc.m_timeSpanMarkers = [];
    doc.m_textAnnotations = [];
    doc.m_signalGroups = [];
    doc.m_nextArrowId = 1;
    doc.m_nextMarkerId = 1;
    doc.m_nextTimeJumpId = 1;
    doc.m_nextTimeSpanMarkerId = 1;
    doc.m_nextTextAnnotationId = 1;
    doc.m_nextSignalGroupId = 1;
    doc.dataChanged = () => {};
    doc.pushUndoSnapshot = function() {
        // Simple undo implementation for tests
        if (!this.m_undoStack) this.m_undoStack = [];
        this.m_undoStack.push(JSON.stringify({
            signals: this.m_signals,
            markers: this.m_markers,
            arrows: this.m_arrows
        }));
    };
    
    return doc;
}

/**
 * Create a test document with sample signals
 */
function createTestDocumentWithSignals() {
    const doc = createTestDocument(10);
    
    // Add a clock signal
    const clk = new Signal('CLK', SignalType.Bit, 10);
    clk.values = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    clk.color = '#00ff00';
    doc.m_signals.push(clk);
    
    // Add a vector signal
    const data = new Signal('DATA', SignalType.Vector, 10);
    data.values = [0, 1, 2, 3, 255, 128, 64, 32, 16, 8];
    data.labels = ['0x00', '0x01', '0x02', '0x03', '0xFF', '0x80', '0x40', '0x20', '0x10', '0x08'];
    data.color = '#ff0000';
    doc.m_signals.push(data);
    
    // Add a blank row
    const blank = new Signal('---', SignalType.BlankRow, 10);
    doc.m_signals.push(blank);
    
    // Add another bit signal
    const reset = new Signal('RESET', SignalType.Bit, 10);
    reset.values = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    doc.m_signals.push(reset);
    
    return doc;
}

/**
 * Create a simple document for basic tests
 */
function createSimpleDocument() {
    const doc = createTestDocument(5);
    
    const sig = new Signal('TEST', SignalType.Bit, 5);
    sig.values = [0, 1, 0, 1, 0];
    doc.m_signals.push(sig);
    
    return doc;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    loadModule,
    loadCoreModules,
    loadIOModules,
    loadUIModules,
    createTestDocument,
    createTestDocumentWithSignals,
    createSimpleDocument,
    APP_DIR
};
