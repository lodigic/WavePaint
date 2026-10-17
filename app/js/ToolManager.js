/**
 * Tool Manager - Tool selection and state management
 * 
 * Handles tool switching, cancellation, and state reset
 * for all drawing and editing tools.
 */

/**
 * Cancel current tool and reset all tool states.
 */
function cancelCurrentTool() {
    // Reset arrow state
    arrowHasStart = false;
    arrowStartSignal = -1;
    arrowStartSample = -1;
    arrowPreviewSignal = -1;
    arrowPreviewSample = -1;
    
    // Reset signal move state
    isMovingSignal = false;
    moveSignalIndex = -1;
    moveSignalTargetIndex = -1;
    pendingMoveSignal = false;
    pendingMoveSignalIndex = -1;
    
    // Reset multi-selection state
    selectedSignalIndices = [];
    lastSelectedSignalIndex = -1;
    
    // Reset vector selection state
    vectorSelecting = false;
    vectorSelSignal = -1;
    vectorSelStartSample = -1;
    vectorSelCurrentSample = -1;

    // Reset marker/time jump preview state - now use fractional positions
    if (typeof markerPreviewPosition !== 'undefined') {
        markerPreviewPosition = -1;
    }
    if (typeof timeJumpPreviewPosition !== 'undefined') {
        timeJumpPreviewPosition = -1;
    }
    if (typeof timeSpanHasStart !== 'undefined') {
        timeSpanHasStart = false;
        timeSpanStartSignal = -1;
        timeSpanStartPosition = -1;
        timeSpanPreviewSignal = -1;
        timeSpanPreviewPosition = -1;
    }
    if (typeof textAnnotationPreviewSignal !== 'undefined') {
        textAnnotationPreviewSignal = -1;
        textAnnotationPreviewPosition = -1;
        textAnnotationPreviewArrow = -1;
        textAnnotationPreviewVPos = 'Above';
    }
    
    // Reset cut tool state
    if (typeof cutHasStart !== 'undefined') {
        cutHasStart = false;
        cutStartSample = -1;
        cutPreviewSample = -1;
    }
    
    // Reset range selection state
    if (typeof rangeSelecting !== 'undefined') {
        rangeSelecting = false;
        rangeSelStartSignal = -1;
        rangeSelStartSample = -1;
        rangeSelEndSignal = -1;
        rangeSelEndSample = -1;
        rangeSelActive = false;
    }
    
    // Reset paste preview state
    if (typeof pastePreviewSignal !== 'undefined') {
        pastePreviewSignal = -1;
        pastePreviewSample = -1;
    }
    
    // Redraw to clear preview elements
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
    
    console.log('Tool cancelled');
}

/**
 * Set current tool, with toggle behavior (clicking same tool cancels it).
 * @param {string} tool - The tool to switch to
 */
function setCurrentTool(tool) {
    const previousTool = currentTool;
    
    if (currentTool === tool) {
        // Toggle off - cancel the tool and go to no tool selected
        cancelCurrentTool();
        currentTool = 'none';
        console.log('Tool toggled off, no tool selected');
    } else {
        // Cancel previous tool state before switching
        cancelCurrentTool();
        currentTool = tool;
        console.log('Tool switched to:', tool);
    }
    
    // Clear object selection when switching away from select-object tool
    if (previousTool === 'select-object' && currentTool !== 'select-object') {
        if (typeof clearObjectSelection === 'function') {
            clearObjectSelection();
        }
    }
    
    // Update toolbar button visual state
    document.querySelectorAll('.tool-btn').forEach(btn => {
        const btnTool = btn.getAttribute('data-tool');
        if (btnTool === currentTool) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}
