// WaveViewMouse.js - Mouse event handling

/**
 * Calcula la posición final para mover una señal individual.
 * 
 * REGLA FUNDAMENTAL:
 * - Una señal SIN grupo NO puede entrar a NINGÚN grupo bajo ningún concepto
 * - Solo puede moverse a posiciones que estén COMPLETAMENTE fuera de todos los grupos
 * - Los grupos son "bloques sólidos" que la señal debe saltar
 * 
 * LÓGICA: 
 * - Señal SIN grupo: solo puede ir a posiciones fuera de cualquier grupo
 * - Señal CON grupo: se mueve dentro de su grupo, saltando subgrupos
 */
function calculateSignalMoveTarget(currentIdx, targetIdx, signals, groups) {
    if (currentIdx === targetIdx) return currentIdx;
    
    const currentSig = signals[currentIdx];
    const signalGroupName = currentSig ? currentSig.groupName : null;
    
    // CASO: Señal CON grupo - se mueve dentro de su grupo pero salta sobre subgrupos
    if (signalGroupName && groups.length > 0) {
        // Encontrar el grupo exacto de esta señal
        let signalGroup = null;
        for (const g of groups) {
            if (g.name === signalGroupName) {
                signalGroup = g;
                break;
            }
        }
        
        if (!signalGroup) {
            return targetIdx;
        }
        
        // Limitar al rango del grupo
        let clampedTarget = Math.max(signalGroup.startIndex, Math.min(signalGroup.endIndex, targetIdx));
        
        // Encontrar subgrupos directos (hijos inmediatos) de este grupo
        const prefix = signalGroupName + '/';
        const childGroups = groups.filter(g => {
            if (!g.name.startsWith(prefix)) return false;
            // Verificar que sea hijo directo (no nieto)
            const remainder = g.name.substring(prefix.length);
            return !remainder.includes('/');
        });
        
        if (childGroups.length === 0) {
            return clampedTarget;
        }
        
        const movingDown = targetIdx > currentIdx;
        
        // Verificar si el target cae dentro de algún subgrupo hijo
        for (const child of childGroups) {
            if (clampedTarget >= child.startIndex && clampedTarget <= child.endIndex) {
                // El target está dentro de un subgrupo - saltar al otro lado
                if (movingDown) {
                    // Saltar DESPUÉS del subgrupo
                    clampedTarget = child.endIndex + 1;
                    // Verificar que no exceda el límite del grupo padre
                    if (clampedTarget > signalGroup.endIndex) {
                        clampedTarget = signalGroup.endIndex;
                    }
                } else {
                    // Saltar ANTES del subgrupo
                    clampedTarget = child.startIndex - 1;
                    // Verificar que no sea menor que el inicio del grupo padre
                    if (clampedTarget < signalGroup.startIndex) {
                        clampedTarget = signalGroup.startIndex;
                    }
                }
                break;
            }
        }
        
        return clampedTarget;
    }
    
    // CASO: Señal SIN grupo - puede posicionarse ENTRE grupos
    // IMPORTANTE: Cuando movemos una señal, primero se ELIMINA de currentIdx,
    // lo que hace que todos los grupos después de currentIdx se desplacen hacia arriba.
    // Debemos calcular las posiciones de los grupos DESPUÉS de la eliminación.
    // El targetIdx usado por splice() ya opera en el array "post-eliminación".
    const movingDown = targetIdx > currentIdx;
    const movingUp = targetIdx < currentIdx;
    
    // Obtener grupos raíz ordenados por posición
    const rawGroups = groups.filter(g => 
        typeof GroupManager === 'undefined' || !GroupManager.getParentGroupName(g.name)
    ).sort((a, b) => a.startIndex - b.startIndex);
    
    if (rawGroups.length === 0) {
        return targetIdx;
    }
    
    // Ajustar las posiciones de los grupos para reflejar dónde estarán DESPUÉS de eliminar la señal
    // Cualquier grupo cuyo startIndex > currentIdx se desplazará -1
    const adjustedGroups = rawGroups.map(g => {
        const shift = g.startIndex > currentIdx ? -1 : 0;
        return {
            name: g.name,
            startIndex: g.startIndex + shift,
            endIndex: g.endIndex + shift
        };
    });
    
    console.log('[SIGNAL MOVE] currentIdx:', currentIdx, 'targetIdx:', targetIdx);
    console.log('[SIGNAL MOVE] adjustedGroups:', adjustedGroups.map(g => `${g.name}[${g.startIndex}-${g.endIndex}]`).join(', '));
    
    // Función para verificar si un índice está ESTRICTAMENTE dentro de un grupo ajustado
    // "Estrictamente dentro" significa que insertar ahí pondría la señal ENTRE miembros del grupo
    // startIndex es válido (insertar ahí empuja todo el grupo hacia abajo)
    // endIndex+1 es válido (insertar ahí pone la señal DESPUÉS del grupo)
    function isStrictlyInsideAdjustedGroup(idx) {
        for (const g of adjustedGroups) {
            // idx > startIndex: no está antes del grupo
            // idx <= endIndex: está en o antes del último miembro
            // Combinado: está entre el primer y último miembro (inclusive del último)
            if (idx > g.startIndex && idx <= g.endIndex) {
                return g;
            }
        }
        return null;
    }
    
    // Verificar si targetIdx está estrictamente dentro de algún grupo ajustado
    let blockingGroup = isStrictlyInsideAdjustedGroup(targetIdx);
    if (!blockingGroup) {
        console.log('[SIGNAL MOVE] Target is valid (outside groups), using:', targetIdx);
        return targetIdx;
    }
    
    console.log('[SIGNAL MOVE] Target is strictly inside group:', blockingGroup.name, `[${blockingGroup.startIndex}-${blockingGroup.endIndex}]`);
    
    // El target está estrictamente dentro de un grupo - saltar al borde apropiado
    let finalTarget;
    
    if (movingDown) {
        // Saltar DESPUÉS del grupo (endIndex + 1 en el espacio ajustado)
        finalTarget = blockingGroup.endIndex + 1;
        console.log('[SIGNAL MOVE] Moving down, jumping to:', finalTarget);
        
        // Seguir saltando si el nuevo target está estrictamente dentro de otro grupo
        let safety = adjustedGroups.length + 1;
        while (safety > 0) {
            safety--;
            const nextBlock = isStrictlyInsideAdjustedGroup(finalTarget);
            if (!nextBlock) break;
            console.log('[SIGNAL MOVE] Still inside group:', nextBlock.name, ', jumping to:', nextBlock.endIndex + 1);
            finalTarget = nextBlock.endIndex + 1;
        }
    } else {
        // Moviendo hacia arriba - saltar al startIndex del grupo (antes del grupo)
        finalTarget = blockingGroup.startIndex;
        console.log('[SIGNAL MOVE] Moving up, jumping to startIndex:', finalTarget);
    }
    
    console.log('[SIGNAL MOVE] Final target:', finalTarget);
    
    // Verificar límites (en el espacio del array post-eliminación, que tiene signals.length - 1 elementos)
    if (finalTarget < 0) {
        console.log('[SIGNAL MOVE] Invalid target < 0, staying at:', currentIdx);
        return currentIdx;
    }
    if (finalTarget >= signals.length) {
        // El máximo índice válido para insertar es signals.length - 1 (al final)
        console.log('[SIGNAL MOVE] Target at end, using:', signals.length - 1);
        return signals.length - 1;
    }
    
    return finalTarget;
}

