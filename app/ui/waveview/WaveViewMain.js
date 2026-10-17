// WaveView.js - Main entry point (refactored modular version)
// This file loads all WaveView modules and provides the main drawWaveform function

// Note: In browser context, all modules are loaded via script tags in HTML
// The individual module files define their functions in global scope

/**
 * Main drawWaveform function - orchestrates all drawing operations
 */
function drawWaveform() {
    // Guard: ensure document_wave, canvas, and ctx are initialized
    if (!document_wave || !canvas || !ctx) {
        console.log('drawWaveform called before initialization');
        return;
    }

    const container = document.getElementById('wave-view');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const signals = document_wave.signalList();
    const sampleCount = document_wave.sampleCount();
    const globalSubStepCount = document_wave.subStepCount();
    
    // Calculate the maximum substeps (considering both global and per-signal)
    const maxSubSteps = document_wave.maxSubSteps ? document_wave.maxSubSteps() : globalSubStepCount;
    
    // Calculate the effective substep count for each signal
    // Each signal uses its own subSteps if set, otherwise global
    const getSignalSubSteps = (signal) => {
        if (signal.subSteps && signal.subSteps > 0) {
            return signal.subSteps;
        }
        return globalSubStepCount;
    };
    
    // Use maxSubSteps for layout calculations (canvas width)
    const maxDivisor = maxSubSteps + 1;
    const mainCellWidth = waveCellWidth;
    
    // IMPORTANT: Global substep width for overlays (arrows, markers, time spans, etc.)
    // These elements use globalSampleIndex, so they must render using global substeps
    const globalDivisor = globalSubStepCount + 1;
    const globalSubStepWidth = mainCellWidth / globalDivisor;
    const globalEffectiveCount = sampleCount * globalDivisor;
    
    // MaxSubStep width for text annotations (they can be placed at any visible grid position)
    const maxSubStepWidth = mainCellWidth / maxDivisor;
    
    // effectiveCount based on max (for layout compatibility)
    const effectiveCount = sampleCount * maxDivisor;
    const rowHeight = 40;
    const signalStartY = 40;
    
    // Calculate dynamic name width based on signal names
    const nameWidth = calculateDynamicNameWidth(ctx, signals);

    // Calculate required dimensions
    const requiredWidth = nameWidth + mainCellWidth * sampleCount + 20;
    const requiredHeight = signals.length * rowHeight + signalStartY + 20;
    
    const newWidth = Math.max(requiredWidth, containerWidth);
    const newHeight = Math.max(requiredHeight, 600, containerHeight);
    
    // Only resize canvas if dimensions changed and mouse is not down
    const canResize = typeof isMouseDown === 'undefined' || !isMouseDown;
    if (canResize && (canvas.width !== newWidth || canvas.height !== newHeight)) {
        canvas.width = newWidth;
        canvas.height = newHeight;
    }

    // Fill background
    const canvasBg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim() || '#ffffff';
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate text exclusion zones using max substep width
    textExclusionZones = calculateTextExclusionZones(signals, maxSubStepWidth, rowHeight, signalStartY, nameWidth);

    // Draw grid
    const canvasGrid = getComputedStyle(document.body).getPropertyValue('--canvas-grid').trim();
    const gridColor = canvasGrid || getComputedStyle(document.body).getPropertyValue('--border-color') || '#c0c0c0';
    
    // Time axis or step numbers (use maxDivisor for proper spacing)
    if (typeof axisNumbersHidden !== 'undefined' && axisNumbersHidden) {
        // Axis hidden entirely (issue #4)
    } else if (typeof timeAxisEnabled !== 'undefined' && timeAxisEnabled) {
        drawTimeAxis(ctx, sampleCount, mainCellWidth, maxDivisor, nameWidth, canvas.width, timePerStep, timeUnitString());
    } else {
        drawStepNumbers(ctx, signals, sampleCount, mainCellWidth, maxDivisor, nameWidth, signalStartY, canvas.width, rowHeight);
    }
    
    // Draw vertical grid (main lines only, no substeps - substeps drawn per-signal)
    drawVerticalGrid(ctx, sampleCount, mainCellWidth, 1, mainCellWidth, nameWidth, signalStartY, canvas.height, gridColor);

    // Draw multi-selection highlight
    drawMultiSelectionHighlight(ctx, signalStartY, rowHeight, nameWidth, isMovingSignal, selectedSignalIndices);

    // Set up clipping for text exclusion zones
    ctx.save();
    if (textExclusionZones.length > 0) {
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        for (const zone of textExclusionZones) {
            ctx.rect(zone.x, zone.y, zone.width, zone.height);
        }
        ctx.clip('evenodd');
    }

    // Calculate global substep width (used for ALL signals for consistent coordinates)
    const globalStepWidth = mainCellWidth / maxDivisor;

    // Draw signals - each signal uses its OWN substeps for array access
    signals.forEach((signal, index) => {
        const y = index * rowHeight + signalStartY;
        
        // Get THIS signal's effective substeps
        const signalSubSteps = getSignalSubSteps(signal);
        const signalDivisor = signalSubSteps + 1;
        const signalEffectiveCount = sampleCount * signalDivisor;
        const signalStepWidth = mainCellWidth / signalDivisor;
        
        // Draw per-signal substep grid if this signal has substeps
        if (signalSubSteps > 0) {
            drawSignalSubstepGrid(ctx, sampleCount, mainCellWidth, signalDivisor, signalStepWidth, nameWidth, y, y + rowHeight);
        }
        
        // Highlight signal being dragged
        if (isMovingSignal && selectedSignalIndices.length <= 1 && index === moveSignalIndex) {
            // Compute the selection start from the signal's group
            let selectionStartX = 0;
            if (typeof GroupManager !== 'undefined' && signal.groupName) {
                const groups = GroupManager.getGroups(document_wave);
                const signalGroup = groups.find(g => g.name === signal.groupName);
                if (signalGroup) {
                    selectionStartX = GroupManager.VISUAL.bracketPadding + 
                                      signalGroup.depth * GroupManager.VISUAL.subgroupIndent +
                                      GroupManager.VISUAL.bracketWidth + 5;
                }
            }
            
            ctx.fillStyle = 'rgba(0, 191, 255, 0.25)';
            ctx.fillRect(selectionStartX, y, nameWidth - selectionStartX, rowHeight);
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(selectionStartX, y, nameWidth - selectionStartX, rowHeight);
            ctx.restore();
        }
        
        // Draw signal name
        drawSignalName(ctx, signal, index, signals, rowHeight, signalStartY, nameWidth);
        
        // Draw waveform based on type - each signal uses ITS OWN substeps
        if (signal.type === SignalType.Bit) {
            drawBitSignal(ctx, signal, index, rowHeight, signalStartY, nameWidth, signalStepWidth, signalEffectiveCount, signalSubSteps);
        } else if (signal.type === SignalType.Vector) {
            drawVectorSignal(ctx, signal, index, rowHeight, signalStartY, nameWidth, signalStepWidth, signalEffectiveCount, signalSubSteps);
        } else if (signal.type === SignalType.BlankRow) {
            // Draw subtle dotted line for BlankRow
            const blankY = index * rowHeight + signalStartY;
            const centerY = blankY + rowHeight / 2;
            const startX = nameWidth;
            // Use main step width for blank rows (they span full steps)
            const endX = nameWidth + sampleCount * mainCellWidth;
            
            ctx.save();
            ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 8]);
            ctx.beginPath();
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
            ctx.stroke();
            ctx.restore();
        }
    });

    // Draw signal group brackets
    if (typeof GroupManager !== 'undefined' && GroupManager.drawGroupBrackets) {
        GroupManager.drawGroupBrackets(ctx, document_wave, signals, signalStartY, rowHeight, nameWidth);
    } else {
        drawFallbackGroupBrackets(ctx, signals, signalStartY, rowHeight, nameWidth);
    }

    // Draw vector selection highlight (uses signal's own substeps for selection bounds)
    drawVectorSelectionHighlight(ctx, signals, signalStartY, rowHeight, globalSubStepWidth, nameWidth);

    // Draw markers and time jumps (use globalSubStepWidth - they use global coordinates)
    drawMarkerPreview(ctx, signalStartY, globalEffectiveCount, globalSubStepWidth, nameWidth);
    drawTimeJumpPreview(ctx, signals, signalStartY, rowHeight, globalEffectiveCount, globalSubStepWidth, nameWidth, canvasBg);
    drawTimeJumps(ctx, signals, signalStartY, rowHeight, globalEffectiveCount, globalSubStepWidth, nameWidth, canvasBg);
    drawMarkers(ctx, globalEffectiveCount, globalSubStepWidth, signalStartY, nameWidth);

    // Draw time span preview and time spans (use globalSubStepWidth - they use global coordinates)
    drawTimeSpanPreview(ctx, signalStartY, rowHeight, globalSubStepWidth, nameWidth);
    drawTimeSpans(ctx, signals, signalStartY, rowHeight, globalSubStepWidth, nameWidth);

    // Draw cut preview (use globalSubStepWidth - cut uses global coordinates)
    drawCutPreview(ctx, signalStartY, globalSubStepWidth, nameWidth, canvas.height);
    
    // Draw range selection (use globalSubStepWidth for consistent display)
    drawRangeSelection(ctx, signalStartY, rowHeight, globalSubStepWidth, nameWidth);
    
    // Draw paste preview (use globalSubStepWidth for consistent display)
    drawPastePreview(ctx, signalStartY, rowHeight, globalSubStepWidth, nameWidth);
    
    // Draw arrow preview and arrows (use globalSubStepWidth - they use global coordinates)
    drawArrowPreview(ctx, signals, globalSubStepWidth, rowHeight, signalStartY, nameWidth);
    drawArrows(ctx, signals, globalSubStepWidth, rowHeight, signalStartY, nameWidth);

    // Draw clock edge selection highlight
    if (typeof drawClockEdgeSelection === 'function' && 
        typeof getObjectSelection === 'function' &&
        typeof SelectableType !== 'undefined') {
        const sel = getObjectSelection();
        if (sel && sel.type === SelectableType.ClockEdge && sel.object) {
            drawClockEdgeSelection(ctx, sel.object);
        }
    }

    // Restore context (remove text exclusion clipping)
    ctx.restore();

    // Draw text annotations (on top, without clipping) - use maxSubStepWidth
    // Text annotations can be placed at any visible grid position (maxSubSteps resolution)
    drawTextAnnotations(ctx, signals, maxSubStepWidth, rowHeight, signalStartY, nameWidth);
    drawTextAnnotationPreview(ctx, signals, maxSubStepWidth, rowHeight, signalStartY, nameWidth);
    
    // Clear exclusion zones
    textExclusionZones = [];
    
    // Update WaveDrom debug panel
    if (typeof updateWaveDromDebugCode === 'function') {
        updateWaveDromDebugCode();
    }
    
    console.log('drawWaveform completed successfully');
}

