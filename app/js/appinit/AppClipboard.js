/**
 * AppClipboard.js - Clipboard operations (copy, paste, delete)
 *
 * Selection sample indices live in the sample space of the row where the
 * selection/paste happens. Signals can have different substeps (e.g. clocks),
 * so every operation converts through fractional main steps and resamples
 * (issue #11: delayed copies of substepped signals were misaligned).
 */

/**
 * Divisor (samples per main step) for a signal, falling back to the global
 * substep count.
 */
function clipboardDivisorOf(signal) {
    const globalSubSteps = document_wave.subStepCount();
    return ((signal && signal.subSteps > 0 ? signal.subSteps : globalSubSteps) + 1);
}

/**
 * Deep-copies a signal's data for duplicate/copy-paste operations.
 * Keeps rendering-critical fields (substeps, clock data, fills) that the
 * previous ad-hoc copies dropped, which broke duplicated clocks (issue #11).
 * @param {Object} sig - Signal (or signal-shaped object) to clone
 * @param {string} nameSuffix - Optional suffix for the clone's name
 * @returns {Object} Plain object with the full signal data
 */
function cloneSignalData(sig, nameSuffix = '') {
    return {
        name: sig.name + nameSuffix,
        type: sig.type,
        color: sig.color,
        fill: sig.fill || null,
        values: [...sig.values],
        labels: sig.labels ? [...sig.labels] : null,
        radix: sig.radix,
        segmentStyles: sig.segmentStyles ? sig.segmentStyles.map(s => (s ? { ...s } : s)) : null,
        driveStrengths: sig.driveStrengths ? [...sig.driveStrengths] : null,
        clockMarkers: sig.clockMarkers ? [...sig.clockMarkers] : null,
        waveDromColorCodes: sig.waveDromColorCodes ? [...sig.waveDromColorCodes] : null,
        edgeArrow: sig.edgeArrow,
        riseTime: sig.riseTime,
        fallTime: sig.fallTime,
        subSteps: sig.subSteps || 0,
        isClockPattern: sig.isClockPattern || false,
        clockHighSamples: sig.clockHighSamples,
        clockLowSamples: sig.clockLowSamples,
        showClockMarkers: sig.showClockMarkers || false,
        uiRowHeightHint: sig.uiRowHeightHint || 0,
        groupName: null,
        groupColor: null,
        groupPath: null
    };
}

/**
 * Copies the current range selection to the clipboard.
 * Only works when select tool is active.
 */
function copySelection() {
    if (!rangeSelActive || currentTool !== 'select') return;

    const signals = document_wave.signalList();
    const minSig = Math.min(rangeSelStartSignal, rangeSelEndSignal);
    const maxSig = Math.max(rangeSelStartSignal, rangeSelEndSignal);
    const minSamp = Math.min(rangeSelStartSample, rangeSelEndSample);
    const maxSamp = Math.max(rangeSelStartSample, rangeSelEndSample);

    // Selection indices are in the start row's sample space; convert the
    // range to fractional main steps
    const selDivisor = clipboardDivisorOf(signals[rangeSelStartSignal]);
    const startPos = minSamp / selDivisor;
    const endPosEx = (maxSamp + 1) / selDivisor;

    // Deep copy the selection data, slicing each row in its own sample space
    const copiedSignals = [];
    for (let sigIdx = minSig; sigIdx <= maxSig; sigIdx++) {
        const signal = signals[sigIdx];
        if (!signal) continue;

        const sigDivisor = clipboardDivisorOf(signal);
        const sliceStart = Math.round(startPos * sigDivisor);
        const sliceEnd = Math.round(endPosEx * sigDivisor);

        const copiedSignal = {
            type: signal.type,
            name: signal.name,
            radix: signal.radix,
            color: signal.color,
            divisor: sigDivisor,
            values: signal.values.slice(sliceStart, sliceEnd),
            labels: signal.labels.slice(sliceStart, sliceEnd),
            segmentStyles: signal.segmentStyles.slice(sliceStart, sliceEnd).map(s => ({
                color: s ? s.color : null,
                hatched: s ? s.hatched : false,
                fill: s ? s.fill : null
            }))
        };
        copiedSignals.push(copiedSignal);
    }

    clipboard = {
        signals: copiedSignals,
        startSignal: minSig,
        startSample: minSamp,
        width: maxSamp - minSamp + 1,
        widthMain: endPosEx - startPos,  // Width in fractional main steps
        height: maxSig - minSig + 1
    };

    console.log('Copied selection:', clipboard.width, 'x', clipboard.height);

    // Show toast notification
    showToast(`Copied ${clipboard.width} samples × ${clipboard.height} signals`);

    // Keep selection active to show what was copied
    drawWaveform();
}

/**
 * Pastes the clipboard content at the current paste preview position.
 */
