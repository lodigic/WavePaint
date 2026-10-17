/**
 * TxtCsvIO.js - Export waveforms to TXT and CSV formats
 * 
 * Each signal is a COLUMN, each row is a time sample.
 * Format suitable for spreadsheets and simulation data analysis.
 * 
 * TXT Format (tab-separated):
 *   Time    clk    data    addr
 *   0       0      0x00    0x00
 *   1       1      0x01    0x01
 * 
 * CSV Format (comma-separated):
 *   Time,clk,data,addr
 *   0,0,0x00,0x00
 *   1,1,0x01,0x01
 */

/**
 * Gets the display value for a signal at a given sample index.
 */
function getSignalDisplayValue(signal, sampleIndex) {
    const val = signal.values[sampleIndex];
    
    if (signal.type === SignalType.Bit) {
        if (val === 0) return '0';
        if (val === 1) return '1';
        return 'X';
    } else if (signal.type === SignalType.Vector) {
        if (signal.labels && signal.labels[sampleIndex]) {
            const label = signal.labels[sampleIndex];
            if (label.toLowerCase() === 'z' || label.toLowerCase() === 'x') {
                return label.toUpperCase();
            }
            return label;
        }
        if (val === -1) return 'X';
        return '0x' + val.toString(16).toUpperCase().padStart(2, '0');
    }
    return '';
}

/**
 * Exports the current document to TXT format (tab-separated columns).
 * Each signal is a column, each row is a time sample.
 */
async function saveAsTxt() {
    if (!document_wave) {
        await wpAlert('No document to export.', 'Export Error');
        return;
    }
    
    const signals = document_wave.signalList();
    if (!signals || signals.length === 0) {
        await wpAlert('No signals to export.', 'Export Error');
        return;
    }
    
    const sampleCount = document_wave.sampleCount();
    const dataSignals = signals.filter(s => s.type !== SignalType.BlankRow);
    
    if (dataSignals.length === 0) {
        await wpAlert('No signals to export (only blank rows).', 'Export Error');
        return;
    }
    
    const lines = [];
    
    // Header row: Time + signal names
    const headerRow = ['Time', ...dataSignals.map(s => s.name || 'unnamed')];
    lines.push(headerRow.join('\t'));
    
    // Data rows: one per sample
    for (let t = 0; t < sampleCount; t++) {
        const row = [t.toString()];
        for (const signal of dataSignals) {
            row.push(getSignalDisplayValue(signal, t));
        }
        lines.push(row.join('\t'));
    }
    
    const content = lines.join('\n');
    
    // Save file
    const baseName = (typeof currentFileName !== 'undefined' && currentFileName) ? currentFileName : 'waveform';
    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: baseName.replace(/\.[^.]+$/, '') + '.txt',
                types: [{
                    description: 'Text Files',
                    accept: { 'text/plain': ['.txt'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = baseName.replace(/\.[^.]+$/, '') + '.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error saving TXT file:', err);
            await wpAlert('Failed to save TXT file: ' + err.message, 'Export Error');
        }
    }
}

/**
 * Exports the current document to CSV format (comma-separated columns).
 * Each signal is a column, each row is a time sample.
 */
async function saveAsCsv() {
    if (!document_wave) {
        await wpAlert('No document to export.', 'Export Error');
        return;
    }
    
    const signals = document_wave.signalList();
    if (!signals || signals.length === 0) {
        await wpAlert('No signals to export.', 'Export Error');
        return;
    }
    
    const sampleCount = document_wave.sampleCount();
    const dataSignals = signals.filter(s => s.type !== SignalType.BlankRow);
    
    if (dataSignals.length === 0) {
        await wpAlert('No signals to export (only blank rows).', 'Export Error');
        return;
    }
    
    const lines = [];
    
    // Header row: Time + signal names
    const headerRow = ['Time', ...dataSignals.map(s => escapeCSV(s.name || 'unnamed'))];
    lines.push(headerRow.join(','));
    
    // Data rows: one per sample
    for (let t = 0; t < sampleCount; t++) {
        const row = [t.toString()];
        for (const signal of dataSignals) {
            const val = getSignalDisplayValue(signal, t);
            row.push(escapeCSV(val));
        }
        lines.push(row.join(','));
    }
    
    const content = lines.join('\n');
    
    // Save file
    const baseName = (typeof currentFileName !== 'undefined' && currentFileName) ? currentFileName : 'waveform';
    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: baseName.replace(/\.[^.]+$/, '') + '.csv',
                types: [{
                    description: 'CSV Files',
                    accept: { 'text/csv': ['.csv'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
        } else {
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = baseName.replace(/\.[^.]+$/, '') + '.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error saving CSV file:', err);
            await wpAlert('Failed to save CSV file: ' + err.message, 'Export Error');
        }
    }
}

/**
 * Escapes a string for CSV format.
 * Wraps in quotes if contains comma, quote, or newline.
 */
function escapeCSV(str) {
    if (!str) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}