/**
 * Draw signal name with proper formatting
 */
function drawSignalName(ctx, signal, index, signals, rowHeight, signalStartY, nameWidth) {
    const y = index * rowHeight + signalStartY;
    
    // Calculate indentation based on group depth using GroupManager
    const groups = typeof GroupManager !== 'undefined' ? GroupManager.getGroups(document_wave) : [];
    const maxGroupDepth = groups.reduce((max, g) => Math.max(max, (g.depth || 0) + 1), 0);
    // Use the same values as GROUP_VISUAL so the layout stays consistent
    const bracketPadding = typeof GroupManager !== 'undefined' ? GroupManager.VISUAL.bracketPadding : 64;
    const subgroupIndent = typeof GroupManager !== 'undefined' ? GroupManager.VISUAL.subgroupIndent : 36;
    const bracketAreaWidth = maxGroupDepth > 0 ? (bracketPadding + maxGroupDepth * subgroupIndent + 10) : 0;
    
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000';
    ctx.font = '12px Arial';
    
    // Right-align: text ends at nameWidth - rightPadding
    const rightPadding = 6;  // Small padding from the waveform
    const textEndX = nameWidth - rightPadding;
    const maxNameWidth = textEndX - bracketAreaWidth - 4;
    
    // Truncate name if too long
    let displayName = signal.name;
    let textWidth = ctx.measureText(displayName).width;
    
    if (textWidth > maxNameWidth) {
        while (textWidth > maxNameWidth && displayName.length > 1) {
            displayName = displayName.slice(0, -1);
            textWidth = ctx.measureText(displayName + '…').width;
        }
        displayName += '…';
    }
    
    // Draw text right-aligned and vertically centered
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, textEndX, y + rowHeight / 2);
    ctx.textAlign = 'left';  // Reset to default
    ctx.textBaseline = 'alphabetic';  // Reset to default
    
    // Draw selection indicator if selected
    if (typeof isObjectSelected === 'function' && 
        typeof SelectableType !== 'undefined' && 
        isObjectSelected(SelectableType.Signal, index)) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 191, 255, 0.25)';
        ctx.fillRect(1, y + 1, nameWidth - 2, rowHeight - 2);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, y + 1, nameWidth - 2, rowHeight - 2);
        ctx.restore();
    }
}

/**
 * Draw fallback group brackets when GroupManager is not available
 * NOTE: This fallback is no longer needed - GroupManager is always available
 */
/**
 * Draw fallback group brackets when GroupManager is not available
 * NOTE: This fallback is no longer needed - GroupManager is always available
 */
function drawFallbackGroupBrackets(ctx, signals, signalStartY, rowHeight, nameWidth) {
    // With the new model, just use GroupManager
    if (typeof GroupManager !== 'undefined') {
        GroupManager.drawGroupBrackets(ctx, document_wave, signals, signalStartY, rowHeight, nameWidth);
    }
    // If GroupManager not available, nothing to draw
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { drawWaveform };
}