function pasteClipboard() {
    if (!clipboard || clipboard.signals.length === 0) return;

    // If we have a paste preview position, use it; otherwise use selection start
    let targetSignal = pastePreviewSignal >= 0 ? pastePreviewSignal : rangeSelStartSignal;
    let targetSample = pastePreviewSample >= 0 ? pastePreviewSample : rangeSelStartSample;

    // Default to 0,0 if nothing is set
    if (targetSignal < 0) targetSignal = 0;
    if (targetSample < 0) targetSample = 0;

    const signals = document_wave.signalList();

    // The target sample index is in the preview row's sample space
    const targetDivisor = clipboardDivisorOf(signals[targetSignal]);
    const targetPos = targetSample / targetDivisor;

    // Width in main steps (fallback for clipboards from older sessions)
    const widthMain = clipboard.widthMain !== undefined
        ? clipboard.widthMain
        : clipboard.width / (clipboard.signals[0]?.divisor || 1);

    document_wave.pushUndoSnapshot();

    // Paste data
    for (let i = 0; i < clipboard.signals.length; i++) {
        const clipSig = clipboard.signals[i];
        const destSigIdx = targetSignal + i;

        if (destSigIdx >= signals.length) break; // Don't paste beyond signals

        const destSig = signals[destSigIdx];
        if (!destSig) continue;

        // Only paste to compatible signal types
        if (destSig.type !== clipSig.type &&
            destSig.type !== SignalType.BlankRow &&
            clipSig.type !== SignalType.BlankRow) {
            continue;
        }
        if (clipSig.type === SignalType.BlankRow) continue;

        // Resample from the source sample space to the destination one
        const destDivisor = clipboardDivisorOf(destSig);
        const srcDivisor = clipSig.divisor || destDivisor;
        const destStart = Math.round(targetPos * destDivisor);
        const destCount = Math.round(widthMain * destDivisor);

        for (let k = 0; k < destCount; k++) {
            const destIdx = destStart + k;
            if (destIdx < 0 || destIdx >= destSig.values.length) break;

            const srcIdx = Math.min(clipSig.values.length - 1, Math.floor((k * srcDivisor) / destDivisor));
            if (srcIdx < 0) continue;

            destSig.values[destIdx] = clipSig.values[srcIdx];
            destSig.labels[destIdx] = clipSig.labels[srcIdx];
            const st = clipSig.segmentStyles[srcIdx];
            if (st) {
                destSig.segmentStyles[destIdx] = new SegmentStyle(st.color, st.hatched, st.fill);
            }
        }
    }

    console.log('Pasted at signal', targetSignal, 'sample', targetSample);

    // Show toast notification
    showToast(`Pasted ${clipboard.width} samples × ${clipboard.height} signals`);

    // Clear selection and paste preview after pasting
    rangeSelActive = false;
    rangeSelStartSignal = -1;
    rangeSelStartSample = -1;
    rangeSelEndSignal = -1;
    rangeSelEndSample = -1;
    pastePreviewSignal = -1;
    pastePreviewSample = -1;

    drawWaveform();
}

/**
 * Deletes the content in the current range selection.
 */
function deleteSelection() {
    if (!rangeSelActive) return;

    const signals = document_wave.signalList();
    const minSig = Math.min(rangeSelStartSignal, rangeSelEndSignal);
    const maxSig = Math.max(rangeSelStartSignal, rangeSelEndSignal);
    const minSamp = Math.min(rangeSelStartSample, rangeSelEndSample);
    const maxSamp = Math.max(rangeSelStartSample, rangeSelEndSample);

    // Convert the range to fractional main steps (see copySelection)
    const selDivisor = clipboardDivisorOf(signals[rangeSelStartSignal]);
    const startPos = minSamp / selDivisor;
    const endPosEx = (maxSamp + 1) / selDivisor;

    document_wave.pushUndoSnapshot();

    // Set selected area to undefined/X state
    for (let sigIdx = minSig; sigIdx <= maxSig; sigIdx++) {
        const signal = signals[sigIdx];
        if (!signal || signal.type === SignalType.BlankRow) continue;

        const sigDivisor = clipboardDivisorOf(signal);
        const from = Math.round(startPos * sigDivisor);
        const to = Math.round(endPosEx * sigDivisor);

        for (let sampIdx = from; sampIdx < to && sampIdx < signal.values.length; sampIdx++) {
            if (sampIdx < 0) continue;
            signal.values[sampIdx] = -1; // X/undefined
            signal.labels[sampIdx] = '';
            signal.segmentStyles[sampIdx] = new SegmentStyle();
        }
    }

    console.log('Deleted selection');

    // Clear selection after delete
    rangeSelActive = false;
    rangeSelStartSignal = -1;
    rangeSelStartSample = -1;
    rangeSelEndSignal = -1;
    rangeSelEndSample = -1;

    drawWaveform();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { copySelection, pasteClipboard, deleteSelection, cloneSignalData };
}