/**
 * Main mouse event handler
 */
async function handleMouseEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const signals = document_wave.signalList();
    const subStepCount = document_wave.subStepCount();
    const divisor = subStepCount + 1;
    const effectiveCount = document_wave.effectiveSampleCount();
    const stepWidth = waveCellWidth / divisor;
    const mainCellWidth = waveCellWidth;
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();
    
    const clickedOnName = mouseX < nameWidth && mouseX >= 0;
    const signalIndex = Math.floor((mouseY - signalStartY) / rowHeight);
    
    // Calculate bracket area width dynamically
    const groups = typeof GroupManager !== 'undefined' ? GroupManager.getGroups(document_wave) : [];
    const maxGroupDepth = groups.reduce((max, g) => Math.max(max, (g.depth || 0) + 1), 0);
    const bracketAreaWidth = maxGroupDepth > 0 ? (64 + maxGroupDepth * 36 + 20) : 0;
    
    // Check for clicks on group brackets (use dynamic bracket area)
    if (e.type === 'mousedown' && e.button === 0 && clickedOnName && mouseX < bracketAreaWidth) {
        const hitGroup = typeof GroupManager !== 'undefined' && GroupManager.hitTestGroupBracket
            ? GroupManager.hitTestGroupBracket(document_wave, mouseX, mouseY, signalStartY, rowHeight, signals)
            : null;
        
        if (hitGroup) {
            e.preventDefault();
            e.stopPropagation();
            
            // Usar getSignalsInGroupRecursive para incluir señales de subgrupos
            // Así al mover un grupo padre, se mueven todos sus hijos también
            const groupSignalIndices = GroupManager.getSignalsInGroupRecursive(document_wave, hitGroup.name);
            if (groupSignalIndices.length > 0) {
                selectedSignalIndices = [...groupSignalIndices].sort((a, b) => a - b);
                lastSelectedSignalIndex = selectedSignalIndices[0];
                
                pendingMoveSignal = true;
                pendingMoveSignalIndex = selectedSignalIndices[0];
                pendingDragStartPos = { x: mouseX, y: mouseY };
                pendingMoveGroup = hitGroup;
                
                drawWaveform();
            }
            return;
        }
    }
    
    // Signal selection and dragging in name area
    if (e.type === 'mousedown' && e.button === 0 && clickedOnName && signalIndex >= 0 && signalIndex < signals.length) {
        if (e.ctrlKey || e.metaKey) {
            const idx = selectedSignalIndices.indexOf(signalIndex);
            if (idx >= 0) {
                selectedSignalIndices.splice(idx, 1);
            } else {
                selectedSignalIndices.push(signalIndex);
            }
            lastSelectedSignalIndex = signalIndex;
            drawWaveform();
        } else if (e.shiftKey && lastSelectedSignalIndex >= 0) {
            const start = Math.min(lastSelectedSignalIndex, signalIndex);
            const end = Math.max(lastSelectedSignalIndex, signalIndex);
            selectedSignalIndices = [];
            for (let i = start; i <= end; i++) {
                selectedSignalIndices.push(i);
            }
            drawWaveform();
        } else {
            pendingMoveSignal = true;
            pendingMoveSignalIndex = signalIndex;
            pendingDragStartPos = { x: mouseX, y: mouseY };
        }
        
        if (typeof selectSignal === 'function') {
            selectSignal(-1);
        } else if (typeof selectedSignalIndex !== 'undefined') {
            selectedSignalIndex = -1;
            if (typeof updateColorPicker === 'function') {
                updateColorPicker();
            }
        }
        console.log('Signal click:', signalIndex, 'ctrl:', e.ctrlKey, 'shift:', e.shiftKey);
        return;
    }

    if (clickedOnName && e.type === 'mousedown') {
        return;
    }
    
    // Clear signal name selection when clicking on waveform area
    if (e.type === 'mousedown' && !clickedOnName && selectedSignalIndices.length > 0) {
        selectedSignalIndices = [];
        lastSelectedSignalIndex = -1;
        drawWaveform();
    }
    
    // Tool-specific handling
    if (currentTool !== 'arrow' && currentTool !== 'text' && currentTool !== 'cut' && currentTool !== 'select' && currentTool !== 'select-object') {
        if (signalIndex < 0 || signalIndex >= signals.length) return;
    }

    const signal = signalIndex >= 0 && signalIndex < signals.length ? signals[signalIndex] : null;
    
    // Calculate per-signal substeps (signal's own or global)
    const signalSubSteps = signal && signal.subSteps > 0 ? signal.subSteps : subStepCount;
    const signalDivisor = signalSubSteps + 1;
    const signalStepWidth = waveCellWidth / signalDivisor;
    const signalEffectiveCount = document_wave.m_sampleCount * signalDivisor;
    
    // Use unified coordinate mapping
    // For overlays (arrow, time-span, marker, time-jump), use maxSubSteps for consistent snapping
    const useMaxSubStepsForTool = currentTool === 'arrow' || currentTool === 'time-span' || currentTool === 'marker' || currentTool === 'time-jump';
    const pos = mapCanvasPosition(mouseX, mouseY, { 
        snapToEdge: currentTool === 'arrow' || currentTool === 'time-span' || currentTool === 'cut',
        useGlobalOnly: currentTool === 'cut',
        useMaxSubSteps: useMaxSubStepsForTool
    });
    
    // Calculate sample index based on tool
    // - Paint/Erase: use signalSampleIndex (each signal has its own array)
    // - Arrow/TimeSpan/Marker: use globalSampleIndex (shared coordinate system)
    // - Cut: use globalSampleIndex (affects all signals)
    // - Select: use signalSampleIndex (for copying signal data)
    let sampleIndex;
    if (currentTool === 'arrow' || currentTool === 'time-span' || currentTool === 'marker' || currentTool === 'cut') {
        // Global tools use globalSampleIndex
        sampleIndex = pos ? pos.globalSampleIndex : -1;
    } else {
        // Paint, erase, select use signalSampleIndex
        sampleIndex = pos ? pos.signalSampleIndex : -1;
        if (!clickedOnName && !pos) return;
    }

    // Handle different event types
    if (e.type === 'mousedown') {
        await handleMouseDown(e, signals, signalIndex, signal, sampleIndex, signalEffectiveCount, signalStepWidth, signalSubSteps, rowHeight, signalStartY, nameWidth, clickedOnName, pos);
    } else if (e.type === 'mousemove') {
        handleMouseMove(e, signals, signalIndex, signal, sampleIndex, signalEffectiveCount, signalStepWidth, signalSubSteps, rowHeight, signalStartY, nameWidth, clickedOnName, mouseX, mouseY, pos);
    } else if (e.type === 'mouseup') {
        await handleMouseUp(e, signals, signalIndex, signal, sampleIndex);
    }
}

