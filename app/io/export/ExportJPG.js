/**
 * Export JPG - JPG export functionality
 * 
 * Provides functionality to export waveforms to JPG image format.
 * Depends on: ExportCanvas.js (prepareExportCanvas)
 */

/**
 * Exports the current waveform to a JPG image file.
 * Creates a downloadable JPG file from the canvas content.
 * The exported image is sized exactly to fit the waveform content.
 */
async function exportToJPG() {
    const prepared = await prepareExportCanvas();
    if (!prepared) return;
    
    const { exportCanvas, exportWidth, exportHeight, cleanup } = prepared;
    
    // Get filename from user
    const fileName = await wpPrompt('Enter file name:', 'waveform.jpg', 'Export JPG');
    if (!fileName) {
        console.log('Export cancelled by user');
        cleanup();
        return;
    }
    
    // Ensure filename has .jpg extension
    let finalFileName = fileName;
    if (!finalFileName.toLowerCase().endsWith('.jpg') && !finalFileName.toLowerCase().endsWith('.jpeg')) {
        finalFileName += '.jpg';
    }
    
    try {
        // Get the data URL from the export canvas (JPEG with quality 0.92)
        const dataURL = exportCanvas.toDataURL('image/jpeg', 0.92);
        
        cleanup();
        
        // Create a temporary link element for download
        const link = document.createElement('a');
        link.download = finalFileName;
        link.href = dataURL;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('JPG exported successfully:', finalFileName, 'Size:', exportWidth, 'x', exportHeight);
        await wpAlert('JPG exported successfully!', 'Export JPG');
    } catch (error) {
        cleanup();
        console.error('Failed to export JPG:', error);
        await wpAlert('Failed to export JPG: ' + error.message, 'Export Error');
    }
}
