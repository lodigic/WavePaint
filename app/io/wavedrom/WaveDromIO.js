// WaveDromIO.js - Unified API for WaveDrom I/O
// This file combines all WaveDrom modules and provides a single entry point
//
// Loaded modules:
// - WaveDromConstants.js - Colors, WaveValue enum
// - WaveDromUtils.js     - Utility functions
// - WaveDromImport.js    - Import WaveDrom to WavePaint
// - WaveDromExport.js    - Export WavePaint to WaveDrom  
// - WaveDromUI.js        - File dialogs, modals

(function() {
    'use strict';
    
    // Create unified WaveDromIO API from loaded modules
    window.WaveDromIO = {
        // ====================================================================
        // CONSTANTS (from WaveDromConstants.js)
        // ====================================================================
        get WAVEDROM_COLORS() {
            return window.WaveDromConstants?.WAVEDROM_COLORS || {};
        },
        get WaveValue() {
            return window.WaveDromConstants?.WaveValue || {};
        },
        
        // ====================================================================
        // COLOR FUNCTIONS (from WaveDromConstants.js)
        // ====================================================================
        getWaveDromColorPalette: function() {
            return window.WaveDromConstants?.getWaveDromColorPalette?.() || {};
        },
        getStandardWaveDromColors: function() {
            return window.WaveDromConstants?.getStandardWaveDromColors?.() || {};
        },
        getWaveDromColorCode: function(hexColor) {
            return window.WaveDromConstants?.getWaveDromColorCode?.(hexColor) || '=';
        },
        
        // ====================================================================
        // UTILITY FUNCTIONS (from WaveDromUtils.js)
        // ====================================================================
        clearSignalWaveDromPreserved: function(signal) {
            if (window.WaveDromUtils?.clearSignalWaveDromPreserved) {
                window.WaveDromUtils.clearSignalWaveDromPreserved(signal);
            }
        },
        clearDocumentWaveDromPreserved: function(doc) {
            if (window.WaveDromUtils?.clearDocumentWaveDromPreserved) {
                window.WaveDromUtils.clearDocumentWaveDromPreserved(doc);
            }
        },
        parseWaveDromCode: function(code) {
            if (window.WaveDromUtils?.parseWaveDromCode) {
                return window.WaveDromUtils.parseWaveDromCode(code);
            }
            // Fallback parser
            try {
                return JSON.parse(code);
            } catch (e) {
                console.error('Failed to parse WaveDrom code:', e);
                return null;
            }
        },
        
        // ====================================================================
        // IMPORT FUNCTIONS (from WaveDromImport.js)
        // ====================================================================
        importFromWaveDrom: function(doc, waveJson) {
            if (window.WaveDromImport?.importFromWaveDrom) {
                return window.WaveDromImport.importFromWaveDrom(doc, waveJson);
            }
            console.error('WaveDromImport module not loaded');
            return false;
        },
        
        // ====================================================================
        // EXPORT FUNCTIONS (from WaveDromExport.js)
        // ====================================================================
        exportToWaveDrom: function(doc) {
            if (window.WaveDromExport?.exportToWaveDrom) {
                return window.WaveDromExport.exportToWaveDrom(doc);
            }
            console.error('WaveDromExport module not loaded');
            return { signal: [] };
        },
        exportToWaveDromString: function(doc, pretty) {
            if (window.WaveDromExport?.exportToWaveDromString) {
                return window.WaveDromExport.exportToWaveDromString(doc, pretty);
            }
            return JSON.stringify(this.exportToWaveDrom(doc), null, pretty ? 2 : 0);
        },
        generateWaveDromPreview: function(doc) {
            if (window.WaveDromExport?.generateWaveDromPreview) {
                return window.WaveDromExport.generateWaveDromPreview(doc);
            }
            return '';
        },
        
        // ====================================================================
        // UI FUNCTIONS (from WaveDromUI.js)
        // ====================================================================
        openWaveDromFile: function(doc) {
            if (window.WaveDromUI?.openWaveDromFile) {
                return window.WaveDromUI.openWaveDromFile(doc);
            }
            console.error('WaveDromUI module not loaded');
            return Promise.resolve(false);
        },
        saveAsWaveDrom: function(doc, fileName) {
            if (window.WaveDromUI?.saveAsWaveDrom) {
                return window.WaveDromUI.saveAsWaveDrom(doc, fileName);
            }
            console.error('WaveDromUI module not loaded');
            return Promise.resolve(false);
        },
        showWaveDromCode: function(doc) {
            if (window.WaveDromUI?.showWaveDromCode) {
                return window.WaveDromUI.showWaveDromCode(doc);
            }
            console.error('WaveDromUI module not loaded');
        },
        showWaveDromImportDialog: function(doc, onImport) {
            if (window.WaveDromUI?.showWaveDromImportDialog) {
                return window.WaveDromUI.showWaveDromImportDialog(doc, onImport);
            }
            console.error('WaveDromUI module not loaded');
        }
    };
    
    // Also export individual functions to global scope for backward compatibility
    window.importFromWaveDrom = window.WaveDromIO.importFromWaveDrom;
    window.exportToWaveDrom = window.WaveDromIO.exportToWaveDrom;
    window.exportToWaveDromString = window.WaveDromIO.exportToWaveDromString;
    window.openWaveDromFile = window.WaveDromIO.openWaveDromFile;
    window.saveAsWaveDrom = window.WaveDromIO.saveAsWaveDrom;
    window.showWaveDromCode = window.WaveDromIO.showWaveDromCode;
    window.parseWaveDromCode = window.WaveDromIO.parseWaveDromCode;
    window.generateWaveDromPreview = window.WaveDromIO.generateWaveDromPreview;
    window.clearSignalWaveDromPreserved = window.WaveDromIO.clearSignalWaveDromPreserved;
    window.clearDocumentWaveDromPreserved = window.WaveDromIO.clearDocumentWaveDromPreserved;
    
    console.log('WaveDromIO: Unified API ready');
})();
