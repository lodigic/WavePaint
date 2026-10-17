// JsonIO.js - Local file save/load operations for WavePaint Web

/**
 * @brief Saves to file.
 *
 * Serializes the provided WaveDocument into the project's JSON format and
 * triggers a download to save it locally.
 *
 * The saved payload includes timeline configuration (sample/sub-step counts),
 * signal definitions (type, colors, values, labels, segment styles), and
 * annotations (markers, time jumps, time-span markers, arrows, text annotations) 
 * as well as signal groups.
 *
 * @param doc Source document to serialize.
 * @param fileName Output file name (default: 'waveform.wp').
 * @return Promise<boolean> True if the operation succeeds; otherwise false.
 */
function buildDocumentJson(doc) {
        const root = {};

        // Timeline configuration
        root.sampleCount = doc.m_sampleCount;
        root.subStepCount = doc.m_subStepCount;
        root.arrowColor = doc.m_arrowColor || '#ff0000';
        
        // WaveDrom-specific metadata for round-trip fidelity
        if (doc.m_waveDromHead) root.waveDromHead = doc.m_waveDromHead;
        if (doc.m_waveDromFoot) root.waveDromFoot = doc.m_waveDromFoot;
        if (doc.m_waveDromConfig) root.waveDromConfig = doc.m_waveDromConfig;
        // Note: waveDromSignalStructure not saved to keep format clean

        // Signals
        const sigArray = [];
        for (const s of doc.m_signals) {
            const so = {};
            so.name = s.name;
            
            if (s.type === SignalType.Bit)
                so.type = 'bit';
            else if (s.type === SignalType.Vector)
                so.type = 'vector';
            else
                so.type = 'blank';
            
            so.color = s.color || '#000000';
            so.riseTime = s.riseTime;
            so.fallTime = s.fallTime;
            so.edgeArrow = s.edgeArrow || 'none';
            
            // Note: isClockPattern not saved to keep format clean
            
            // Fill color for vector signals
            if (s.fill) {
                so.fill = s.fill;
            }

            if (s.uiRowHeightHint !== 0)
                so.uiRowHeightHint = s.uiRowHeightHint;

            so.values = [...s.values];
            so.labels = [...s.labels];

            // Segment styles
            const stylesArray = [];
            let hasStyles = false;
            for (const style of s.segmentStyles) {
                const styleObj = {};
                if (style && style.color) {
                    styleObj.color = style.color;
                    hasStyles = true;
                }
                if (style && style.hatched) {
                    styleObj.hatched = true;
                    hasStyles = true;
                }
                if (style && style.fill) {
                    styleObj.fill = style.fill;
                    hasStyles = true;
                }
                stylesArray.push(styleObj);
            }
            if (hasStyles) {
                so.segmentStyles = stylesArray;
            }
            
            // Drive strengths for bit signals (h/l/H/L support)
            if (s.driveStrengths) {
                const hasDriveStrengths = s.driveStrengths.some(ds => ds !== 0);
                if (hasDriveStrengths) {
                    so.driveStrengths = [...s.driveStrengths];
                }
            }
            
            // Clock markers for clock signals (P/N vs p/n)
            if (s.clockMarkers) {
                const hasClockMarkers = s.clockMarkers.some(cm => cm === true);
                if (hasClockMarkers) {
                    so.clockMarkers = [...s.clockMarkers];
                }
            }
            
            // Show clock markers visibility setting (default is false)
            if (s.showClockMarkers === true) {
                so.showClockMarkers = true;
            }
            
            // WaveDrom color codes for vector signals (=, 2-9)
            if (s.waveDromColorCodes) {
                const hasColorCodes = s.waveDromColorCodes.some(cc => cc !== null);
                if (hasColorCodes) {
                    so.waveDromColorCodes = [...s.waveDromColorCodes];
                }
            }
            
            // Preserve original wave chars for round-trip fidelity
            // This is needed to distinguish 'x' from '.' when values are the same
            if (s.waveDromChars) {
                const hasChars = s.waveDromChars.some(c => c !== null);
                if (hasChars) {
                    so.waveDromChars = [...s.waveDromChars];
                }
            }
            
            // Track if original WaveDrom had data array (for round-trip fidelity)
            if (s.waveDromHadData) {
                so.waveDromHadData = true;
            }
            
            // Preserve original data array for round-trip fidelity
            // WaveDrom allows extra data elements that aren't consumed by the wave
            if (s.waveDromData) {
                so.waveDromData = s.waveDromData;
            }
            
            // Preserve original wave length for correct export sizing
            if (s.waveDromWaveLength) {
                so.waveDromWaveLength = s.waveDromWaveLength;
            }
            
            // WaveDrom period/phase are semantic properties that affect signal timing
            if (s.waveDromPeriod !== null && s.waveDromPeriod !== undefined) {
                so.waveDromPeriod = s.waveDromPeriod;
            }
            if (s.waveDromPhase !== null && s.waveDromPhase !== undefined) {
                so.waveDromPhase = s.waveDromPhase;
            }
            if (s.isNodeOnlyRow) {
                so.isNodeOnlyRow = true;
            }
            
            // Per-signal substeps
            if (s.subSteps && s.subSteps > 0) {
                so.subSteps = s.subSteps;
            }
            
            // Group info (modelo simplificado)
            if (s.groupName) {
                so.groupName = s.groupName;
            }
            if (s.groupColor) {
                so.groupColor = s.groupColor;
            }
            // Group path for nested subgroups
            if (s.groupPath && s.groupPath.length > 0) {
                so.groupPath = s.groupPath;
            }

            sigArray.push(so);
        }
        root.signals = sigArray;
        
        // Note: waveDromEdges NOT saved - arrows must be regenerated from m_arrows

        // Markers - now uses fractional positions
        const markerArray = [];
        for (const m of doc.m_markers) {
            const mo = {};
            mo.id = m.id;
            mo.position = m.position;  // Fractional position
            if (m.color)
                mo.color = m.color;
            markerArray.push(mo);
        }
        root.markers = markerArray;

        // Time Jumps - now uses fractional positions
        const timeJumpArray = [];
        for (const j of doc.m_timeJumps) {
            const jo = {};
            jo.id = j.id;
            jo.position = j.position;  // Fractional position
            if (j.color)
                jo.color = j.color;
            timeJumpArray.push(jo);
        }
        root.timeJumps = timeJumpArray;

        // Time Span Markers - now uses fractional positions
        const timeSpanArray = [];
        for (const ts of doc.m_timeSpanMarkers) {
            const tso = {};
            tso.id = ts.id;
            tso.startSignal = ts.startSignal;
            tso.startPosition = ts.startPosition;  // Fractional position
            tso.endSignal = ts.endSignal;
            tso.endPosition = ts.endPosition;      // Fractional position
            tso.style = ts.style || '-|';
            if (ts.color)
                tso.color = ts.color;
            if (ts.label)
                tso.label = ts.label;
            timeSpanArray.push(tso);
        }
        root.timeSpanMarkers = timeSpanArray;

        // Arrows - now uses fractional positions
        const arrowArray = [];
        for (const a of doc.m_arrows) {
            const ao = {};
            ao.id = a.id;
            ao.startSignal = a.startSignal;
            ao.startPosition = a.startPosition;  // Fractional position
            ao.endSignal = a.endSignal;
            ao.endPosition = a.endPosition;      // Fractional position
            ao.style = a.style || '~>';
            ao.color = a.color || doc.m_arrowColor || '#ff0000';
            arrowArray.push(ao);
        }
        root.arrows = arrowArray;

        // Groups ya no se guardan como array separado
        // Los grupos se reconstruyen de signal.groupName al cargar

        // Text Annotations - now uses fractional positions
        const annArray = [];
        for (const ann of doc.m_textAnnotations) {
            const ao = {};
            ao.id = ann.id;
            ao.anchorType = ann.anchorType;
            ao.anchorId = ann.anchorId;
            ao.position = ann.position;  // Fractional position
            ao.vPos = ann.vPos;
            ao.text = ann.text;
            if (ann.color)
                ao.color = ann.color;
            if (ann.backgroundColor)
                ao.backgroundColor = ann.backgroundColor;
            ao.fontSize = ann.fontSize;
            ao.bold = ann.bold;
            annArray.push(ao);
        }
        root.textAnnotations = annArray;

        return JSON.stringify(root, null, 2);
}

