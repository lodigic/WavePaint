#!/usr/bin/env node
/**
 * Debug script for WaveDrom round-trip testing
 */

// Mock window and DOM environment
global.window = global;
global.document = {
    createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }),
    body: { appendChild: () => {} }
};

// Signal types
global.SignalType = {
    Bit: 0,
    Vector: 1,
    BlankRow: 2
};

// Signal class
class Signal {
    constructor(name, type, samples) {
        this.name = name;
        this.type = type;
        this.values = new Array(samples).fill(-1);
        this.labels = new Array(samples).fill('');
        this.waveDromChars = new Array(samples).fill(null);
        this.segmentStyles = [];
        for (let i = 0; i < samples; i++) {
            this.segmentStyles.push({});
        }
    }
}
global.Signal = Signal;

// WaveDocument class
class WaveDocument {
    constructor() {
        this.m_sampleCount = 1;
        this.m_subStepCount = 0;
        this.m_signals = [];
        this.m_arrows = [];
        this.m_markers = [];
        this.m_timeJumps = [];
        this.m_timeSpanMarkers = [];
        this.m_textAnnotations = [];
        this.m_nextArrowId = 1;
        this.m_nextMarkerId = 1;
        this.m_nextTimeSpanMarkerId = 1;
        this.m_nextTimeJumpId = 1;
        this.m_nextTextAnnotationId = 1;
    }
    
    effectiveSampleCount() {
        return this.m_sampleCount * (this.m_subStepCount + 1);
    }
    
    timeJumpList() {
        return this.m_timeJumps;
    }
}
global.WaveDocument = WaveDocument;

// Load modules
const fs = require('fs');
const path = require('path');

const importPath = path.join(__dirname, '../../io/wavedrom/WaveDromImport.js');
const importCode = fs.readFileSync(importPath, 'utf-8');
eval(importCode);

const utilsPath = path.join(__dirname, '../../io/wavedrom/WaveDromUtils.js');
const utilsCode = fs.readFileSync(utilsPath, 'utf-8');
eval(utilsCode);

const exportPath = path.join(__dirname, '../../io/wavedrom/WaveDromExport.js');
const exportCode = fs.readFileSync(exportPath, 'utf-8');
eval(exportCode);

// Test the I2C case directly
console.log("\n=== Testing I2C Export (from native .wp values) ===\n");

// Simulate a document like the I2C .wp file
const doc = new WaveDocument();
doc.m_sampleCount = 13;
doc.m_subStepCount = 1;
doc.m_nextTimeJumpId = 1;

// SCL signal with clock pattern after initial static values
// Time jump at position 20-21 (step 10)
// With new model: time jump is in m_timeJumps, values continue the previous clock pattern
const sclSignal = new Signal('SCL', 0, 26);
sclSignal.riseTime = 0;
sclSignal.fallTime = 0;
// Position 20-21 has time jump, but values continue the clock pattern (would be 1,0 like other clock steps)
sclSignal.values = [1,1, 1,1, 0,0, 1,0, 1,0, 1,0, 1,0, 1,0, 1,0, 1,0, 1,0, 1,0, 1,1];

// Add time jump at position 20 (step 10)
doc.m_timeJumps.push({
    id: doc.m_nextTimeJumpId++,
    sample: 20,
    color: null
});

doc.m_signals.push(sclSignal);

// Export
const exported = window.WaveDromExport.exportToWaveDrom(doc);
console.log("SCL wave:", exported.signal[0].wave);
console.log("Expected: 1.0p......|p1");
console.log("");

// Test Time Jump specifically
console.log("=== Testing Time Jump Import/Export ===\n");

const timeJumpTest = {
    signal: [
        { name: "clk", wave: "p.....|..." },
        { name: "Data", wave: "x.345x|=.x", data: ["head", "body", "tail", "data"] },
        { name: "Request", wave: "0.1..0|1.0" }
    ]
};

const tjDoc = new WaveDocument();
window.WaveDromImport.importFromWaveDrom(tjDoc, timeJumpTest);
const tjExported = window.WaveDromExport.exportToWaveDrom(tjDoc);