/**
 * Handle mouse down events
 */
async function handleMouseDown(e, signals, signalIndex, signal, sampleIndex, effectiveCount, stepWidth, subStepCount, rowHeight, signalStartY, nameWidth, clickedOnName, pos) {
    // Cut tool
    if (currentTool === 'cut') {
        console.log('[CUT] mousedown - sampleIndex:', sampleIndex, 'cutHasStart:', cutHasStart);
        if (sampleIndex < 0) return;
        
        if (!cutHasStart) {
            cutHasStart = true;
            cutStartSample = sampleIndex;
            cutPreviewSample = sampleIndex;
            drawWaveform();
        } else {
            cutPreviewSample = sampleIndex;
            const startSample = Math.min(cutStartSample, sampleIndex);
            const endSample = Math.max(cutStartSample, sampleIndex);
            
            if (startSample !== endSample) {
                // Scissor removes the selected part and keeps the rest (issue #7)
                const confirmed = await wpConfirm(
                    `Remove waveform from sample ${startSample} to ${endSample}?`,
                    'Cut Range'
                );

                if (confirmed) {
                    document_wave.deleteRange(startSample, endSample);
                }
            }
            
            cutHasStart = false;
            cutStartSample = -1;
            cutPreviewSample = -1;
            drawWaveform();
        }
        return;
    }

    // Select tool
    if (currentTool === 'select') {
        if (!clickedOnName && signalIndex >= 0 && signalIndex < signals.length) {
            const mapped = mapToSignalSample(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
            if (mapped) {
                rangeSelActive = false;
                rangeSelecting = true;
                rangeSelStartSignal = signalIndex;
                rangeSelStartSample = mapped.sampleIndex;
                rangeSelEndSignal = signalIndex;
                rangeSelEndSample = mapped.sampleIndex;
                pastePreviewSignal = -1;
                pastePreviewSample = -1;
                drawWaveform();
                return;
            }
        }
    }

    // Select object tool
    if (currentTool === 'select-object') {
        await handleSelectObjectClick(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top, signals, clickedOnName, signalIndex);
        return;
    }

    // Time span tool - uses fractional positions
    if (currentTool === 'time-span') {
        const tsPos = mapCanvasPosition(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top, { snapToEdge: true, useMaxSubSteps: true });
        if (!tsPos || tsPos.signalIndex < 0 || tsPos.position < 0) return;

        const sig = signals[tsPos.signalIndex];
        // BlankRow is now allowed for time spans

        if (!timeSpanHasStart) {
            timeSpanHasStart = true;
            timeSpanStartSignal = tsPos.signalIndex;
            timeSpanStartPosition = tsPos.position;
            timeSpanPreviewSignal = tsPos.signalIndex;
            timeSpanPreviewPosition = tsPos.position;
            drawWaveform();
            return;
        }

        // Second click - create time span
        const startSignal = timeSpanStartSignal;
        const endSignal = tsPos.signalIndex;
        const sampleCount = document_wave.sampleCount();
        const startPosition = Math.max(0, Math.min(timeSpanStartPosition, sampleCount));
        const endPosition = Math.max(0, Math.min(tsPos.position, sampleCount));

        const styleOptions = [
            { value: '-|', label: 'L-Shape ⌐' },
            { value: '|-', label: 'Corner └' },
            { value: '-|-', label: 'Z-Shape ⌐└' }
        ];
        const style = await showStylePickerDialog(styleOptions, '-|', 'Time Span Style');
        
        if (!style) {
            timeSpanHasStart = false;
            timeSpanStartSignal = -1;
            timeSpanStartPosition = -1;
            timeSpanPreviewSignal = -1;
            timeSpanPreviewPosition = -1;
            drawWaveform();
            return;
        }

        document_wave.addTimeSpanMarker(startSignal, startPosition, endSignal, endPosition, style);

        timeSpanHasStart = false;
        timeSpanStartSignal = -1;
        timeSpanStartPosition = -1;
        timeSpanPreviewSignal = -1;
        timeSpanPreviewPosition = -1;
        drawWaveform();
        return;
    }

    // Marker tool - uses fractional positions
    if (currentTool === 'marker') {
        const markerPos = mapCanvasPosition(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top, { snapToEdge: true, useMaxSubSteps: true });
        if (!markerPos || markerPos.position < 0) return;
        document_wave.addMarker(markerPos.position);
        markerPreviewPosition = markerPos.position;
        drawWaveform();
        return;
    }

    // Time jump tool - uses fractional positions
    if (currentTool === 'time-jump') {
        const tjPos = mapCanvasPosition(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top, { snapToEdge: true, useMaxSubSteps: true });
        if (!tjPos || tjPos.position < 0) return;
        document_wave.addTimeJump(tjPos.position);
        timeJumpPreviewPosition = tjPos.position;
        drawWaveform();
        return;
    }

    // Text tool
    if (currentTool === 'text') {
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;
        const arrowId = findArrowNearPoint(mouseX, mouseY);
        if (arrowId >= 0) {
            const text = await wpPrompt('Text:', '', 'Add Text to Arrow');
            if (text && text.trim()) {
                document_wave.addTextAnnotation('Arrow', arrowId, text.trim(), 0, 'Above');
                drawWaveform();
            }
            return;
        }

        const textPos = mapCanvasPosition(mouseX, mouseY, { snapToEdge: true, useMaxSubSteps: true });
        if (!textPos || textPos.signalIndex < 0 || textPos.position < 0) return;

        const sig = signals[textPos.signalIndex];
        const rowTop = signalStartY + textPos.signalIndex * rowHeight;
        const rowCenter = rowTop + rowHeight / 2;
        let vPos = 'Center';

        if (sig && sig.type !== SignalType.BlankRow) {
            if (mouseY < rowCenter - rowHeight / 4) {
                vPos = 'Above';
            } else if (mouseY > rowCenter + rowHeight / 4) {
                vPos = 'Below';
            }
        }

        const text = await wpPrompt('Text:', '', 'Add Text Annotation');
        if (text && text.trim()) {
            const anchorType = (sig && sig.type === SignalType.BlankRow) ? 'BlankRow' : 'Signal';
            // Use fractional position (like markers/time jumps)
            document_wave.addTextAnnotation(anchorType, textPos.signalIndex, text.trim(), textPos.position, vPos);
            drawWaveform();
        }
        return;
    }

    // Arrow tool - uses fractional positions (pos.position)
    if (currentTool === 'arrow') {
        if (signalIndex < 0 || signalIndex >= signals.length) return;
        if (!signal) return;
        // BlankRow is now allowed for arrows
        
        // Get fractional position from unified mapping
        const arrowPos = pos ? pos.position : -1;
        if (arrowPos < 0) return;
        
        if (!arrowHasStart) {
            arrowHasStart = true;
            arrowStartSignal = signalIndex;
            arrowStartPosition = arrowPos;
            arrowPreviewSignal = signalIndex;
            arrowPreviewPosition = arrowPos;
            console.log('Arrow start:', arrowStartSignal, arrowStartPosition);
            drawWaveform();
        } else {
            const arrowId = document_wave.addArrow(
                arrowStartSignal, arrowStartPosition,
                signalIndex, arrowPos
            );
            console.log('Arrow created:', arrowId, 'from', arrowStartSignal, arrowStartPosition, 'to', signalIndex, arrowPos);
            
            if (arrowId >= 0 && typeof getSelectedPaintColor === 'function' && getSelectedPaintColor()) {
                document_wave.setArrowColorById(arrowId, getSelectedPaintColor());
            }
            
            arrowHasStart = false;
            arrowStartSignal = -1;
            arrowStartPosition = -1;
            arrowPreviewSignal = -1;
            arrowPreviewPosition = -1;
            drawWaveform();
        }
        return;
    }
    
    // Paint/Erase tools - each signal has its own independent array
    if (currentTool === 'paint' && signal && signal.type === SignalType.Bit) {
        const WaveValue = window.WaveDromConstants?.WaveValue || {
            LOW: 0, HIGH: 1, UNDEFINED: -1, HIGHZ: 2, PULLUP: 3, PULLDOWN: 4
        };
        const bitState = typeof getCurrentBitState === 'function' ? getCurrentBitState() : '1';
        const currentValue = signal.values[sampleIndex];
        let newValue;

        if (bitState === '0' || bitState === '1') {
            // Toggle 0↔1; if current is not 0/1, paint selected value
            if (currentValue === WaveValue.LOW) newValue = WaveValue.HIGH;
            else if (currentValue === WaveValue.HIGH) newValue = WaveValue.LOW;
            else newValue = bitStateToValue(bitState);
        } else if (bitState === 'u' || bitState === 'd') {
            // Toggle u↔d; if current is not u/d, paint selected value
            if (currentValue === WaveValue.PULLUP) newValue = WaveValue.PULLDOWN;
            else if (currentValue === WaveValue.PULLDOWN) newValue = WaveValue.PULLUP;
            else newValue = bitStateToValue(bitState);
        } else {
            // z or x: paint directly, no toggle
            newValue = bitStateToValue(bitState);
        }

        if (newValue !== currentValue) {
            if (!paintUndoActive) {
                document_wave.pushUndoSnapshot();
                paintUndoActive = true;
            }
            signal.values[sampleIndex] = newValue;

            if (signal.driveStrengths) {
                const DriveStrengthEnum = typeof DriveStrength !== 'undefined' ? DriveStrength : { Strong: 0, Weak: 1, WeakMarker: 2 };
                if (newValue === WaveValue.PULLUP || newValue === WaveValue.PULLDOWN) {
                    signal.driveStrengths[sampleIndex] = DriveStrengthEnum.Weak;
                } else {
                    signal.driveStrengths[sampleIndex] = DriveStrengthEnum.Strong;
                }
            }
        }

        lastSampleIndex = sampleIndex;
        lastSignalIndex = signalIndex;
        drawWaveform();
    } else if (currentTool === 'erase' && signal && signal.type === SignalType.Bit) {
        if (!paintUndoActive) {
            document_wave.pushUndoSnapshot();
            paintUndoActive = true;
        }
        
        // Erase directly at the index - each signal has its own array
        signal.values[sampleIndex] = -1;
        
        lastSampleIndex = sampleIndex;
        lastSignalIndex = signalIndex;
        drawWaveform();
    } else if (currentTool === 'paint' && signal && signal.type === SignalType.Vector) {
        vectorSelecting = true;
        vectorSelSignal = signalIndex;
        vectorSelStartSample = sampleIndex;
        vectorSelCurrentSample = sampleIndex;
        drawWaveform();
    } else if (currentTool === 'erase' && signal && signal.type === SignalType.Vector) {
        if (!paintUndoActive) {
            document_wave.pushUndoSnapshot();
            paintUndoActive = true;
        }
        
        // Erase directly at the index - each signal has its own array
        signal.values[sampleIndex] = -1;
        signal.labels[sampleIndex] = document_wave.valueToLabel(-1, signal.radix);
        
        lastSampleIndex = sampleIndex;
        lastSignalIndex = signalIndex;
        drawWaveform();
    }
}

/**
 * Handle select-object tool click
 * Also initiates dragging for movable objects (TextAnnotation, Marker, TimeJump)
 */
async function handleSelectObjectClick(mouseX, mouseY, signals, clickedOnName, signalIndex) {
    // Check for movable objects first (TextAnnotation, Marker, TimeJump)
    // These can be dragged to move them
    
    if (typeof hitTestTextAnnotation === 'function') {
        const textAnn = hitTestTextAnnotation(mouseX, mouseY);
        if (textAnn) {
            if (typeof selectObject === 'function') {
                selectObject(SelectableType.TextAnnotation, textAnn.id);
            }
            // Start dragging for text annotations (except Arrow-anchored ones)
            const annotation = document_wave.textAnnotationList().find(a => a.id === textAnn.id);
            if (annotation && annotation.anchorType !== 'Arrow') {
                isDraggingObject = true;
                draggingObjectType = SelectableType.TextAnnotation;
                draggingObjectId = textAnn.id;
                dragObjectStartPos = { x: mouseX, y: mouseY };
                dragObjectStartSample = annotation.position;  // Use position, not sample
                dragObjectStartSignal = annotation.anchorId;
                dragObjectUndoSaved = false;  // Reset undo flag for new drag
            }
            drawWaveform();
            return;
        }
    }
    
    if (typeof hitTestMarker === 'function') {
        const marker = hitTestMarker(mouseX, mouseY);
        if (marker) {
            if (typeof selectObject === 'function') {
                selectObject(SelectableType.Marker, marker.id);
            }
            // Start dragging for markers
            const markerObj = document_wave.markerList().find(m => m.id === marker.id);
            if (markerObj) {
                isDraggingObject = true;
                draggingObjectType = SelectableType.Marker;
                draggingObjectId = marker.id;
                dragObjectStartPos = { x: mouseX, y: mouseY };
                dragObjectStartSample = markerObj.position;  // Use position, not sample
                dragObjectUndoSaved = false;  // Reset undo flag for new drag
            }
            drawWaveform();
            return;
        }
    }
    
    if (typeof hitTestTimeJump === 'function') {
        const timeJump = hitTestTimeJump(mouseX, mouseY);
        if (timeJump) {
            if (typeof selectObject === 'function') {
                selectObject(SelectableType.TimeJump, timeJump.id);
            }
            // Start dragging for time jumps
            const timeJumpObj = document_wave.timeJumpList().find(tj => tj.id === timeJump.id);
            if (timeJumpObj) {
                isDraggingObject = true;
                draggingObjectType = SelectableType.TimeJump;
                draggingObjectId = timeJump.id;
                dragObjectStartPos = { x: mouseX, y: mouseY };
                dragObjectStartSample = timeJumpObj.position;  // Use position, not sample
                dragObjectUndoSaved = false;  // Reset undo flag for new drag
            }
            drawWaveform();
            return;
        }
    }
    
    // Arrow endpoints are draggable so arrows can be re-placed without
    // deleting and redrawing them (issue #7)
    if (typeof hitTestArrowEndpoint === 'function') {
        const arrowEndpoint = hitTestArrowEndpoint(mouseX, mouseY);
        if (arrowEndpoint) {
            if (typeof selectObject === 'function') {
                selectObject(SelectableType.Arrow, arrowEndpoint.arrow.id);
            }
            isDraggingObject = true;
            draggingObjectType = SelectableType.Arrow;
            draggingObjectId = arrowEndpoint.arrow.id;
            draggingArrowEndpoint = arrowEndpoint.endpoint;
            dragObjectStartPos = { x: mouseX, y: mouseY };
            dragObjectUndoSaved = false;
            drawWaveform();
            return;
        }
    }

    // Non-movable objects (Arrow body, TimeSpan)
    const arrowId = findArrowNearPoint(mouseX, mouseY);
    if (arrowId >= 0) {
        if (typeof selectObject === 'function') {
            selectObject(SelectableType.Arrow, arrowId);
        }
        drawWaveform();
        return;
    }
    
    if (typeof hitTestTimeSpan === 'function') {
        const timeSpan = hitTestTimeSpan(mouseX, mouseY);
        if (timeSpan) {
            if (typeof selectObject === 'function') {
                selectObject(SelectableType.TimeSpan, timeSpan.id);
            }
            drawWaveform();
            return;
        }
    }
    
    // Clock edge selection - check if clicking near a clock edge transition
    if (typeof hitTestClockEdge === 'function' && !clickedOnName) {
        const clockEdge = hitTestClockEdge(mouseX, mouseY);
        if (clockEdge) {
            // Check if signal has edgeArrow enabled - block selection if so
            const edgeSignal = signals[clockEdge.signalIndex];
            const edgeArrowValue = edgeSignal ? edgeSignal.edgeArrow : undefined;
            const hasEdgeArrow = edgeArrowValue && edgeArrowValue !== 'none';
            
            if (hasEdgeArrow) {
                // Show warning toast - polarity not available when edgeArrow is active
                const edgeLabel = edgeArrowValue === 'positive' ? 'Rising' : 'Falling';
                if (typeof showToast === 'function') {
                    showToast(`Polarity not available. Signal has ${edgeLabel} Edge markers enabled.`, 'warning');
                }
                return; // Don't select
            }
            
            if (typeof selectObject === 'function') {
                selectObject(SelectableType.ClockEdge, null, clockEdge);
            }
            drawWaveform();
            return;
        }
    }
    
    if (clickedOnName && signalIndex >= 0 && signalIndex < signals.length) {
        if (typeof selectObject === 'function') {
            selectObject(SelectableType.Signal, signalIndex);
        }
        drawWaveform();
        return;
    }
    
    if (typeof clearObjectSelection === 'function') {
        clearObjectSelection();
    }
    drawWaveform();
}

/**
 * Handle mouse move events
 */
function handleMouseMove(e, signals, signalIndex, signal, sampleIndex, effectiveCount, stepWidth, subStepCount, rowHeight, signalStartY, nameWidth, clickedOnName, mouseX, mouseY, pos) {
    // Cut tool
    if (currentTool === 'cut') {
        const previewSample = mapXToSample(mouseX);
        console.log('[CUT] mousemove previewSample:', previewSample, 'cutHasStart:', cutHasStart);
        if (previewSample >= 0) {
            cutPreviewSample = previewSample;
        } else if (!cutHasStart) {
            cutPreviewSample = -1;
        }
        drawWaveform();
        return;
    }

    // Object dragging (TextAnnotation, Marker, TimeJump)
    // All dragging snaps to maxSubSteps grid (maximum resolution in the canvas)
    if (isDraggingObject && isMouseDown && currentTool === 'select-object') {
        // Convert mouse X to fractional position
        const rawPosition = pixelXToPosition(mouseX);
        const sampleCount = document_wave.m_sampleCount;
        
        // Use maxSubSteps - the maximum substep resolution across all signals
        // This ensures objects can be placed at any visible grid position
        const maxSubSteps = document_wave.maxSubSteps ? document_wave.maxSubSteps() : document_wave.subStepCount();
        
        // Snap position to maxSubSteps grid
        const snappedPosition = snapPositionToSignalGrid(rawPosition, maxSubSteps);
        const clampedPosition = Math.max(0, Math.min(sampleCount, snappedPosition));
        
        // Save undo only once at the start of dragging
        const saveUndo = !dragObjectUndoSaved;
        if (saveUndo) {
            dragObjectUndoSaved = true;
        }
        
        if (draggingObjectType === SelectableType.Marker) {
            // Markers use fractional positions
            document_wave.setMarkerPosition(draggingObjectId, clampedPosition, saveUndo);
        } else if (draggingObjectType === SelectableType.TimeJump) {
            // Time jumps use fractional positions
            document_wave.setTimeJumpPosition(draggingObjectId, clampedPosition, saveUndo);
        } else if (draggingObjectType === SelectableType.TextAnnotation) {
            const annotation = document_wave.textAnnotationList().find(a => a.id === draggingObjectId);
            if (annotation && (annotation.anchorType === 'Signal' || annotation.anchorType === 'BlankRow')) {
                // Text annotations now use fractional positions (like markers)
                // Also allow changing signal row during drag
                const newSignalIndex = Math.max(0, Math.min(signals.length - 1, signalIndex));
                document_wave.setTextAnnotationPosition(draggingObjectId, clampedPosition, newSignalIndex, saveUndo);
            }
            // Arrow-anchored annotations cannot be dragged (they follow the arrow)
        } else if (draggingObjectType === SelectableType.Arrow && draggingArrowEndpoint) {
            // Drag an arrow head to a new position/signal (issue #7)
            const arrow = document_wave.arrowList().find(a => a.id === draggingObjectId);
            if (arrow) {
                if (saveUndo) document_wave.pushUndoSnapshot();
                const newSignalIndex = signalIndex >= 0
                    ? Math.min(signals.length - 1, signalIndex)
                    : (draggingArrowEndpoint === 'start' ? arrow.startSignal : arrow.endSignal);
                if (draggingArrowEndpoint === 'start') {
                    arrow.startPosition = clampedPosition;
                    arrow.startSignal = newSignalIndex;
                } else {
                    arrow.endPosition = clampedPosition;
                    arrow.endSignal = newSignalIndex;
                }
            }
        }
        drawWaveform();
        return;
    }

    // Signal drag
    if (pendingMoveSignal && isMouseDown) {
        const dx = mouseX - pendingDragStartPos.x;
        const dy = mouseY - pendingDragStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= 5) {
            isMovingSignal = true;
            moveSignalIndex = pendingMoveSignalIndex;
            lastRawDragIndex = pendingMoveSignalIndex; // Initialize with current position
            pendingMoveSignal = false;
            pendingMoveSignalIndex = -1;
        }
    }

    // Update signal drag position
    if (isMovingSignal && isMouseDown) {
        const newIdx = Math.floor((mouseY - signalStartY) / rowHeight);
        const clampedIdx = Math.max(0, Math.min(signals.length - 1, newIdx));
        
        // Only process if the raw visual index has changed (prevents wobbling)
        if (clampedIdx === lastRawDragIndex) {
            return;
        }
        lastRawDragIndex = clampedIdx;
        
        const isMultiMove = selectedSignalIndices.length > 1 && selectedSignalIndices.includes(moveSignalIndex);
        
        if (isMultiMove) {
            handleMultiSignalDrag(clampedIdx);
        } else {
            // Movimiento de señal individual - calcular destino final
            const groups = typeof GroupManager !== 'undefined' ? GroupManager.getGroups(document_wave) : [];
            
            // Calcular posición final con lógica de salto
            const finalTargetIdx = calculateSignalMoveTarget(moveSignalIndex, clampedIdx, signals, groups);
            
            if (finalTargetIdx !== moveSignalIndex) {
                document_wave.moveSignal(moveSignalIndex, finalTargetIdx);
                moveSignalIndex = finalTargetIdx;
                if (selectedSignalIndices.length === 1) {
                    selectedSignalIndices = [finalTargetIdx];
                }
                drawWaveform();
            }
        }
        return;
    }

    // Time span preview - uses fractional position
    if (currentTool === 'time-span') {
        const tsPos = mapCanvasPosition(mouseX, mouseY, { snapToEdge: true, useMaxSubSteps: true });
        if (tsPos && tsPos.signalIndex >= 0 && signals[tsPos.signalIndex]) {
            // BlankRow is now allowed for time spans
            timeSpanPreviewSignal = tsPos.signalIndex;
            timeSpanPreviewPosition = tsPos.position;
        } else {
            timeSpanPreviewSignal = -1;
            timeSpanPreviewPosition = -1;
        }
        if (timeSpanHasStart) {
            drawWaveform();
        }
        return;
    }

    // Select tool
    if (currentTool === 'select') {
        if (rangeSelecting && isMouseDown) {
            const mapped = mapToSignalSample(mouseX, mouseY);
            if (mapped) {
                rangeSelEndSignal = Math.max(0, Math.min(signals.length - 1, mapped.signalIndex));
                rangeSelEndSample = Math.max(0, Math.min(effectiveCount - 1, mapped.sampleIndex));
                drawWaveform();
            }
            return;
        }
        
        if (clipboard && !rangeSelecting) {
            const mapped = mapToSignalSample(mouseX, mouseY);
            if (mapped && !clickedOnName) {
                pastePreviewSignal = mapped.signalIndex;
                pastePreviewSample = mapped.sampleIndex;
                drawWaveform();
            } else {
                if (pastePreviewSignal >= 0 || pastePreviewSample >= 0) {
                    pastePreviewSignal = -1;
                    pastePreviewSample = -1;
                    drawWaveform();
                }
            }
            return;
        }
    }

    // Text tool
    if (currentTool === 'text') {
        const arrowId = findArrowNearPoint(mouseX, mouseY);
        if (arrowId >= 0) {
            textAnnotationPreviewArrow = arrowId;
            textAnnotationPreviewSignal = -1;
            textAnnotationPreviewPosition = -1;
            drawWaveform();
            return;
        }

        const textPos = mapCanvasPosition(mouseX, mouseY, { snapToEdge: true, useMaxSubSteps: true });
        if (textPos && textPos.signalIndex >= 0) {
            textAnnotationPreviewArrow = -1;
            textAnnotationPreviewSignal = textPos.signalIndex;
            textAnnotationPreviewPosition = textPos.position;

            const rowTop = signalStartY + textPos.signalIndex * rowHeight;
            const rowCenter = rowTop + rowHeight / 2;
            if (signals[textPos.signalIndex].type === SignalType.BlankRow) {
                textAnnotationPreviewVPos = 'Center';
            } else if (mouseY < rowCenter - rowHeight / 4) {
                textAnnotationPreviewVPos = 'Above';
            } else if (mouseY > rowCenter + rowHeight / 4) {
                textAnnotationPreviewVPos = 'Below';
            } else {
                textAnnotationPreviewVPos = 'Center';
            }
        } else {
            textAnnotationPreviewArrow = -1;
            textAnnotationPreviewSignal = -1;
            textAnnotationPreviewPosition = -1;
        }
        drawWaveform();
        return;
    }

    // Marker preview - uses fractional position
    if (currentTool === 'marker') {
        const markerPos = mapCanvasPosition(mouseX, mouseY, { snapToEdge: true, useMaxSubSteps: true });
        markerPreviewPosition = markerPos ? markerPos.position : -1;
        drawWaveform();
        return;
    }

    // Time jump preview - uses fractional position
    if (currentTool === 'time-jump') {
        const tjPos = mapCanvasPosition(mouseX, mouseY, { snapToEdge: true, useMaxSubSteps: true });
        timeJumpPreviewPosition = tjPos ? tjPos.position : -1;
        drawWaveform();
        return;
    }
    
    // Arrow preview - uses fractional position
    if (currentTool === 'arrow' && arrowHasStart) {
        arrowPreviewSignal = signalIndex;
        arrowPreviewPosition = pos ? pos.position : -1;
        drawWaveform();
        return;
    }
    
    if (!isMouseDown) return;
    
    // Vector selection drag
    if (vectorSelecting && signalIndex === vectorSelSignal) {
        const mapped = mapToSignalSample(mouseX, mouseY);
        if (!mapped) return;
        vectorSelCurrentSample = mapped.sampleIndex;
        drawWaveform();
    } else if (currentTool === 'paint' && signal && signal.type === SignalType.Bit) {
        if (sampleIndex !== lastSampleIndex || signalIndex !== lastSignalIndex) {
            const WaveValue = window.WaveDromConstants?.WaveValue || {
                LOW: 0, HIGH: 1, UNDEFINED: -1, HIGHZ: 2, PULLUP: 3, PULLDOWN: 4
            };
            const bitState = typeof getCurrentBitState === 'function' ? getCurrentBitState() : '1';
            const currentValue = signal.values[sampleIndex];
            let newValue;

            if (bitState === '0' || bitState === '1') {
                if (currentValue === WaveValue.LOW) newValue = WaveValue.HIGH;
                else if (currentValue === WaveValue.HIGH) newValue = WaveValue.LOW;
                else newValue = bitStateToValue(bitState);
            } else if (bitState === 'u' || bitState === 'd') {
                if (currentValue === WaveValue.PULLUP) newValue = WaveValue.PULLDOWN;
                else if (currentValue === WaveValue.PULLDOWN) newValue = WaveValue.PULLUP;
                else newValue = bitStateToValue(bitState);
            } else {
                newValue = bitStateToValue(bitState);
            }

            if (newValue !== currentValue) {
                if (!paintUndoActive) {
                    document_wave.pushUndoSnapshot();
                    paintUndoActive = true;
                }
                signal.values[sampleIndex] = newValue;
                if (signal.driveStrengths) {
                    const DriveStrengthEnum = typeof DriveStrength !== 'undefined' ? DriveStrength : { Strong: 0, Weak: 1, WeakMarker: 2 };
                    if (newValue === WaveValue.PULLUP || newValue === WaveValue.PULLDOWN) {
                        signal.driveStrengths[sampleIndex] = DriveStrengthEnum.Weak;
                    } else {
                        signal.driveStrengths[sampleIndex] = DriveStrengthEnum.Strong;
                    }
                }
            }

            lastSampleIndex = sampleIndex;
            lastSignalIndex = signalIndex;
            drawWaveform();
        }
    } else if (currentTool === 'erase' && signal && signal.type === SignalType.Bit) {
        if (sampleIndex !== lastSampleIndex || signalIndex !== lastSignalIndex) {
            if (!paintUndoActive) {
                document_wave.pushUndoSnapshot();
                paintUndoActive = true;
            }
            
            // Erase directly at the index - each signal has its own array
            signal.values[sampleIndex] = -1;
            
            lastSampleIndex = sampleIndex;
            lastSignalIndex = signalIndex;
            drawWaveform();
        }
    }
}