async function saveToFile(doc, fileName = 'waveform.wp') {
    try {
        const jsonStr = buildDocumentJson(doc);

        // Prefer File System Access API when available (secure contexts)
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName || 'waveform.wp',
                types: [
                    {
                        description: 'WavePaint files',
                        accept: { 'application/json': ['.wp', '.json'] }
                    }
                ]
            });

            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();

            // Track last handle for potential future use
            doc._fileHandle = handle;
        } else {
            // Fallback: Create blob and download
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        doc.m_modified = false;
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        return false;
    }
}

/**
 * @brief Loads from file.
 *
 * Loads a WaveDocument from the project's JSON format.
 *
 * On success, the target document is cleared and repopulated (signals, markers,
 * time jumps, time-span markers, arrows, groups, and related ID counters).
 *
 * @param doc Target document to populate.
 * @param fileContent The JSON file content as string.
 * @return True if the operation succeeds; otherwise false.
 */
function loadFromFileContent(doc, fileContent) {
    try {
        const root = JSON.parse(fileContent);

        const samples = root.sampleCount || 0;
        if (samples <= 0)
            return false;

        const subSteps = root.subStepCount || 0;

        // Clear document
        doc.m_sampleCount = samples;
        doc.m_subStepCount = subSteps < 0 ? 0 : subSteps;
        doc.m_signals = [];
        doc.m_vcdSignals = [];
        doc.m_markers = [];
        doc.m_timeJumps = [];
        doc.m_timeSpanMarkers = [];
        doc.m_arrows = [];
        doc.m_textAnnotations = [];
        doc.m_nextMarkerId = 1;
        doc.m_nextTimeJumpId = 1;
        doc.m_nextTimeSpanMarkerId = 1;
        doc.m_nextArrowId = 1;
        doc.m_nextTextAnnotationId = 1;
        doc.m_arrowColor = '#ff0000';

        if (root.arrowColor) {
            doc.m_arrowColor = root.arrowColor;
        }
        
        // Load WaveDrom-specific metadata for round-trip fidelity
        if (root.waveDromHead) {
            doc.m_waveDromHead = root.waveDromHead;
        }
        if (root.waveDromFoot) {
            doc.m_waveDromFoot = root.waveDromFoot;
        }
        if (root.waveDromConfig) {
            doc.m_waveDromConfig = root.waveDromConfig;
        }
        if (root.waveDromSignalStructure) {
            doc.m_waveDromSignalStructure = root.waveDromSignalStructure;
        }

        // Pre-calculate max substeps from signal data (since signals aren't loaded yet)
        const sigArray = root.signals || [];
        let maxSignalSubSteps = doc.m_subStepCount;
        for (const so of sigArray) {
            if (so.subSteps && so.subSteps > maxSignalSubSteps) {
                maxSignalSubSteps = so.subSteps;
            }
        }
        
        // Calculate effective count with the pre-calculated max substeps
        const effectiveCount = doc.m_sampleCount * (maxSignalSubSteps + 1);

        // Load signals
        for (const so of sigArray) {
            const s = new Signal('', SignalType.Bit, effectiveCount);
            
            s.name = so.name || '';
            
            const typeStr = so.type || 'bit';
            if (typeStr === 'vector')
                s.type = SignalType.Vector;
            else if (typeStr === 'blank')
                s.type = SignalType.BlankRow;
            else
                s.type = SignalType.Bit;

            // Load color if present
            if (so.color) {
                s.color = so.color;
            }

            s.riseTime = so.riseTime || 0.0;
            s.fallTime = so.fallTime || 0.0;
            s.edgeArrow = so.edgeArrow || 'none';
            
            // Load clock pattern flag (for WaveDrom round-trip fidelity)
            if (so.isClockPattern) {
                s.isClockPattern = true;
            }
            
            // Load fill color for vector signals
            if (so.fill) {
                s.fill = so.fill;
            }

            if (so.uiRowHeightHint !== undefined)
                s.uiRowHeightHint = so.uiRowHeightHint;

            // Load values
            const vals = so.values || [];
            s.values = new Array(effectiveCount).fill(-1);
            for (let i = 0; i < vals.length && i < effectiveCount; i++) {
                s.values[i] = vals[i];
            }

            // Load labels
            const labs = so.labels || [];
            s.labels = new Array(effectiveCount).fill('');
            for (let i = 0; i < labs.length && i < effectiveCount; i++) {
                s.labels[i] = labs[i];
            }

            // Load segment styles
            s.segmentStyles = new Array(effectiveCount);
            for (let i = 0; i < effectiveCount; i++) {
                s.segmentStyles[i] = new SegmentStyle();
            }
            if (so.segmentStyles) {
                const stylesArray = so.segmentStyles;
                for (let i = 0; i < stylesArray.length && i < effectiveCount; i++) {
                    const styleObj = stylesArray[i];
                    if (styleObj.color) {
                        s.segmentStyles[i].color = styleObj.color;
                    }
                    if (styleObj.hatched) {
                        s.segmentStyles[i].hatched = styleObj.hatched;
                    }
                    if (styleObj.fill) {
                        s.segmentStyles[i].fill = styleObj.fill;
                    }
                }
            }
            
            // Load drive strengths for bit signals (h/l/H/L support)
            s.driveStrengths = new Array(effectiveCount).fill(0);
            if (so.driveStrengths) {
                for (let i = 0; i < so.driveStrengths.length && i < effectiveCount; i++) {
                    s.driveStrengths[i] = so.driveStrengths[i];
                }
            }
            
            // Load clock markers for clock signals (P/N vs p/n)
            s.clockMarkers = new Array(effectiveCount).fill(false);
            if (so.clockMarkers) {
                for (let i = 0; i < so.clockMarkers.length && i < effectiveCount; i++) {
                    s.clockMarkers[i] = so.clockMarkers[i];
                }
            }
            
            // Load show clock markers visibility setting (default is false)
            s.showClockMarkers = so.showClockMarkers === true; // Default to false
            
            // Load WaveDrom color codes for vector signals
            s.waveDromColorCodes = new Array(effectiveCount).fill(null);
            if (so.waveDromColorCodes) {
                for (let i = 0; i < so.waveDromColorCodes.length && i < effectiveCount; i++) {
                    s.waveDromColorCodes[i] = so.waveDromColorCodes[i];
                }
            }
            
            // Load WaveDrom characters for round-trip fidelity
            s.waveDromChars = new Array(effectiveCount).fill(null);
            if (so.waveDromChars) {
                for (let i = 0; i < so.waveDromChars.length && i < effectiveCount; i++) {
                    s.waveDromChars[i] = so.waveDromChars[i];
                }
            }
            
            // Load WaveDrom-specific signal metadata for round-trip fidelity
            if (so.waveDromPeriod !== undefined) s.waveDromPeriod = so.waveDromPeriod;
            if (so.waveDromPhase !== undefined) s.waveDromPhase = so.waveDromPhase;
            if (so.waveDromData !== undefined) s.waveDromData = so.waveDromData;
            if (so.waveDromNode !== undefined) s.waveDromNode = so.waveDromNode;
            if (so.waveDromWave !== undefined) s.waveDromWave = so.waveDromWave;
            if (so.waveDromHadData) s.waveDromHadData = true;
            if (so.waveDromWaveLength) s.waveDromWaveLength = so.waveDromWaveLength;
            if (so.isNodeOnlyRow) s.isNodeOnlyRow = true;
            
            // Load per-signal substeps
            if (so.subSteps && so.subSteps > 0) {
                s.subSteps = so.subSteps;
            }
            
            // Load group info (modelo simplificado)
            if (so.groupName) {
                s.groupName = so.groupName;
            }
            if (so.groupColor) {
                s.groupColor = so.groupColor;
            }
            // Load group path for nested subgroups
            if (so.groupPath && Array.isArray(so.groupPath)) {
                s.groupPath = so.groupPath;
            }

            doc.m_signals.push(s);
        }
        
        // Load WaveDrom edges for round-trip fidelity
        if (root.waveDromEdges) {
            doc.m_waveDromEdges = root.waveDromEdges;
        }

        // Load markers - supports both old (sample) and new (position) formats
        const markerArray = root.markers || [];
        for (const mo of markerArray) {
            const id = mo.id || 0;
            
            // Support both old integer (sample) and new fractional (position) formats
            let position;
            if (mo.position !== undefined) {
                position = mo.position;
            } else if (mo.sample !== undefined) {
                // Old format: integer sample indices - convert to fractional
                const globalSubSteps = doc.m_subStepCount || 0;
                const divisor = globalSubSteps + 1;
                position = mo.sample / divisor;
            } else {
                continue;
            }

            if (id <= 0)
                continue;
            if (position < 0 || position > doc.m_sampleCount)
                continue;

            const m = new Marker(id, position);
            if (mo.color)
                m.color = mo.color;
            doc.m_markers.push(m);

            if (id >= doc.m_nextMarkerId)
                doc.m_nextMarkerId = id + 1;
        }

        // Load time jumps - supports both old (sample) and new (position) formats
        const timeJumpArray = root.timeJumps || [];
        for (const jo of timeJumpArray) {
            const id = jo.id || 0;
            
            // Support both old integer (sample) and new fractional (position) formats
            let position;
            if (jo.position !== undefined) {
                position = jo.position;
            } else if (jo.sample !== undefined) {
                const globalSubSteps = doc.m_subStepCount || 0;
                const divisor = globalSubSteps + 1;
                position = jo.sample / divisor;
            } else {
                continue;
            }

            if (id <= 0)
                continue;
            if (position < 0 || position > doc.m_sampleCount)
                continue;

            const j = new TimeJump(id, position);
            if (jo.color)
                j.color = jo.color;
            doc.m_timeJumps.push(j);

            if (id >= doc.m_nextTimeJumpId)
                doc.m_nextTimeJumpId = id + 1;
        }

        // Load time span markers - supports both old (startSample) and new (startPosition) formats
        const timeSpanArray = root.timeSpanMarkers || [];
        const sigCount = doc.m_signals.length;

        for (const tso of timeSpanArray) {
            const id = tso.id || 0;
            // Support both old format (row/anchorRow) and new format (startSignal/endSignal)
            const startSignal = tso.startSignal !== undefined ? tso.startSignal : (tso.anchorRow || 0);
            const endSignal = tso.endSignal !== undefined ? tso.endSignal : (tso.endAnchorRow || startSignal);
            const style = tso.style || '-|';
            
            // Support both old integer (startSample) and new fractional (startPosition) formats
            let startPosition, endPosition;
            if (tso.startPosition !== undefined) {
                startPosition = tso.startPosition;
                endPosition = tso.endPosition;
            } else if (tso.startSample !== undefined) {
                const globalSubSteps = doc.m_subStepCount || 0;
                const divisor = globalSubSteps + 1;
                startPosition = tso.startSample / divisor;
                endPosition = tso.endSample / divisor;
            } else {
                continue;
            }

            if (id <= 0)
                continue;
            if (startSignal < 0 || startSignal >= sigCount)
                continue;
            if (endSignal < 0 || endSignal >= sigCount)
                continue;
            if (startPosition < 0 || startPosition > doc.m_sampleCount)
                continue;
            if (endPosition < 0 || endPosition > doc.m_sampleCount)
                continue;

            const ts = {
                id: id,
                startSignal: startSignal,
                startPosition: startPosition,  // Fractional position
                endSignal: endSignal,
                endPosition: endPosition,      // Fractional position
                style: style,
                color: tso.color || null,
                label: tso.label || null
            };
            doc.m_timeSpanMarkers.push(ts);

            if (id >= doc.m_nextTimeSpanMarkerId)
                doc.m_nextTimeSpanMarkerId = id + 1;
        }

        // Load arrows - supports both old (startSample/endSample) and new (startPosition/endPosition) formats
        const arrowArray = root.arrows || [];

        for (const ao of arrowArray) {
            const id = ao.id || 0;
            const startSignal = ao.startSignal;
            const endSignal = ao.endSignal;
            const style = ao.style || '~>';
            
            // Support both old integer (startSample) and new fractional (startPosition) formats
            // Old files used integer sample indices based on effectiveCount
            // New files use fractional positions (mainStep + fraction)
            let startPosition, endPosition;
            if (ao.startPosition !== undefined) {
                // New format: fractional positions
                startPosition = ao.startPosition;
                endPosition = ao.endPosition;
            } else if (ao.startSample !== undefined) {
                // Old format: integer sample indices - convert to fractional
                // Old effectiveCount = sampleCount * (globalSubSteps + 1)
                // Position = sampleIndex / (globalSubSteps + 1)
                const globalSubSteps = doc.m_subStepCount || 0;
                const divisor = globalSubSteps + 1;
                startPosition = ao.startSample / divisor;
                endPosition = ao.endSample / divisor;
            } else {
                continue; // Invalid arrow data
            }

            if (id <= 0)
                continue;
            if (startSignal < 0 || startSignal >= sigCount)
                continue;
            if (endSignal < 0 || endSignal >= sigCount)
                continue;
            if (startPosition < 0 || startPosition > doc.m_sampleCount)
                continue;
            if (endPosition < 0 || endPosition > doc.m_sampleCount)
                continue;

            const a = {
                id: id,
                startSignal: startSignal,
                startPosition: startPosition,  // Fractional position
                endSignal: endSignal,
                endPosition: endPosition,      // Fractional position
                style: style,
                color: ao.color || doc.m_arrowColor
            };
            doc.m_arrows.push(a);

            if (id >= doc.m_nextArrowId)
                doc.m_nextArrowId = id + 1;
        }

        // Compatibilidad: migrar archivos antiguos con grupos a nuevo formato
        const groupArray = root.groups || [];
        if (groupArray.length > 0) {
            // Archivo antiguo con grupos - migrar a groupName
            for (const go of groupArray) {
                const name = go.name || 'Group';
                const color = go.color || '#6496C8';
                const indicesArray = go.signalIndices || [];
                
                for (const idx of indicesArray) {
                    if (idx >= 0 && idx < doc.m_signals.length) {
                        // Solo asignar si la señal no tiene ya un groupName
                        if (!doc.m_signals[idx].groupName) {
                            doc.m_signals[idx].groupName = name;
                            doc.m_signals[idx].groupColor = color;
                        }
                    }
                }
            }
        }

        // Load text annotations - supports both old (sample) and new (position) formats
        const annArray = root.textAnnotations || [];
        for (const ao of annArray) {
            // Handle both legacy numeric and current string anchor types
            // Legacy: 0=Arrow, 1=Signal, 2=BlankRow, 3=FreeForm
            // Current: 'Arrow', 'Signal', 'BlankRow', 'FreeForm'
            let anchorType = ao.anchorType;
            if (typeof anchorType === 'number') {
                // Convert legacy numeric to string
                const anchorTypeMap = ['Arrow', 'Signal', 'BlankRow', 'FreeForm'];
                anchorType = anchorTypeMap[anchorType] || 'Signal';
            } else if (!anchorType) {
                anchorType = 'Signal'; // Default
            }
            
            // Handle vPos - can be string or legacy number
            let vPos = ao.vPos;
            if (typeof vPos === 'number') {
                const vPosMap = ['Above', 'Center', 'Below'];
                vPos = vPosMap[vPos] || 'Above';
            } else if (!vPos) {
                vPos = 'Above'; // Default
            }
            
            // Support both old (sample) and new (position) formats
            let position;
            if (ao.position !== undefined) {
                position = ao.position;
            } else if (ao.sample !== undefined) {
                // Old format: convert sample index to fractional position
                const maxSubSteps = doc.maxSubSteps ? doc.maxSubSteps() : doc.m_subStepCount;
                const divisor = maxSubSteps + 1;
                position = ao.sample / divisor;
            } else {
                position = 0;
            }
            
            const ann = {
                id: ao.id || 1,
                anchorType: anchorType,
                anchorId: ao.anchorId !== undefined ? ao.anchorId : -1,
                position: position,  // Fractional position
                vPos: vPos,
                text: ao.text || '',
                fontSize: ao.fontSize || 12,
                bold: ao.bold || false,
                color: ao.color || null,
                backgroundColor: ao.backgroundColor || null
            };

            doc.m_textAnnotations.push(ann);
            if (ann.id >= doc.m_nextTextAnnotationId)
                doc.m_nextTextAnnotationId = ann.id + 1;
        }

        // Freshly loaded content matches the file on disk
        doc.m_modified = false;
        return true;
    } catch (error) {
        console.error('Error loading file:', error);
        return false;
    }
}

