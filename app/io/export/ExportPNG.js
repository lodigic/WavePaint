/**
 * Export PNG - PNG export functionality
 * 
 * Provides functionality to export waveforms to PNG image format.
 * Depends on: ExportCanvas.js (prepareExportCanvas)
 */

/**
 * Exports the current waveform to a PNG image file.
 * Creates a downloadable PNG file from the canvas content.
 * The exported image is sized exactly to fit the waveform content.
 */
async function exportToPNG() {
    const prepared = await prepareExportCanvas();
    if (!prepared) return;
    
    const { exportCanvas, exportWidth, exportHeight, cleanup } = prepared;
    
    // Get filename from user
    const fileName = await wpPrompt('Enter file name:', 'waveform.png', 'Export PNG');
    if (!fileName) {
        console.log('Export cancelled by user');
        cleanup();
        return;
    }
    
    // Ensure filename has .png extension
    let finalFileName = fileName;
    if (!finalFileName.toLowerCase().endsWith('.png')) {
        finalFileName += '.png';
    }
    
    try {
        // Get the data URL from the export canvas
        const dataURL = exportCanvas.toDataURL('image/png');
        
        cleanup();
        
        // Create a temporary link element for download
        const link = document.createElement('a');
        link.download = finalFileName;
        link.href = dataURL;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('PNG exported successfully:', finalFileName, 'Size:', exportWidth, 'x', exportHeight);
        await wpAlert('PNG exported successfully!', 'Export PNG');
    } catch (error) {
        cleanup();
        console.error('Failed to export PNG:', error);
        await wpAlert('Failed to export PNG: ' + error.message, 'Export Error');
    }
}
