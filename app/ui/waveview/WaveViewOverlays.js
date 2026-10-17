// WaveViewOverlays.js - Overlay drawing (cut preview, range selection, paste preview)

/**
 * Draw cut tool preview
 */
function drawCutPreview(ctx, signalStartY, subStepWidth, nameWidth, canvasHeight) {
    if (currentTool !== 'cut') return;
    
    console.log('[CUT] Drawing preview - cutPreviewSample:', cutPreviewSample, 'cutStartSample:', cutStartSample, 'cutHasStart:', cutHasStart);
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    const topMargin = signalStartY;
    
    // Always draw the preview line at current mouse position
    if (cutPreviewSample >= 0) {
        const x1 = nameWidth + cutPreviewSample * subStepWidth;
        ctx.beginPath();
        ctx.moveTo(x1, topMargin);
        ctx.lineTo(x1, canvasHeight);
        ctx.stroke();
    }
    
    // If we have a start point, draw it too (and shade the region between)
    if (cutHasStart && cutStartSample >= 0 && cutStartSample !== cutPreviewSample) {
        const x0 = nameWidth + cutStartSample * subStepWidth;
        ctx.beginPath();
        ctx.moveTo(x0, topMargin);
        ctx.lineTo(x0, canvasHeight);
        ctx.stroke();
        
        // Draw semi-transparent red fill between the two lines
        if (cutPreviewSample >= 0) {
            const x1 = nameWidth + cutPreviewSample * subStepWidth;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.fillRect(Math.min(x0, x1), topMargin, Math.abs(x1 - x0), canvasHeight - topMargin);
        }
    }
    ctx.restore();
}

/**
 * Draw range selection overlay
 */
function drawRangeSelection(ctx, signalStartY, rowHeight, subStepWidth, nameWidth) {
    if ((!rangeSelActive && !rangeSelecting) || currentTool !== 'select') return;
    
    const minSig = Math.min(rangeSelStartSignal, rangeSelEndSignal);
    const maxSig = Math.max(rangeSelStartSignal, rangeSelEndSignal);
    const minSamp = Math.min(rangeSelStartSample, rangeSelEndSample);
    const maxSamp = Math.max(rangeSelStartSample, rangeSelEndSample);
    
    if (minSig < 0 || maxSig < 0 || minSamp < 0 || maxSamp < 0) return;
    
    const x0 = nameWidth + minSamp * subStepWidth;
    const x1 = nameWidth + (maxSamp + 1) * subStepWidth;
    const y0 = signalStartY + minSig * rowHeight;
    const y1 = signalStartY + (maxSig + 1) * rowHeight;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 191, 255, 0.2)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
}

/**
 * Draw paste preview overlay
 */
function drawPastePreview(ctx, signalStartY, rowHeight, subStepWidth, nameWidth) {
    if (!clipboard || pastePreviewSignal < 0 || pastePreviewSample < 0 || currentTool !== 'select') return;
    
    const clipWidth = clipboard.width;
    const clipHeight = clipboard.height;
    
    const x0 = nameWidth + pastePreviewSample * subStepWidth;
    const y0 = signalStartY + pastePreviewSignal * rowHeight;
    const x1 = x0 + clipWidth * subStepWidth;
    const y1 = y0 + clipHeight * rowHeight;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 200, 100, 0.15)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    
    ctx.strokeStyle = '#00c864';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    
    // Draw "PASTE" label
    ctx.font = '12px Arial';
    ctx.fillStyle = '#00c864';
    const label = `Paste (${clipWidth}x${clipHeight})`;
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, x0 + (x1 - x0) / 2 - tw / 2, y0 + (y1 - y0) / 2 + 4);
    
    ctx.restore();
}

/**
 * Draw multi-selection highlight for signals
 * When dragging a group/subgroup, selection starts from that group's bracket position
 * Otherwise, starts from the deepest (most indented) group among selected signals
 */