/**
 * @brief Opens a file picker and loads the selected file.
 *
 * @param doc Target document to populate.
 * @return Promise that resolves to true if successful, false otherwise.
 */
async function openFile(doc) {
    // Prefer File System Access API when available (secure contexts)
    if (window.showOpenFilePicker) {
        try {
            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [
                    {
                        description: 'WavePaint files',
                        accept: { 'application/json': ['.wp', '.json'] }
                    }
                ]
            });

            if (!handle) return false;
            const file = await handle.getFile();
            const fileContent = await file.text();
            const success = loadFromFileContent(doc, fileContent);
            if (success) {
                doc._fileHandle = handle;
            }
            return success;
        } catch (error) {
            console.error('Error opening file:', error);
            return false;
        }
    }

    // Fallback: input element
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wp,.json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(input);
                resolve(false);
                return;
            }

            try {
                const fileContent = await file.text();
                const success = loadFromFileContent(doc, fileContent);
                document.body.removeChild(input);
                resolve(success);
            } catch (error) {
                console.error('Error reading file:', error);
                document.body.removeChild(input);
                resolve(false);
            }
        };

        input.oncancel = () => {
            if (input.parentNode) {
                document.body.removeChild(input);
            }
            resolve(false);
        };

        input.click();
    });
}

/**
 * Available example files with display names.
 */
