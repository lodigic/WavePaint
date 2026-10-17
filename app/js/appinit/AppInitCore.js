/**
 * AppInitCore.js - Main application initialization
 * 
 * Contains the DOMContentLoaded event handler and sets up
 * all the event listeners for the application.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('=================================');
    console.log('DOM LOADED - INITIALIZING');
    console.log('=================================');

    const removeLoader = () => {
        document.body.classList.remove('loading');
        const loader = document.getElementById('app-loader');
        if (loader && loader.parentElement) {
            loader.parentElement.removeChild(loader);
        }
    };

    // Safety: ensure loader is removed even if init fails
    const loaderFallback = setTimeout(removeLoader, 3000);

    // Always remove loader after full window load (fonts/images)
    window.addEventListener('load', () => {
        clearTimeout(loaderFallback);
        removeLoader();
    }, { once: true });
    
    // Initialize canvas and context after DOM is ready
    canvas = document.getElementById('wave-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        clearTimeout(loaderFallback);
        removeLoader();
        return;
    }
    
    ctx = canvas.getContext('2d');
    document_wave = new WaveDocument();
    
    console.log('Canvas:', canvas);
    console.log('Context:', ctx);
    console.log('WaveDocument:', document_wave);
    
    // Load theme from localStorage (default to dark)
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'dark') {
        document.body.classList.add('dark');
    }
    
    // Load canvas theme from localStorage (default to light/white canvas)
    const canvasTheme = localStorage.getItem('canvasTheme') || 'light';
    if (canvasTheme === 'dark') {
        document.body.classList.add('canvas-dark');
    }

    // Initialize all handlers
    initMenuHandlers();
    initToolbarHandlers();
    initCanvasHandlers();
    initKeyboardHandlers();

    // Warn before leaving/refreshing the page with unsaved changes (issue #5)
    window.addEventListener('beforeunload', (e) => {
        if (document_wave && document_wave.m_modified) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Initial draw
    console.log('Calling initial drawWaveform...');
    drawWaveform();
    // No tool selected by default - user must click to activate a tool
    updateSidePanels();
    updateColorPicker();

    // If the URL carries a shared document (e.g. an AI-generated WavePaint
    // link: .../app/#d=...), load it so it opens ready to edit / export.
    const openedFromLink = typeof hasSharePayload === 'function' && hasSharePayload();
    if (openedFromLink && typeof loadDocFromLink === 'function') {
        loadDocFromLink(document_wave).then((loaded) => {
            if (!loaded) return;
            selectedSignalIndex = -1;
            const sampleSpin = document.getElementById('sample-spin');
            if (sampleSpin) sampleSpin.value = document_wave.m_sampleCount;
            const substepSpin = document.getElementById('substep-spin');
            if (substepSpin) substepSpin.value = document_wave.m_subStepCount;
            document_wave.m_modified = false;
            drawWaveform();
            updateSidePanels();
            updateColorPicker();
        }).catch((err) => console.error('Failed to load shared document from URL:', err));
    }
    console.log('=================================');
    console.log('INITIALIZATION COMPLETE!');
    console.log('=================================');
    clearTimeout(loaderFallback);
    
    // Remove loading screen after everything is ready
    setTimeout(() => {
        removeLoader();
    }, 100);
    
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
