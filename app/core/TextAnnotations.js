// TextAnnotations.js - Text annotation management for WaveDocument

/**
 * Adds a text annotation.
 * @param {string} anchorType - Type of anchor ('Arrow', 'Signal', 'BlankRow', 'FreeForm')
 * @param {number} anchorId - Anchor element id (for Arrow/Signal anchors)
 * @param {string} text - Annotation text
 * @param {number} position - Fractional position (e.g., 2.5 = step 2, 50% into step)
 * @param {string} vPos - Vertical position ('Above', 'Center', 'Below')
 * @param {number} yOffset - Vertical offset (legacy)
 * @returns {number} Annotation id
 */
WaveDocument.prototype.addTextAnnotation = function(anchorType, anchorId, text, position = 0, vPos = 'Above', yOffset = 0) {
    this.pushUndoSnapshot();
    
    const annotation = {
        id: this.m_nextTextAnnotationId++,
        anchorType: anchorType,
        anchorId: anchorId,
        text: text,
        position: position,  // Fractional position (like markers/time jumps)
        vPos: vPos,
        yOffset: yOffset,
        color: null,
        backgroundColor: null,
        fontSize: 12,
        bold: false
    };
    
    this.m_textAnnotations.push(annotation);
    this.dataChanged();
    return annotation.id;
};

/**
 * Removes a text annotation by id.
 * @param {number} annotationId - Annotation identifier
 */
WaveDocument.prototype.removeTextAnnotation = function(annotationId) {
    const index = this.m_textAnnotations.findIndex(a => a.id === annotationId);
    if (index === -1) return;
    
    this.pushUndoSnapshot();
    this.m_textAnnotations.splice(index, 1);
    this.dataChanged();
};

/**
 * Updates text annotation content.
 * @param {number} annotationId - Annotation identifier
 * @param {string} text - New text
 */
WaveDocument.prototype.setTextAnnotationText = function(annotationId, text) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    this.pushUndoSnapshot();
    annotation.text = text;
    this.dataChanged();
};

/**
 * Sets text annotation color.
 * @param {number} annotationId - Annotation identifier
 * @param {string} color - New color (CSS format)
 */
WaveDocument.prototype.setTextAnnotationColor = function(annotationId, color) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    this.pushUndoSnapshot();
    annotation.color = color;
    this.dataChanged();
};

/**
 * Gets all text annotations.
 * @returns {Array} Array of text annotation objects
 */
WaveDocument.prototype.textAnnotationList = function() {
    return this.m_textAnnotations;
};

/**
 * Sets text annotation position and signal.
 * @param {number} annotationId - Annotation identifier
 * @param {number} position - Fractional position (e.g., 2.5 = step 2, 50% into step)
 * @param {number|null} signalIndex - New signal index (for Signal/BlankRow anchors)
 * @param {boolean} saveUndo - Whether to save undo snapshot (default: true)
 */
WaveDocument.prototype.setTextAnnotationPosition = function(annotationId, position, signalIndex = null, saveUndo = true) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    // Validate position is within document bounds
    if (position < 0 || position > this.m_sampleCount) return;
    
    if (saveUndo) this.pushUndoSnapshot();
    annotation.position = position;
    
    // Update anchorId for Signal/BlankRow anchors
    if (signalIndex !== null && (annotation.anchorType === 'Signal' || annotation.anchorType === 'BlankRow')) {
        const signals = this.signalList();
        if (signalIndex >= 0 && signalIndex < signals.length) {
            annotation.anchorId = signalIndex;
        }
    }
    
    this.dataChanged();
};

/**
 * Sets text annotation font size.
 * @param {number} annotationId - Annotation identifier
 * @param {number} fontSize - New font size (8-48)
 */
WaveDocument.prototype.setTextAnnotationFontSize = function(annotationId, fontSize) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    const clampedSize = Math.max(8, Math.min(48, fontSize));
    
    this.pushUndoSnapshot();
    annotation.fontSize = clampedSize;
    this.dataChanged();
};

/**
 * Sets text annotation bold property.
 * @param {number} annotationId - Annotation identifier
 * @param {boolean} bold - Whether text should be bold
 */
WaveDocument.prototype.setTextAnnotationBold = function(annotationId, bold) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    this.pushUndoSnapshot();
    annotation.bold = !!bold;
    this.dataChanged();
};

/**
 * Sets text annotation background color.
 * @param {number} annotationId - Annotation identifier
 * @param {string} color - New background color (CSS format)
 */
WaveDocument.prototype.setTextAnnotationBackgroundColor = function(annotationId, color) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    this.pushUndoSnapshot();
    annotation.backgroundColor = color;
    this.dataChanged();
};

/**
 * Sets text annotation vertical position.
 * @param {number} annotationId - Annotation identifier
 * @param {string} vPos - Vertical position ('Above', 'Center', 'Below')
 */
WaveDocument.prototype.setTextAnnotationVPos = function(annotationId, vPos) {
    const annotation = this.m_textAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    if (!['Above', 'Center', 'Below'].includes(vPos)) return;
    
    this.pushUndoSnapshot();
    annotation.vPos = vPos;
    this.dataChanged();
};
