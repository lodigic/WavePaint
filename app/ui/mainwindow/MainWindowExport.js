/**
 * MainWindowExport.js - Export functions for TXT/CSV
 */

/**
 * Export to TXT format action
 */
async function exportTxtAction() {
    try {
        if (typeof saveAsTxt === 'function') {
            await saveAsTxt();
        } else {
            await wpAlert('TXT export not available. TxtCsvIO.js may not be loaded.', 'Error');
        }
    } catch (err) {
        console.error('TXT export error:', err);
        await wpAlert('Failed to export TXT: ' + err.message, 'Export Error');
    }
}

/**
 * Export to CSV format action
 */
async function exportCsvAction() {
    try {
        if (typeof saveAsCsv === 'function') {
            await saveAsCsv();
        } else {
            await wpAlert('CSV export not available. TxtCsvIO.js may not be loaded.', 'Error');
        }
    } catch (err) {
        console.error('CSV export error:', err);
        await wpAlert('Failed to export CSV: ' + err.message, 'Export Error');
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { exportTxtAction, exportCsvAction };
}