/**
 * Handle multi-signal drag
 * En el nuevo modelo, groupName viaja con la señal, no hay necesidad de moveGroup especial
 * - Si es un subgrupo, solo puede moverse dentro del padre y salta sobre subgrupos hermanos
 * - Si es un grupo raíz, salta sobre otros grupos raíz (no puede meterse dentro)
 */
function handleMultiSignalDrag(clampedIdx) {
    const sortedSel = [...selectedSignalIndices].sort((a, b) => a - b);
    const minSel = sortedSel[0];
    const maxSel = sortedSel[sortedSel.length - 1];
    const selectionSize = sortedSel.length;
    
    // Verificar si estamos moviendo un grupo
    let parentBounds = null;
    let isRootGroup = false;
    let parentName = null;
    
    if (pendingMoveGroup && typeof GroupManager !== 'undefined') {
        parentName = GroupManager.getParentGroupName(pendingMoveGroup.name);
        if (parentName) {
            // Es un subgrupo, obtener los límites del grupo padre
            const groups = GroupManager.getGroups(document_wave);
            const parentGroup = groups.find(g => g.name === parentName);
            if (parentGroup) {
                parentBounds = {
                    startIndex: parentGroup.startIndex,
                    endIndex: parentGroup.endIndex
                };
            }
        } else {
            // Es un grupo raíz - debe saltar sobre otros grupos raíz
            isRootGroup = true;
        }
    }
    
    let targetIdx = -1;
    const movingDown = clampedIdx > maxSel;
    const movingUp = clampedIdx < minSel;
    
    if (movingUp) {
        targetIdx = clampedIdx;
    } else if (movingDown) {
        targetIdx = clampedIdx - selectionSize + 1;
    }
    
    // Aplicar restricción de límites del padre si existe (subgrupos)
    if (parentBounds !== null && targetIdx >= 0) {
        let newMinPos = targetIdx;
        let newMaxPos = targetIdx + selectionSize - 1;
        
        // No permitir mover fuera del grupo padre
        if (newMinPos < parentBounds.startIndex) {
            targetIdx = parentBounds.startIndex;
            newMinPos = targetIdx;
            newMaxPos = targetIdx + selectionSize - 1;
        }
        if (newMaxPos > parentBounds.endIndex) {
            targetIdx = parentBounds.endIndex - selectionSize + 1;
            newMinPos = targetIdx;
            newMaxPos = targetIdx + selectionSize - 1;
        }
        
        // Verificar colisiones con subgrupos hermanos (mismo padre)
        if (typeof GroupManager !== 'undefined') {
            const groups = GroupManager.getGroups(document_wave);
            
            // Obtener subgrupos hermanos (mismo padre, excluyendo el que movemos)
            const siblingGroups = groups.filter(g => {
                const gParent = GroupManager.getParentGroupName(g.name);
                if (gParent !== parentName) return false; // No es hermano
                if (g.name === pendingMoveGroup.name) return false; // Es el grupo que movemos
                return true;
            });
            
            // Verificar si la nueva posición colisiona con algún hermano
            for (const sibling of siblingGroups) {
                const overlaps = newMinPos <= sibling.endIndex && newMaxPos >= sibling.startIndex;
                
                if (overlaps) {
                    // Hay colisión - saltar al otro lado del hermano
                    if (movingDown) {
                        targetIdx = sibling.endIndex + 1;
                        // No exceder límite del padre
                        if (targetIdx + selectionSize - 1 > parentBounds.endIndex) {
                            targetIdx = parentBounds.endIndex - selectionSize + 1;
                        }
                    } else if (movingUp) {
                        targetIdx = sibling.startIndex - selectionSize;
                        // No bajar del límite del padre
                        if (targetIdx < parentBounds.startIndex) {
                            targetIdx = parentBounds.startIndex;
                        }
                    }
                    break;
                }
            }
        }
    }
    
    // Si es un grupo raíz, verificar que no colisione con otros grupos raíz
    if (isRootGroup && targetIdx >= 0 && typeof GroupManager !== 'undefined') {
        const groups = GroupManager.getGroups(document_wave);
        const signals = document_wave.signalList();
        
        // Obtener otros grupos raíz (excluyendo el que estamos moviendo)
        const otherRootGroups = groups.filter(g => {
            if (GroupManager.getParentGroupName(g.name)) return false; // No es raíz
            if (g.name === pendingMoveGroup.name) return false; // Es el grupo que movemos
            // Verificar que no sea un subgrupo del grupo que movemos
            if (g.name.startsWith(pendingMoveGroup.name + '/')) return false;
            return true;
        });
        
        const newMinPos = targetIdx;
        const newMaxPos = targetIdx + selectionSize - 1;
        
        // Verificar si la nueva posición colisiona con algún otro grupo raíz
        for (const otherGroup of otherRootGroups) {
            // Verificar si hay solapamiento
            const overlaps = newMinPos <= otherGroup.endIndex && newMaxPos >= otherGroup.startIndex;
            
            if (overlaps) {
                // Hay colisión - saltar al otro lado del grupo
                if (movingDown) {
                    // Saltar DESPUÉS del otro grupo
                    targetIdx = otherGroup.endIndex + 1;
                } else if (movingUp) {
                    // Saltar ANTES del otro grupo
                    targetIdx = otherGroup.startIndex - selectionSize;
                    if (targetIdx < 0) targetIdx = 0;
                }
                break;
            }
        }
        
        // Verificar límites del documento
        if (targetIdx < 0) targetIdx = 0;
        if (targetIdx + selectionSize > signals.length) {
            targetIdx = signals.length - selectionSize;
        }
    }
    
    if (targetIdx >= 0 && targetIdx !== minSel) {
        // En el nuevo modelo, groupName viaja con la señal como atributo
        // No necesitamos lógica especial para grupos
        const newIndices = document_wave.moveSignals(selectedSignalIndices, targetIdx);
        if (newIndices.length > 0) {
            selectedSignalIndices = newIndices;
            const draggedSignalOffset = sortedSel.indexOf(moveSignalIndex);
            moveSignalIndex = newIndices[Math.max(0, draggedSignalOffset)];
        }
        drawWaveform();
    }
}