function drawMultiSelectionHighlight(ctx, signalStartY, rowHeight, nameWidth, isMovingSignal, selectedSignalIndices) {
    if (typeof selectedSignalIndices === 'undefined' || selectedSignalIndices.length === 0) return;
    
    // Calculate the start X position for selection highlight
    let selectionStartX = 0;
    
    if (typeof GroupManager !== 'undefined' && typeof document_wave !== 'undefined') {
        // If we're dragging a specific group, use that group's depth
        if (typeof pendingMoveGroup !== 'undefined' && pendingMoveGroup !== null) {
            // Use the bracket position of the group being dragged
            const groupDepth = pendingMoveGroup.depth || 0;
            selectionStartX = GroupManager.VISUAL.bracketPadding + groupDepth * GroupManager.VISUAL.subgroupIndent;
        } else {
            // Find the MAXIMUM depth (most indented) among selected signals
            // This way the selection starts from the rightmost bracket
            const signals = document_wave.signalList();
            let maxDepth = -1;
            
            for (const idx of selectedSignalIndices) {
                const sig = signals[idx];
                if (sig && sig.groupName) {
                    const depth = GroupManager.getGroupDepth(sig.groupName);
                    if (depth > maxDepth) maxDepth = depth;
                } else if (maxDepth < 0) {
                    maxDepth = -1; // Signal without group stays at -1
                }
            }
            
            if (maxDepth >= 0) {
                // Start from the bracket position of the deepest group
                selectionStartX = GroupManager.VISUAL.bracketPadding + maxDepth * GroupManager.VISUAL.subgroupIndent;
            }
        }
    }
    
    // Sort indices and find contiguous groups
    const sortedSelection = [...selectedSignalIndices].sort((a, b) => a - b);
    const groups = [];
    let currentGroup = [sortedSelection[0]];
    
    for (let i = 1; i < sortedSelection.length; i++) {
        if (sortedSelection[i] === sortedSelection[i - 1] + 1) {
            currentGroup.push(sortedSelection[i]);
        } else {
            groups.push(currentGroup);
            currentGroup = [sortedSelection[i]];
        }
    }
    groups.push(currentGroup);
    
    // Draw merged rectangle for each contiguous group
    const isDragging = isMovingSignal && selectedSignalIndices.length > 1;
    ctx.save();
    for (const group of groups) {
        const startIdx = group[0];
        const endIdx = group[group.length - 1];
        const y = startIdx * rowHeight + signalStartY;
        const height = (endIdx - startIdx + 1) * rowHeight;
        
        // Start from selectionStartX (based on group depth)
        const startX = selectionStartX;
        const width = nameWidth - startX;
        
        ctx.fillStyle = isDragging ? 'rgba(0, 191, 255, 0.25)' : 'rgba(0, 191, 255, 0.2)';
        ctx.fillRect(startX, y, width, height);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = isDragging ? 2 : 1.5;
        ctx.strokeRect(startX, y, width, height);
    }
    ctx.setLineDash([]);
    ctx.restore();
}

/**
 * Draw vector selection highlight
 */
function drawVectorSelectionHighlight(ctx, signals, signalStartY, rowHeight, subStepWidth, nameWidth) {
    if (!vectorSelecting || vectorSelSignal < 0) return;
    
    const signal = signals[vectorSelSignal];
    if (!signal || signal.type !== SignalType.Vector) return;

    // Use this signal's substeps for correct alignment
    const globalSubSteps = document_wave ? document_wave.subStepCount() : 0;
    const signalSubSteps = (signal.subSteps && signal.subSteps > 0) ? signal.subSteps : globalSubSteps;
    const signalDivisor = signalSubSteps + 1;
    const signalStepWidth = waveCellWidth / signalDivisor;
    
    const y = vectorSelSignal * rowHeight + signalStartY;
    const startSample = Math.min(vectorSelStartSample, vectorSelCurrentSample);
    const endSample = Math.max(vectorSelStartSample, vectorSelCurrentSample);
    
    const startX = startSample * signalStepWidth + nameWidth;
    const endX = (endSample + 1) * signalStepWidth + nameWidth;
    
    ctx.fillStyle = 'rgba(0, 191, 255, 0.2)';
    ctx.fillRect(startX, y, endX - startX, rowHeight);
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, y, endX - startX, rowHeight);
    ctx.restore();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawCutPreview,
        drawRangeSelection,
        drawPastePreview,
        drawMultiSelectionHighlight,
        drawVectorSelectionHighlight
    };
}
