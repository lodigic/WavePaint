// WaveViewZoom.js - Zoom and cell width functions

function getWaveCellWidth() {
    return waveCellWidth;
}

function setWaveCellWidth(value) {
    waveCellWidth = Math.max(WAVE_CELL_MIN, Math.min(WAVE_CELL_MAX, value));
    drawWaveform();
}

function zoomIn() {
    setWaveCellWidth(waveCellWidth + 4);
}

function zoomOut() {
    setWaveCellWidth(waveCellWidth - 4);
}

function zoomFit() {
    if (!document_wave || !canvas) return;
    const container = document.getElementById('wave-view');
    if (!container) return;
    const sampleCount = document_wave.sampleCount();
    if (sampleCount <= 0) return;
    const nameWidth = getDynamicNameWidth();
    const availableWidth = container.clientWidth - nameWidth - 20;
    if (availableWidth <= 0) return;
    const newCellWidth = Math.floor(availableWidth / sampleCount);
    setWaveCellWidth(newCellWidth);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getWaveCellWidth, setWaveCellWidth, zoomIn, zoomOut, zoomFit };
}
