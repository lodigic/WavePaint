/**
 * AppSignalContextMenu.js - Signal-specific context menu
 */

/**
 * Shows a context menu for a signal.
 */
function showSignalContextMenu(clientX, clientY, signalIndex, signal) {
    // Determine which signals to operate on
    // If the signal is already selected (part of multi-selection), use that selection
    // Otherwise, just operate on this signal WITHOUT changing selection
    let targetIndices = [];
    if (selectedSignalIndices.length > 0 && selectedSignalIndices.includes(signalIndex)) {
        targetIndices = [...selectedSignalIndices];
    } else {
        // Don't change selection, just target this signal
        targetIndices = [signalIndex];
    }
    
    const isMultiple = targetIndices.length > 1;
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';
    menu.style.background = 'var(--bg-color)';
    menu.style.border = '1px solid var(--border-color)';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    menu.style.zIndex = '5500';
    menu.style.minWidth = '180px';
    
    if (isMultiple) {
        const header = document.createElement('div');
        header.textContent = `${targetIndices.length} signals selected`;
        header.style.padding = '8px 12px';
        header.style.fontWeight = 'bold';
        header.style.color = 'var(--text-color)';
        header.style.borderBottom = '1px solid var(--border-color)';
        header.style.fontSize = '12px';
        menu.appendChild(header);
    }

    function addMenuItem(text, callback) {
        const item = document.createElement('div');
        item.textContent = text;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.color = 'var(--text-color)';
        item.addEventListener('mouseenter', () => item.style.background = 'var(--accent-color)');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', () => {
            callback();
            document.body.removeChild(menu);
        });
        menu.appendChild(item);
        return item;
    }

    function addSeparator() {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        sep.style.height = '1px';
        sep.style.background = 'var(--border-color)';
        sep.style.margin = '4px 12px';
        sep.style.padding = '0';
        menu.appendChild(sep);
    }

    if (signal.type !== SignalType.BlankRow) {
        if (!isMultiple) {
            addMenuItem('Rename signal...', () => {
                wpPrompt('Enter new signal name:', signal.name, 'Rename Signal').then((newName) => {
                    if (newName && newName.trim()) {
                        document_wave.setSignalName(signalIndex, newName.trim());
                        drawWaveform();
                    }
                });
            });
        }
        
        addSeparator();
        
        // Copy signal(s)
        const copyLabel = isMultiple ? `Copy ${targetIndices.length} signals` : 'Copy signal';
        addMenuItem(copyLabel, () => {
            const signals = document_wave.signalList();
            const copiedSignals = [];
            for (const idx of targetIndices) {
                const sig = signals[idx];
                // Deep copy the signal
                copiedSignals.push({
                    name: sig.name,
                    type: sig.type,
                    color: sig.color,
                    values: [...sig.values],
                    labels: sig.labels ? [...sig.labels] : null,
                    radix: sig.radix,
                    segmentStyles: sig.segmentStyles ? sig.segmentStyles.map(s => ({...s})) : null,
                    edgeArrow: sig.edgeArrow,
                    riseTime: sig.riseTime,
                    fallTime: sig.fallTime
                });
            }
            signalClipboard = { signals: copiedSignals, count: copiedSignals.length };
            console.log(`Copied ${copiedSignals.length} signal(s) to clipboard`);
        });
        
        // Paste signal(s) - only if clipboard has content
        if (signalClipboard && signalClipboard.signals && signalClipboard.signals.length > 0) {
            const pasteLabel = signalClipboard.count > 1 
                ? `Paste ${signalClipboard.count} signals` 
                : 'Paste signal';
            addMenuItem(pasteLabel, () => {
                document_wave.pushUndoSnapshot();
                const signals = document_wave.signalList();
                // Insert after the current signal
                let insertIndex = signalIndex + 1;
                for (const sig of signalClipboard.signals) {
                    // Create new signal with copied data
                    const newSignal = {
                        name: sig.name + ' (copy)',
                        type: sig.type,
                        color: sig.color,
                        values: [...sig.values],
                        labels: sig.labels ? [...sig.labels] : null,
                        radix: sig.radix,
                        segmentStyles: sig.segmentStyles ? sig.segmentStyles.map(s => ({...s})) : null,
                        edgeArrow: sig.edgeArrow,
                        riseTime: sig.riseTime,
                        fallTime: sig.fallTime
                    };
                    signals.splice(insertIndex, 0, newSignal);
                    insertIndex++;
                }
                drawWaveform();
                updateSidePanels();
            });
        }
        
        // Duplicate signal(s)
        const duplicateLabel = isMultiple ? `Duplicate ${targetIndices.length} signals` : 'Duplicate signal';
        addMenuItem(duplicateLabel, () => {
            document_wave.pushUndoSnapshot();
            const signals = document_wave.signalList();
            // Sort indices descending to insert from bottom to top
            const sortedIndices = [...targetIndices].sort((a, b) => b - a);
            
            for (const idx of sortedIndices) {
                // Full clone: keeps substeps/clock data so duplicated clocks
                // render correctly (issue #11)
                const newSignal = cloneSignalData(signals[idx], ' (copy)');
                signals.splice(idx + 1, 0, newSignal);
            }
            
            // Clear selection
            selectedSignalIndices = [];
            lastSelectedSignalIndex = -1;
            drawWaveform();
            updateSidePanels();
        });
        
        addSeparator();
        
        const deleteLabel = isMultiple ? `Delete ${targetIndices.length} signals` : 'Delete signal';
        addMenuItem(deleteLabel, () => {
            const confirmMsg = isMultiple 
                ? `Are you sure you want to delete ${targetIndices.length} signals?`
                : `Are you sure you want to delete signal "${signal.name}"?`;
            wpConfirm(confirmMsg, 'Delete Signal').then((confirmed) => {
                if (confirmed) {
                    if (isMultiple) {
                        document_wave.removeSignals(targetIndices);
                    } else {
                        document_wave.removeSignal(signalIndex);
                    }
                    clearSignalSelection();
                    drawWaveform();
                }
            });
        });

        const colorLabel = isMultiple ? `Change color (${targetIndices.length} signals)...` : 'Change color...';
        addMenuItem(colorLabel, async () => {
            const defaultColor = getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
            const currentColor = signal.color || defaultColor;
            const newColor = await openColorPicker(currentColor, null, isMultiple ? 'Signals Color' : 'Signal Color');
            if (newColor) {
                if (isMultiple) {
                    document_wave.setSignalsColor(targetIndices, newColor);
                } else {
                    document_wave.setSignalColor(signalIndex, newColor);
                }
                drawWaveform();
            }
        });
        
        if (isMultiple) {
            addSeparator();
            addMenuItem('Clear selection', () => {
                selectedSignalIndices = [];
                lastSelectedSignalIndex = -1;
                drawWaveform();
            });
        }

        // Signal group options (simplified model via GroupManager)
        addSeparator();
        
        // Get group information for selected signals
        const signals = document_wave.signalList();
        
        // Check whether ANY selected signal is in a group
        let existingGroupName = null;
        let anySignalInGroup = false;
        for (const idx of targetIndices) {
            const sig = signals[idx];
            if (sig && sig.groupName) {
                anySignalInGroup = true;
                if (!existingGroupName) {
                    existingGroupName = sig.groupName;
                }
            }
        }
        
        const allGroupNames = typeof GroupManager !== 'undefined' ? GroupManager.getGroupNames(document_wave) : [];
        
        if (isMultiple) {
            if (anySignalInGroup) {
                // If any signal is in a group, only offer to create a subgroup
                const parentShortName = GroupManager.getShortGroupName(existingGroupName);
                addMenuItem(`Create Subgroup in "${parentShortName}"...`, () => {
                    wpPrompt('Enter subgroup name:', 'Subgroup', 'Create Subgroup').then((subName) => {
                        if (subName && subName.trim()) {
                            // A subgroup uses a hierarchical name: "Parent/Child"
                            const fullName = existingGroupName + '/' + subName.trim();
                            document_wave.pushUndoSnapshot();
                            GroupManager.createGroup(document_wave, fullName, targetIndices);
                            drawWaveform();
                        }
                    });
                });
            } else {
                // If no signal is in a group, offer to create a new group
                addMenuItem('Create Group...', () => {
                    wpPrompt('Enter group name:', 'Group', 'Create Signal Group').then((groupName) => {
                        if (groupName && groupName.trim()) {
                            document_wave.pushUndoSnapshot();
                            GroupManager.createGroup(document_wave, groupName.trim(), targetIndices);
                            drawWaveform();
                        }
                    });
                });
            }
        }
        
        // "Add to Group" submenu - show available groups with hierarchy
        if (allGroupNames.length > 0) {
            const addToGroupContainer = document.createElement('div');
            addToGroupContainer.className = 'submenu-container';
            addToGroupContainer.style.position = 'relative';
            
            const addToGroupItem = document.createElement('div');
            addToGroupItem.style.padding = '8px 12px';
            addToGroupItem.style.cursor = 'pointer';
            addToGroupItem.style.color = 'var(--text-color)';
            addToGroupItem.innerHTML = 'Add to Group <span style="float: right; opacity: 0.5;">▶</span>';
            addToGroupItem.addEventListener('mouseenter', () => addToGroupItem.style.background = 'var(--accent-color)');
            addToGroupItem.addEventListener('mouseleave', () => addToGroupItem.style.background = 'transparent');
            addToGroupContainer.appendChild(addToGroupItem);
            
            const addToGroupSubmenu = document.createElement('div');
            addToGroupSubmenu.className = 'context-menu';
            addToGroupSubmenu.style.position = 'absolute';
            addToGroupSubmenu.style.left = '100%';
            addToGroupSubmenu.style.top = '0';
            addToGroupSubmenu.style.display = 'none';
            addToGroupSubmenu.style.minWidth = '160px';
            addToGroupSubmenu.style.background = 'var(--bg-color)';
            addToGroupSubmenu.style.border = '1px solid var(--border-color)';
            addToGroupSubmenu.style.borderRadius = '4px';
            addToGroupSubmenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            addToGroupContainer.appendChild(addToGroupSubmenu);
            
            addToGroupContainer.addEventListener('mouseenter', () => {
                addToGroupSubmenu.style.display = 'block';
            });
            addToGroupContainer.addEventListener('mouseleave', () => {
                addToGroupSubmenu.style.display = 'none';
            });
            
            // Sort groups by depth and name for better organization
            const sortedGroupNames = [...allGroupNames].sort((a, b) => {
                const depthA = GroupManager.getGroupDepth(a);
                const depthB = GroupManager.getGroupDepth(b);
                if (depthA !== depthB) return depthA - depthB;
                return a.localeCompare(b);
            });
            
            // Add each group as a submenu item with visual hierarchy
            for (const grpName of sortedGroupNames) {
                const grpItem = document.createElement('div');
                const depth = GroupManager.getGroupDepth(grpName);
                const shortName = GroupManager.getShortGroupName(grpName);
                
                // Add visual indentation for subgroups
                const indent = depth * 12;
                const prefix = depth > 0 ? '└ ' : '';
                
                grpItem.textContent = prefix + shortName;
                grpItem.title = grpName; // Full path in tooltip
                grpItem.style.padding = '8px 12px';
                grpItem.style.paddingLeft = (12 + indent) + 'px';
                grpItem.style.cursor = 'pointer';
                grpItem.style.color = 'var(--text-color)';
                grpItem.style.fontSize = depth > 0 ? '12px' : '13px';
                grpItem.addEventListener('mouseenter', () => grpItem.style.background = 'var(--accent-color)');
                grpItem.addEventListener('mouseleave', () => grpItem.style.background = 'transparent');
                grpItem.addEventListener('click', () => {
                    document_wave.pushUndoSnapshot();
                    GroupManager.addSignalsToGroup(document_wave, grpName, targetIndices);
                    drawWaveform();
                    if (menu.parentNode) document.body.removeChild(menu);
                });
                addToGroupSubmenu.appendChild(grpItem);
            }
            
            menu.appendChild(addToGroupContainer);
        }
        
        // If signal is in a group, show group options
        if (existingGroupName) {
            const groupShortName = GroupManager.getShortGroupName(existingGroupName);
            const isSubgroup = existingGroupName.includes('/');
            
            addMenuItem(`Rename "${groupShortName}"...`, () => {
                const promptText = isSubgroup 
                    ? `Enter new name for subgroup "${groupShortName}":` 
                    : `Enter new name for group "${groupShortName}":`;
                wpPrompt(promptText, groupShortName, 'Rename Group').then((newName) => {
                    if (newName && newName.trim()) {
                        document_wave.pushUndoSnapshot();
                        // If this is a subgroup, keep the parent hierarchy
                        const parentPath = GroupManager.getParentGroupName(existingGroupName);
                        const finalName = parentPath ? parentPath + '/' + newName.trim() : newName.trim();
                        GroupManager.renameGroup(document_wave, existingGroupName, finalName);
                        drawWaveform();
                    }
                });
            });
            
            const removeLabel = isMultiple 
                ? `Remove ${targetIndices.length} from "${groupShortName}"` 
                : `Remove from "${groupShortName}"`;
            addMenuItem(removeLabel, () => {
                document_wave.pushUndoSnapshot();
                GroupManager.removeSignalsFromGroup(document_wave, targetIndices);
                drawWaveform();
                if (typeof updateSidePanels === 'function') updateSidePanels();
            });
            
            addMenuItem(`Delete "${groupShortName}"`, () => {
                const confirmMsg = isSubgroup
                    ? `Delete subgroup "${groupShortName}" and ungroup its signals?`
                    : `Delete group "${groupShortName}" and ungroup all its signals?`;
                wpConfirm(confirmMsg, 'Delete Group').then((confirmed) => {
                    if (confirmed) {
                        document_wave.pushUndoSnapshot();
                        GroupManager.deleteGroup(document_wave, existingGroupName);
                        drawWaveform();
                    }
                });
            });
        }

        if (!isMultiple) {
            // Phase shift: move the whole waveform left/right (issue #7)
            addMenuItem('Shift Left', () => {
                document_wave.shiftSignalValues(signalIndex, -1);
            });
            addMenuItem('Shift Right', () => {
                document_wave.shiftSignalValues(signalIndex, 1);
            });
        }

        if (!isMultiple && signal.type === SignalType.Vector) {
            // Change the fill of every segment at once (issue #11)
            addMenuItem('Fill all segments...', async () => {
                const currentFill = (signal.segmentStyles && signal.segmentStyles.find(s => s && s.fill)?.fill) || '#ffffb4';
                const newColor = await openColorPicker(currentFill, null, 'Vector Fill Color');
                if (!newColor) return;
                document_wave.pushUndoSnapshot();
                for (let i = 0; i < signal.values.length; i++) {
                    if (signal.segmentStyles[i]) {
                        signal.segmentStyles[i].fill = newColor;
                    } else {
                        signal.segmentStyles[i] = { color: null, hatched: false, fill: newColor };
                    }
                }
                document_wave.dataChanged();
            });

            // Cycle the display radix for numeric values (issue #11)
            const radixNames = ['Hex', 'Decimal', 'Binary'];
            const currentRadix = signal.radix || 0;
            const nextRadix = (currentRadix + 1) % 3;
            addMenuItem(`Value radix: ${radixNames[currentRadix]} → ${radixNames[nextRadix]}`, () => {
                document_wave.pushUndoSnapshot();
                for (let i = 0; i < signal.values.length; i++) {
                    // Only regenerate labels that were produced from numbers;
                    // keep custom text labels untouched
                    if (signal.labels[i] === document_wave.valueToLabel(signal.values[i], currentRadix)) {
                        signal.labels[i] = document_wave.valueToLabel(signal.values[i], nextRadix);
                    }
                }
                signal.radix = nextRadix;
                document_wave.dataChanged();
            });
        }

        if (!isMultiple && signal.type === SignalType.Bit) {
            addMenuItem('Invert Values', () => {
                document_wave.pushUndoSnapshot();
                for (let i = 0; i < signal.values.length; i++) {
                    const val = signal.values[i];
                    // Only invert 0 and 1, keep -1 (undefined) and other values
                    if (val === 0) {
                        signal.values[i] = 1;
                    } else if (val === 1) {
                        signal.values[i] = 0;
                    }
                }
                drawWaveform();
            });
            
            addMenuItem('Properties...', () => {
                showSignalPropertiesDialog(signalIndex, signal);
            });
        }
    } else {
        // BlankRow - show delete option
        addMenuItem('Delete Blank Row', () => {
            wpConfirm('Are you sure you want to delete this blank row?', 'Delete Blank Row').then((confirmed) => {
                if (confirmed) {
                    document_wave.removeSignal(signalIndex);
                    clearSignalSelection();
                    drawWaveform();
                }
            });
        });
    }

    function closeMenu(e) {
        if (!menu.contains(e.target)) {
            if (menu.parentNode) document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        }
    }
    
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
    
    // Close menu when mouse leaves (with small delay to allow navigation)
    let signalMenuCloseTimeout;
    menu.addEventListener('mouseleave', function() {
        signalMenuCloseTimeout = setTimeout(() => {
            if (menu.parentNode) document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        }, 100);
    });
    menu.addEventListener('mouseenter', function() {
        if (signalMenuCloseTimeout) clearTimeout(signalMenuCloseTimeout);
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showSignalContextMenu };
}