const EXAMPLE_FILES = [
    { id: 'uart', name: 'UART', file: 'examples/uart.wp' },
    { id: 'spi', name: 'SPI', file: 'examples/spi.wp' },
    { id: 'i2c', name: 'I2C', file: 'examples/i2c.wp' },
    { id: 'axi', name: 'AXI', file: 'examples/axi.wp' },
    { id: 'amba_apb', name: 'AMBA APB', file: 'examples/amba_apb.wp' },
    { id: 'wishbone', name: 'Wishbone', file: 'examples/wishbone.wp' },
    { id: 'ddr_sdram', name: 'DDR SDRAM', file: 'examples/ddr_sdram.wp' },
    { id: 'pcie', name: 'PCIe', file: 'examples/pcie.wp' },
    { id: 'ethernet_mii', name: 'Ethernet MII', file: 'examples/ethernet_mii.wp' }
];

/**
 * @brief Gets the list of available examples.
 * @return Array of example objects with id, name, and file properties.
 */
function getExampleList() {
    return EXAMPLE_FILES;
}

/**
 * @brief Loads an example file from the examples folder.
 *
 * @param doc Target document to populate.
 * @param exampleId ID of the example (e.g., 'uart', 'spi', 'i2c').
 * @return Promise that resolves to true if successful, false otherwise.
 */
async function loadExample(doc, exampleId) {
    const example = EXAMPLE_FILES.find(e => e.id === exampleId);
    if (!example) {
        console.error('Unknown example:', exampleId);
        return false;
    }

    try {
        // Get the base URL for the app - handle various URL formats
        let baseUrl = window.location.origin + window.location.pathname;
        // Remove any file name (like index.html) from the path
        if (baseUrl.endsWith('.html') || baseUrl.endsWith('.htm')) {
            baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        } else if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }
        
        const fullUrl = baseUrl + example.file;
        console.log('Base URL:', baseUrl);
        console.log('Loading example from:', fullUrl);
        
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/plain, */*'
            }
        });
        
        console.log('Fetch response status:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('Failed to fetch example:', fullUrl, response.status, response.statusText);
            return false;
        }
        
        const fileContent = await response.text();
        console.log('Example content loaded, length:', fileContent.length);
        console.log('First 100 chars:', fileContent.substring(0, 100));
        
        const success = loadFromFileContent(doc, fileContent);
        console.log('Parse result:', success);
        return success;
    } catch (error) {
        console.error('Error loading example:', error);
        console.error('Error details:', error.message, error.stack);
        return false;
    }
}