/**
 * Handle mouse up events
 */
async function handleMouseUp(e, signals, signalIndex, signal, sampleIndex) {
    // Finalize object dragging
    if (isDraggingObject) {
        // Arrow endpoint drags mutate the arrow directly; notify the document
        // once so preserved WaveDrom structure is invalidated
        if (draggingObjectType === SelectableType.Arrow && dragObjectUndoSaved) {
            document_wave.dataChanged();
        }
        isDraggingObject = false;
        draggingObjectType = null;
        draggingObjectId = -1;
        draggingArrowEndpoint = null;
        dragObjectStartPos = { x: 0, y: 0 };
        dragObjectStartSample = -1;
        dragObjectStartSignal = -1;
        dragObjectUndoSaved = false;
        drawWaveform();
    }
    
    // Finalize range selection
    if (rangeSelecting && currentTool === 'select') {
        rangeSelecting = false;
        const minSamp = Math.min(rangeSelStartSample, rangeSelEndSample);
        const maxSamp = Math.max(rangeSelStartSample, rangeSelEndSample);
        if (maxSamp > minSamp || rangeSelStartSignal !== rangeSelEndSignal) {
            rangeSelActive = true;
        } else {
            rangeSelActive = false;
            rangeSelStartSignal = -1;
            rangeSelStartSample = -1;
            rangeSelEndSignal = -1;
            rangeSelEndSample = -1;
        }
        drawWaveform();
    } else if (rangeSelecting) {
        rangeSelecting = false;
        rangeSelActive = false;
        rangeSelStartSignal = -1;
        rangeSelStartSample = -1;
        rangeSelEndSignal = -1;
        rangeSelEndSample = -1;
        drawWaveform();
    }
    
    // Finalize signal drag
    const wasClick = pendingMoveSignal && !isMovingSignal;
    const clickedIdx = pendingMoveSignalIndex;
    endSignalDrag(wasClick, clickedIdx);
    
    // Finalize vector selection
    if (vectorSelecting && signalIndex === vectorSelSignal) {
        const startSample = Math.min(vectorSelStartSample, vectorSelCurrentSample);
        const endSample = Math.max(vectorSelStartSample, vectorSelCurrentSample);
        
        const valueStr = await wpPrompt('Enter vector value or label:', '0', 'Vector Value');
        if (valueStr !== null) {
            document_wave.pushUndoSnapshot();
            const value = parseInt(valueStr, 10);
            if (!isNaN(value)) {
                for (let i = startSample; i <= endSample; i++) {
                    signal.values[i] = value;
                    signal.labels[i] = document_wave.valueToLabel(value, signal.radix);
                }
            } else {
                const hash = valueStr.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                for (let i = startSample; i <= endSample; i++) {
                    signal.values[i] = hash;
                    signal.labels[i] = valueStr;
                }
            }
        }
    }
    
    vectorSelecting = false;
    vectorSelSignal = -1;
    vectorSelStartSample = -1;
    vectorSelCurrentSample = -1;
    paintUndoActive = false;
    drawWaveform();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleMouseEvent };
}
