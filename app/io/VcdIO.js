// VcdIO.js - VCD (Value Change Dump) file import/export for WavePaint Web

/**
 * @brief VCD file importer/exporter
 * 
 * Provides efficient parsing of VCD files with:
 * - Memory-efficient streaming-like parsing
 * - Progress reporting for UI integration
 * - Configurable size limits for web safety
 * - Export capability to generate VCD from signals
 */
const VcdIO = (function() {
    'use strict';

    // Constants
    const UNDEFINED_VALUE = -1;
    
    // Configuration limits for web
    const CONFIG = {
        maxFileSizeMB: 10,           // Maximum file size in MB
        maxSamples: 100000,          // Maximum number of time samples
        maxSignals: 500,             // Maximum number of signals
        progressUpdateInterval: 50   // Progress update interval in ms
    };

    // Last error message
    let lastError = '';

    /**
     * @brief Get the last error message
     * @return {string} Error message or empty string
     */
    function getLastError() {
        return lastError;
    }

    /**
     * @brief Parse a binary value string to integer
     * @param {string} bits - Binary string (may contain x/z)
     * @param {number} width - Signal width
     * @return {Object} { value: number, label: string }
     */
    function parseBinaryValue(bits, width) {
        // Check for undefined values
        if (bits.includes('x') || bits.includes('X') || 
            bits.includes('z') || bits.includes('Z')) {
            return { value: UNDEFINED_VALUE, label: 'X' };
        }
        
        // For very wide signals (> 32 bits), just show width
        if (bits.length > 32) {
            try {
                const bigVal = BigInt('0b' + bits);
                return { 
                    value: 0, 
                    label: '0x' + bigVal.toString(16).toUpperCase() 
                };
            } catch {
                return { value: 0, label: `[${width}b]` };
            }
        }
        
        // Parse the binary value
        const value = parseInt(bits, 2);
        if (isNaN(value)) {
            return { value: UNDEFINED_VALUE, label: 'X' };
        }
        
        // Generate hex label for vectors (width > 1)
        const label = width > 1 
            ? '0x' + value.toString(16).toUpperCase() 
            : '';
        
        return { value, label };
    }

    /**
     * @brief Temporary signal structure for VCD parsing
     */
    class TmpSignal {
        constructor() {
            this.name = '';
            this.id = '';
            this.width = 1;
            this.type = SignalType.Bit;
            this.changes = []; // Array of { sampleIdx, value, label }
            this.lastValue = UNDEFINED_VALUE;
        }
    }

    /**
     * @brief Parse VCD file content
     * @param {string} content - VCD file content
     * @param {function} progressCallback - Progress callback (0-100)
     * @return {Object|null} Parsed data or null on error
     */
    function parseVcdContent(content, progressCallback) {
        const lines = content.split('\n');
        const totalLines = lines.length;
        
        const tmpSignals = [];
        const idToIndex = new Map();
        const scopeStack = [];
        
        let inHeader = true;
        let sampleIdx = -1;
        let maxSampleIdx = -1;
        
        let lastProgressUpdate = Date.now();
        
        for (let lineNum = 0; lineNum < totalLines; lineNum++) {
            // Progress reporting
            if (progressCallback && Date.now() - lastProgressUpdate > CONFIG.progressUpdateInterval) {
                lastProgressUpdate = Date.now();
                const progress = Math.floor((lineNum / totalLines) * 100);
                if (!progressCallback(progress)) {
                    lastError = 'Import cancelled by user';
                    return null;
                }
            }
            
            let line = lines[lineNum].trim();
            if (!line) continue;
            
            if (inHeader) {
                if (line.startsWith('$scope')) {
                    // Parse scope: $scope module name $end
                    const parts = line.split(/\s+/);
                    if (parts.length >= 3 && parts[2] !== '$end') {
                        scopeStack.push(parts[2]);
                    }
                } else if (line.startsWith('$upscope')) {
                    if (scopeStack.length > 0) {
                        scopeStack.pop();
                    }
                } else if (line.startsWith('$var')) {
                    // Parse variable: $var type width id name [array] $end
                    const parts = line.split(/\s+/);
                    if (parts.length >= 5) {
                        // Check signal limit
                        if (tmpSignals.length >= CONFIG.maxSignals) {
                            lastError = `Reached maximum signal limit (${CONFIG.maxSignals})`;
                            break;
                        }
                        
                        const width = parseInt(parts[2], 10) || 1;
                        const id = parts[3];
                        
                        // Build name (may contain spaces, ends at $end)
                        let name = '';
                        for (let i = 4; i < parts.length; i++) {
                            if (parts[i] === '$end') break;
                            if (name) name += ' ';
                            name += parts[i];
                        }
                        if (!name) name = id;
                        
                        // Build full hierarchical name
                        const fullName = scopeStack.length > 0 
                            ? scopeStack.join('.') + '.' + name 
                            : name;
                        
                        const tmp = new TmpSignal();
                        tmp.name = fullName;
                        tmp.id = id;
                        tmp.width = width;
                        tmp.type = width === 1 ? SignalType.Bit : SignalType.Vector;
                        
                        tmpSignals.push(tmp);
                        idToIndex.set(id, tmpSignals.length - 1);
                    }
                } else if (line.startsWith('$enddefinitions')) {
                    inHeader = false;
                }
                continue;
            }
            
            // Value change section
            const firstChar = line[0];
            
            if (firstChar === '#') {
                // Timestamp
                sampleIdx++;
                if (sampleIdx > maxSampleIdx) maxSampleIdx = sampleIdx;
                
                if (sampleIdx >= CONFIG.maxSamples) {
                    lastError = `Reached maximum sample limit (${CONFIG.maxSamples})`;
                    break;
                }
                continue;
            }
            
            if (firstChar === '$') {
                // VCD command (dumpvars, end, etc.)
                continue;
            }
            
            if (sampleIdx < 0) {
                // Value before first timestamp
                sampleIdx = 0;
                maxSampleIdx = Math.max(maxSampleIdx, sampleIdx);
            }
            
            if (firstChar === 'b' || firstChar === 'B') {
                // Vector value: b<bits> <id>
                const spacePos = line.indexOf(' ');
                if (spacePos < 2) continue;
                
                const bits = line.substring(1, spacePos);
                const id = line.substring(spacePos + 1).trim();
                
                const idx = idToIndex.get(id);
                if (idx === undefined) continue;
                
                const tmp = tmpSignals[idx];
                const { value, label } = parseBinaryValue(bits, tmp.width);
                
                // Only store if value changed
                if (tmp.changes.length === 0 || 
                    tmp.changes[tmp.changes.length - 1].value !== value) {
                    tmp.changes.push({ sampleIdx, value, label });
                }
                tmp.lastValue = value;
                
            } else if ('01xXzZ'.includes(firstChar)) {
                // Single-bit value: <value><id>
                const id = line.substring(1).trim();
                
                const idx = idToIndex.get(id);
                if (idx === undefined) continue;
                
                const tmp = tmpSignals[idx];
                
                let value;
                if ('xXzZ'.includes(firstChar)) {
                    value = UNDEFINED_VALUE;
                } else {
                    value = firstChar === '1' ? 1 : 0;
                }
                
                // Only store if value changed
                if (tmp.changes.length === 0 || 
                    tmp.changes[tmp.changes.length - 1].value !== value) {
                    tmp.changes.push({ sampleIdx, value, label: '' });
                }
                tmp.lastValue = value;
            }
        }
        
        if (maxSampleIdx < 0) {
            lastError = 'No valid timestamps found in VCD file';
            return null;
        }
        
        return {
            tmpSignals,
            sampleCount: maxSampleIdx + 1
        };
    }

    /**
     * @brief Expand sparse storage to full arrays
     * @param {Array} tmpSignals - Temporary signals with sparse changes
     * @param {number} sampleCount - Total sample count
     * @return {Array} Array of Signal objects
     */
    function expandSignals(tmpSignals, sampleCount) {
        const signals = [];
        
        for (const tmp of tmpSignals) {
            // Use short name (last part of hierarchy) for display
            const parts = tmp.name.split('.');
            const shortName = parts[parts.length - 1] || tmp.name;
            
            const s = new Signal(shortName, tmp.type, sampleCount);
            
            // Store full hierarchical name for reference
            s.fullName = tmp.name;
            
            // Expand sparse changes to full array
            let lastValue = UNDEFINED_VALUE;
            let lastLabel = '';
            let changeIdx = 0;
            
            for (let i = 0; i < sampleCount; i++) {
                // Apply changes at this sample
                while (changeIdx < tmp.changes.length && 
                       tmp.changes[changeIdx].sampleIdx === i) {
                    lastValue = tmp.changes[changeIdx].value;
                    lastLabel = tmp.changes[changeIdx].label;
                    changeIdx++;
                }
                
                s.values[i] = lastValue;
                
                // Set labels for vectors
                if (s.type === SignalType.Vector) {
                    if (lastLabel) {
                        s.labels[i] = lastLabel;
                    } else if (lastValue !== UNDEFINED_VALUE) {
                        s.labels[i] = '0x' + lastValue.toString(16).toUpperCase();
                    } else {
                        s.labels[i] = 'X';
                    }
                }
            }
            
            signals.push(s);
        }
        
        return signals;
    }

    /**
     * @brief Load a VCD file into a WaveDocument
     * @param {WaveDocument} doc - Target document
     * @param {function} progressCallback - Optional progress callback
     * @return {Promise<boolean>} True if import succeeded
     */
    async function loadFromVcd(doc, progressCallback) {
        lastError = '';
        
        try {
            // Use File System Access API if available
            let fileContent;
            let fileName;
            
            if (window.showOpenFilePicker) {
                try {
                    const [handle] = await window.showOpenFilePicker({
                        multiple: false,
                        types: [{
                            description: 'VCD files',
                            accept: { 'text/vcd': ['.vcd'] }
                        }]
                    });
                    
                    if (!handle) return false;
                    const file = await handle.getFile();
                    fileName = file.name;
                    
                    // Check file size
                    const sizeMB = file.size / (1024 * 1024);
                    if (sizeMB > CONFIG.maxFileSizeMB) {
                        lastError = `File too large: ${sizeMB.toFixed(1)}MB (max: ${CONFIG.maxFileSizeMB}MB)`;
                        return false;
                    }
                    
                    fileContent = await file.text();
                } catch (error) {
                    if (error.name === 'AbortError') return false;
                    throw error;
                }
            } else {
                // Fallback: input element
                const result = await new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.vcd';
                    input.style.display = 'none';
                    document.body.appendChild(input);
                    
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) {
                            document.body.removeChild(input);
                            resolve(null);
                            return;
                        }
                        
                        // Check file size
                        const sizeMB = file.size / (1024 * 1024);
                        if (sizeMB > CONFIG.maxFileSizeMB) {
                            lastError = `File too large: ${sizeMB.toFixed(1)}MB (max: ${CONFIG.maxFileSizeMB}MB)`;
                            document.body.removeChild(input);
                            resolve(null);
                            return;
                        }
                        
                        try {
                            const content = await file.text();
                            document.body.removeChild(input);
                            resolve({ content, name: file.name });
                        } catch (error) {
                            document.body.removeChild(input);
                            resolve(null);
                        }
                    };
                    
                    input.oncancel = () => {
                        if (input.parentNode) {
                            document.body.removeChild(input);
                        }
                        resolve(null);
                    };
                    
                    input.click();
                });
                
                if (!result) return false;
                fileContent = result.content;
                fileName = result.name;
            }
            
            // Parse VCD content
            const parsed = parseVcdContent(fileContent, progressCallback);
            if (!parsed) return false;
            
            // Expand signals
            const signals = expandSignals(parsed.tmpSignals, parsed.sampleCount);
            
            // Store in document
            doc.m_vcdSignals = signals;
            doc.m_sampleCount = parsed.sampleCount;
            
            // Notify of data change
            if (typeof doc.dataChanged === 'function') {
                doc.dataChanged();
            }
            
            return true;
            
        } catch (error) {
            console.error('Error importing VCD:', error);
            lastError = error.message || 'Unknown error';
            return false;
        }
    }

    /**
     * @brief Export signals to VCD format
     * @param {WaveDocument} doc - Source document
     * @param {string} fileName - Output file name
     * @return {Promise<boolean>} True if export succeeded
     */
    async function saveAsVcd(doc, fileName = 'waveform.vcd') {
        lastError = '';
        
        try {
            if (!doc) {
                lastError = 'No document provided';
                return false;
            }
            
            // Get signals to export - prefer main signals (user-created), then VCD signals
            let signals = doc.m_signals && doc.m_signals.length > 0 
                ? doc.m_signals 
                : (doc.m_vcdSignals || []);
            
            // Filter out blank rows and signals without values
            signals = signals.filter(s => 
                s && s.type !== SignalType.BlankRow && 
                s.values && s.values.length > 0
            );
            
            if (signals.length === 0) {
                lastError = 'No signals to export';
                return false;
            }
            
            // Use effective sample count (includes substeps)
            const effectiveCount = doc.effectiveSampleCount ? doc.effectiveSampleCount() : 
                                   (doc.m_sampleCount * (doc.m_subStepCount + 1));
            
            if (effectiveCount <= 0) {
                lastError = 'Invalid sample count';
                return false;
            }
            
            // Generate VCD content
            let vcd = '';
            
            // Header
            const now = new Date();
            vcd += `$date ${now.toISOString()} $end\n`;
            vcd += '$version WavePaint Web VCD Generator $end\n';
            vcd += '$timescale 1ns $end\n';
            vcd += '\n';
            
            // Define scope and variables
            vcd += '$scope module wavepaint $end\n';
            
            // Generate unique VCD identifiers (printable ASCII 33-126, excluding space)
            // VCD allows single or multi-character identifiers
            const generateVcdId = (index) => {
                const chars = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
                if (index < chars.length) {
                    return chars[index];
                }
                // For more signals, use two-character IDs
                const first = Math.floor(index / chars.length);
                const second = index % chars.length;
                return chars[first % chars.length] + chars[second];
            };
            
            // Assign IDs and write variable declarations
            const signalIds = new Map();
            let validSignalCount = 0;
            
            for (let i = 0; i < signals.length; i++) {
                const signal = signals[i];
                
                const vcdId = generateVcdId(validSignalCount);
                signalIds.set(i, vcdId);
                validSignalCount++;
                
                // Determine width - for vectors, try to estimate from max value
                let width = 1;
                if (signal.type === SignalType.Vector) {
                    // Find max value to determine minimum bit width
                    let maxVal = 0;
                    for (const v of signal.values) {
                        if (v !== UNDEFINED_VALUE && v > maxVal) {
                            maxVal = v;
                        }
                    }
                    // Calculate bits needed (minimum 1, max 32)
                    width = maxVal > 0 ? Math.min(32, Math.max(1, Math.ceil(Math.log2(maxVal + 1)))) : 8;
                }
                
                const varType = signal.type === SignalType.Vector ? 'reg' : 'wire';
                
                // Sanitize signal name for VCD (remove special chars, use underscore)
                let safeName = (signal.name || `signal_${i}`)
                    .replace(/[^a-zA-Z0-9_\[\]:]/g, '_')
                    .replace(/^[0-9]/, '_$&'); // Can't start with number
                
                if (!safeName) safeName = `sig_${i}`;
                
                vcd += `$var ${varType} ${width} ${vcdId} ${safeName} $end\n`;
            }
            
            vcd += '$upscope $end\n';
            vcd += '$enddefinitions $end\n';
            vcd += '\n';
            
            // Helper to format value for VCD
            const formatValue = (signal, value, signalIndex) => {
                const vcdId = signalIds.get(signalIndex);
                if (!vcdId) return '';
                
                if (signal.type === SignalType.Vector) {
                    if (value === UNDEFINED_VALUE || value === null || value === undefined) {
                        return `bx ${vcdId}\n`;
                    }
                    // Ensure value is a valid number
                    const numVal = typeof value === 'number' ? value : parseInt(value, 10);
                    if (isNaN(numVal)) {
                        return `bx ${vcdId}\n`;
                    }
                    return `b${(numVal >>> 0).toString(2)} ${vcdId}\n`;
                } else {
                    // Bit signal
                    if (value === UNDEFINED_VALUE || value === null || value === undefined) {
                        return `x${vcdId}\n`;
                    }
                    // Normalize to 0 or 1
                    const bitVal = value ? '1' : '0';
                    return `${bitVal}${vcdId}\n`;
                }
            };
            
            // Initial values at time 0
            vcd += '#0\n';
            vcd += '$dumpvars\n';
            for (let i = 0; i < signals.length; i++) {
                const signal = signals[i];
                const value = signal.values[0];
                vcd += formatValue(signal, value, i);
            }
            vcd += '$end\n';
            
            // Value changes for subsequent samples
            for (let sample = 1; sample < effectiveCount; sample++) {
                let changes = '';
                
                for (let i = 0; i < signals.length; i++) {
                    const signal = signals[i];
                    
                    // Bounds check
                    if (sample >= signal.values.length) continue;
                    
                    const currentValue = signal.values[sample];
                    const previousValue = signal.values[sample - 1];
                    
                    // Only output if value changed
                    if (currentValue !== previousValue) {
                        changes += formatValue(signal, currentValue, i);
                    }
                }
                
                // Only write timestamp if there are changes
                if (changes) {
                    vcd += `#${sample}\n`;
                    vcd += changes;
                }
            }
            
            // Final timestamp
            vcd += `#${effectiveCount}\n`;
            
            // Save file
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'VCD files',
                        accept: { 'text/vcd': ['.vcd'] }
                    }]
                });
                
                const writable = await handle.createWritable();
                await writable.write(vcd);
                await writable.close();
            } else {
                // Fallback: Create blob and download
                const blob = new Blob([vcd], { type: 'text/vcd' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            return true;
            
        } catch (error) {
            if (error.name === 'AbortError') return false;
            console.error('Error exporting VCD:', error);
            lastError = error.message || 'Unknown error';
            return false;
        }
    }

    /**
     * @brief Transfer selected VCD signals to main signal list
     * @param {WaveDocument} doc - Document
     * @param {number[]} indices - Indices of VCD signals to transfer
     */
    function transferVcdSignalsToMain(doc, indices) {
        if (!indices || indices.length === 0) return;
        if (!doc || !doc.m_vcdSignals) return;
        
        doc.pushUndoSnapshot();
        
        for (const idx of indices) {
            if (idx < 0 || idx >= doc.m_vcdSignals.length) continue;
            
            const vcdSignal = doc.m_vcdSignals[idx];
            
            // Create a copy of the signal with short name
            const newSignal = new Signal(
                vcdSignal.name, // Already using short name from expandSignals
                vcdSignal.type,
                doc.effectiveSampleCount()
            );
            
            // Copy full name if present
            if (vcdSignal.fullName) {
                newSignal.fullName = vcdSignal.fullName;
            }
            
            // Copy values
            const copyLen = Math.min(vcdSignal.values.length, newSignal.values.length);
            for (let i = 0; i < copyLen; i++) {
                newSignal.values[i] = vcdSignal.values[i];
                newSignal.labels[i] = vcdSignal.labels[i];
            }
            
            doc.m_signals.push(newSignal);
        }
        
        if (typeof doc.dataChanged === 'function') {
            doc.dataChanged();
        }
    }

    /**
     * @brief Get module hierarchy from VCD signals
     * @param {Array} signals - VCD signals
     * @return {Object} Hierarchical tree structure
     */
    function buildHierarchy(signals) {
        const root = { name: '', children: new Map(), signals: [] };
        
        for (let i = 0; i < signals.length; i++) {
            const signal = signals[i];
            // Use fullName for hierarchy (contains the full path), fallback to name
            const hierarchicalName = signal.fullName || signal.name;
            const parts = hierarchicalName.split('.');
            
            if (parts.length <= 1) {
                // Top-level signal
                root.signals.push({ index: i, name: signal.name, fullName: hierarchicalName });
            } else {
                // Navigate/create hierarchy
                let current = root;
                for (let j = 0; j < parts.length - 1; j++) {
                    const part = parts[j];
                    if (!current.children.has(part)) {
                        current.children.set(part, { 
                            name: part, 
                            children: new Map(), 
                            signals: [] 
                        });
                    }
                    current = current.children.get(part);
                }
                // Add signal to innermost scope (use short name for display)
                current.signals.push({ 
                    index: i, 
                    name: signal.name,  // Short name for display
                    fullName: hierarchicalName
                });
            }
        }
        
        return root;
    }

    /**
     * @brief Get configuration limits
     * @return {Object} Config object
     */
    function getConfig() {
        return { ...CONFIG };
    }

    // Public API
    return {
        loadFromVcd,
        saveAsVcd,
        getLastError,
        transferVcdSignalsToMain,
        buildHierarchy,
        getConfig
    };
})();
