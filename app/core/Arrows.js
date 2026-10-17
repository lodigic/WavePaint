// Arrows.js - Arrow management for WaveDocument

// WaveDrom edge styles reference:
// Splines: ~, ~>, <~>, -~, ~-, -~>, ~->
// Sharp lines: -|, |-, -|-, -|>, |->, -|->, <-|>, <-|->
// Straight: -, ->, <->

/**
 * Adds an arrow connecting two signal/sample points.
 * 
 * COORDINATE SYSTEM: Fractional positions
 * Position is a decimal number where:
 * - Integer part = main step (0, 1, 2, ...)
 * - Decimal part = fraction within step (0.0 to 0.999...)
 * Example: 2.5 means mainStep 2, 50% into the step
 * 
 * This allows arrows to snap to each signal's own substep grid
 * while storing a universal position that works regardless of substeps.
 * 
 * @param {number} startSignal - Start signal row index
 * @param {number} startPosition - Start position (fractional: mainStep + fraction)
 * @param {number} endSignal - End signal row index
 * @param {number} endPosition - End position (fractional: mainStep + fraction)
 * @param {string} style - WaveDrom edge style (default: '~>')
 * @returns {number} Arrow id on success, -1 on failure
 */
WaveDocument.prototype.addArrow = function(startSignal, startPosition, endSignal, endPosition, style = '~>') {
    const sigCount = this.m_signals.length;
    const sampleCount = this.m_sampleCount;
    
    if (startSignal < 0 || startSignal >= sigCount) return -1;
    if (endSignal < 0 || endSignal >= sigCount) return -1;
    
    // BlankRow is now allowed for arrows
    
    // Validate positions (must be within document range)
    if (startPosition < 0 || startPosition > sampleCount) return -1;
    if (endPosition < 0 || endPosition > sampleCount) return -1;
    
    this.pushUndoSnapshot();
    
    const arrow = {
        id: this.m_nextArrowId++,
        startSignal: startSignal,
        startPosition: startPosition,  // Fractional position (e.g., 2.5 = step 2, 50%)
        endSignal: endSignal,
        endPosition: endPosition,      // Fractional position
        style: style,  // WaveDrom edge style
        color: null    // null = use theme default
    };
    
    this.m_arrows.push(arrow);
    this.dataChanged();
    return arrow.id;
};

/**
 * Removes an arrow by id.
 * @param {number} arrowId - Arrow identifier
 */
WaveDocument.prototype.subArrowById = function(arrowId) {
    const index = this.m_arrows.findIndex(a => a.id === arrowId);
    if (index === -1) return;
    
    this.pushUndoSnapshot();
    this.m_arrows.splice(index, 1);
    
    // Update text annotations anchored to this arrow
    this.updateTextAnnotationsAfterArrowRemove(arrowId);
    
    // Reset or update next arrow id
    if (this.m_arrows.length === 0) {
        this.m_nextArrowId = 1;
    } else {
        let maxId = 0;
        for (const arrow of this.m_arrows) {
            if (arrow.id > maxId) maxId = arrow.id;
        }
        this.m_nextArrowId = maxId + 1;
    }
    
    this.dataChanged();
};

/**
 * Clears all arrows.
 */
WaveDocument.prototype.clearArrows = function() {
    this.pushUndoSnapshot();
    
    // Remove all text annotations anchored to arrows
    this.m_textAnnotations = this.m_textAnnotations.filter(ta => 
        ta.anchorType !== TextAnchorType.Arrow
    );
    
    this.m_arrows = [];
    this.m_nextArrowId = 1;
    this.dataChanged();
};

/**
 * Sets the default arrow color.
 * @param {string} color - New default arrow color (CSS format)
 */
WaveDocument.prototype.setArrowColor = function(color) {
    if (!color) return;
    this.pushUndoSnapshot();
    this.m_arrowColor = color;
    this.dataChanged();
};

/**
 * Sets a specific arrow color by id.
 * @param {number} arrowId - Arrow identifier
 * @param {string} color - New arrow color (CSS format)
 */
WaveDocument.prototype.setArrowColorById = function(arrowId, color) {
    if (!color) return;
    
    const arrow = this.m_arrows.find(a => a.id === arrowId);
    if (!arrow) return;
    
    this.pushUndoSnapshot();
    arrow.color = color;
    this.dataChanged();
};

/**
 * Sets a specific arrow style by id.
 * @param {number} arrowId - Arrow identifier
 * @param {string} style - WaveDrom edge style (~>, -|>, |->, etc.)
 */
WaveDocument.prototype.setArrowStyleById = function(arrowId, style) {
    if (!style) return;
    
    const arrow = this.m_arrows.find(a => a.id === arrowId);
    if (!arrow) return;
    
    this.pushUndoSnapshot();
    arrow.style = style;
    this.dataChanged();
};

/**
 * Gets all arrows.
 * @returns {Array} Array of arrow objects
 */
WaveDocument.prototype.arrowList = function() {
    return this.m_arrows;
};