console.log("Original clk:    ", timeJumpTest.signal[0].wave);
console.log("Exported clk:    ", tjExported.signal[0].wave);
console.log("Match:           ", timeJumpTest.signal[0].wave === tjExported.signal[0].wave ? "✓" : "✗");
console.log("");
console.log("Original Data:   ", timeJumpTest.signal[1].wave);
console.log("Exported Data:   ", tjExported.signal[1].wave);
console.log("Match:           ", timeJumpTest.signal[1].wave === tjExported.signal[1].wave ? "✓" : "✗");
console.log("");
console.log("Original Request:", timeJumpTest.signal[2].wave);
console.log("Exported Request:", tjExported.signal[2].wave);
console.log("Match:           ", timeJumpTest.signal[2].wave === tjExported.signal[2].wave ? "✓" : "✗");
console.log("");

// Now run normal tests
console.log("=== WaveDrom Round-Trip Tests ===\n");

// Load test samples
const samplesDir = path.join(__dirname, 'wavedrom_samples');
const sampleFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'));

let passed = 0;
let failed = 0;

function flattenSignals(signals) {
    const flat = [];
    for (const item of signals) {
        if (Array.isArray(item)) {
            // Group - skip the first element if it's a string (group name)
            const start = typeof item[0] === 'string' ? 1 : 0;
            for (let i = start; i < item.length; i++) {
                if (typeof item[i] === 'object' && item[i] !== null) {
                    flat.push(item[i]);
                }
            }
        } else if (typeof item === 'object' && item !== null) {
            flat.push(item);
        }
    }
    return flat;
}

sampleFiles.forEach(file => {
    const filePath = path.join(samplesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const wavedrom = JSON.parse(content);
    
    const doc = new WaveDocument();
    window.WaveDromImport.importFromWaveDrom(doc, wavedrom);
    const exported = window.WaveDromExport.exportToWaveDrom(doc);
    
    const origSignals = flattenSignals(wavedrom.signal);
    const expSignals = flattenSignals(exported.signal);
    
    let match = true;
    const mismatches = [];
    
    if (origSignals.length !== expSignals.length) {
        match = false;
        mismatches.push(`Signal count mismatch: ${origSignals.length} vs ${expSignals.length}`);
    } else {
        for (let i = 0; i < origSignals.length; i++) {
            const origWave = origSignals[i].wave || '';
            const expWave = expSignals[i].wave || '';
            if (origWave !== expWave) {
                match = false;
                mismatches.push(`Signal ${i} "${origSignals[i].name}": "${origWave}" vs "${expWave}"`);
            }
        }
    }
    
    const testName = file.replace('.json', '');
    if (match) {
        console.log(`✓ ${testName}`);
        passed++;
    } else {
        console.log(`✗ ${testName}`);
        mismatches.forEach(m => console.log(`    ${m}`));
        failed++;
    }
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===\n`);

// Test that time jumps are added to m_timeJumps
console.log("\n=== Testing Time Jump m_timeJumps Creation ===\n");

const timeJumpWave2 = {
    signal: [
        { name: 'clk', wave: 'p..|.p.' },
        { name: 'data', wave: '01.|.10' }
    ]
};

const tjDoc2 = new WaveDocument();
window.WaveDromImport.importFromWaveDrom(tjDoc2, timeJumpWave2);

console.log(`Time jumps in m_timeJumps: ${JSON.stringify(tjDoc2.m_timeJumps)}`);
console.log(`Expected: 1 time jump at position 6 (step 3 * 2 internal positions)`);

if (tjDoc2.m_timeJumps.length === 1 && tjDoc2.m_timeJumps[0].sample === 6) {
    console.log("✓ Time jump correctly added to m_timeJumps");
} else {
    console.log("✗ Time jump NOT correctly added to m_timeJumps");
    console.log(`  Got ${tjDoc2.m_timeJumps.length} time jumps`);
    if (tjDoc2.m_timeJumps[0]) {
        console.log(`  First time jump at sample: ${tjDoc2.m_timeJumps[0].sample}`);
    }
}
