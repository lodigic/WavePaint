/**
 * Groups.js - Simplified signal group system
 * 
 * SIMPLE MODEL:
 * - Each signal has a `groupName` field (string or null)
 * - Signals with the same groupName form a visual group
 * - Subgroups use hierarchical names: "Parent/Child/Grandchild"
 * - Groups are discovered dynamically from the signals
 */

// ============================================
// Group visual constants
// ============================================

const GROUP_VISUAL = {
    bracketWidth: 10,
    bracketPadding: 32,    // Initial space before the first bracket
    curveRadius: 5,
    lineWidth: 2,
    signalIndent: 12,
    subgroupIndent: 24,    // Gap between subgroup levels
    defaultColor: '#6496C8',
    headerHeight: 24,
    headerPadding: 4,
    // Colors by depth level (used when no color is assigned)
    depthColors: ['#6496C8', '#96C864', '#C89664', '#9664C8', '#64C896']
};

// ============================================
// Hierarchy helpers
// ============================================

/**
 * Returns the depth of a group from its name
 * "Group" -> 0, "Parent/Child" -> 1, "A/B/C" -> 2
 */
function getGroupDepth(groupName) {
    if (!groupName) return 0;
    return (groupName.match(/\//g) || []).length;
}

/**
 * Returns the parent name of a subgroup
 * "Parent/Child" -> "Parent", "Group" -> null
 */
function getParentGroupName(groupName) {
    if (!groupName || !groupName.includes('/')) return null;
    return groupName.substring(0, groupName.lastIndexOf('/'));
}

/**
 * Returns the short name (without the path) of a group
 * "Parent/Child" -> "Child", "Group" -> "Group"
 */
function getShortGroupName(groupName) {
    if (!groupName) return '';
    const lastSlash = groupName.lastIndexOf('/');
    return lastSlash >= 0 ? groupName.substring(lastSlash + 1) : groupName;
}

// ============================================
// Group query functions
// ============================================

/**
 * Returns every unique group in the document, including inferred parent groups
 * A group includes every signal with the same groupName
 * The bracket runs from the first signal of the group to the last
 * Parent groups are also created automatically for subgroups
 * @returns {Array<{name: string, color: string, startIndex: number, endIndex: number, depth: number, shortName: string}>}
 */
function getGroups(doc) {
    const signals = doc.m_signals || [];
    const groupMap = new Map(); // name -> { name, color, startIndex, endIndex, depth }
    
    for (let i = 0; i < signals.length; i++) {
        const signal = signals[i];
        const groupName = signal.groupName || null;
        
        if (groupName) {
            // Register the signal's group
            if (groupMap.has(groupName)) {
                const group = groupMap.get(groupName);
                group.endIndex = i;
            } else {
                groupMap.set(groupName, {
                    name: groupName,
                    shortName: getShortGroupName(groupName),
                    color: signal.groupColor || GROUP_VISUAL.defaultColor,
                    startIndex: i,
                    endIndex: i,
                    depth: getGroupDepth(groupName)
                });
            }
            
            // Also register every parent group so the visual hierarchy exists
            let parentName = getParentGroupName(groupName);
            while (parentName) {
                if (groupMap.has(parentName)) {
                    // Extend the parent group to include this signal
                    const parent = groupMap.get(parentName);
                    if (i < parent.startIndex) parent.startIndex = i;
                    if (i > parent.endIndex) parent.endIndex = i;
                } else {
                    // Create the parent group
                    groupMap.set(parentName, {
                        name: parentName,
                        shortName: getShortGroupName(parentName),
                        color: signal.groupColor || GROUP_VISUAL.defaultColor,
                        startIndex: i,
                        endIndex: i,
                        depth: getGroupDepth(parentName)
                    });
                }
                parentName = getParentGroupName(parentName);
            }
        }
    }
    
    // Convert to an array and sort by depth (parents first), then by startIndex
    return Array.from(groupMap.values()).sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.startIndex - b.startIndex;
    });
}

/**
 * Returns the group name of a signal
 */
function getSignalGroupName(doc, signalIndex) {
    const signals = doc.m_signals || [];
    if (signalIndex < 0 || signalIndex >= signals.length) return null;
    return signals[signalIndex].groupName || null;
}

/**
 * Returns whether a signal belongs to a group
 */
function isSignalInGroup(doc, signalIndex) {
    return getSignalGroupName(doc, signalIndex) !== null;
}

/**
 * Returns every signal in a group by name (exact match only)
 */
function getSignalsInGroup(doc, groupName) {
    const signals = doc.m_signals || [];
    const indices = [];
    for (let i = 0; i < signals.length; i++) {
        if (signals[i].groupName === groupName) {
            indices.push(i);
        }
    }
    return indices;
}

/**
 * Returns every signal in a group, including subgroups
 * For example, if groupName is "Bus", this includes "Bus", "Bus/Address", "Bus/Data", and so on
 */
function getSignalsInGroupRecursive(doc, groupName) {
    const signals = doc.m_signals || [];
    const indices = [];
    const prefix = groupName + '/';
    
    for (let i = 0; i < signals.length; i++) {
        const sigGroupName = signals[i].groupName;
        if (sigGroupName) {
            // Include an exact group match and any subgroup
            if (sigGroupName === groupName || sigGroupName.startsWith(prefix)) {
                indices.push(i);
            }
        }
    }
    return indices;
}

/**
 * Returns the group that contains a specific signal (for hit testing)
 */
function getGroupContainingSignal(doc, signalIndex) {
    const groups = getGroups(doc);
    for (const group of groups) {
        if (signalIndex >= group.startIndex && signalIndex <= group.endIndex) {
            return group;
        }
    }
    return null;
}

// ============================================
// Group modification functions
// ============================================

/**
 * Creates a group from the selected signals
 * @param {WaveDocument} doc 
 * @param {string} name - Group name
 * @param {number[]} signalIndices - Indices of the signals to group
 * @param {string} color - Group color (optional)
 */
function createGroup(doc, name, signalIndices, color = null) {
    const signals = doc.m_signals || [];
    const groupColor = color || GROUP_VISUAL.defaultColor;
    
    for (const idx of signalIndices) {
        if (idx >= 0 && idx < signals.length) {
            signals[idx].groupName = name;
            signals[idx].groupColor = groupColor;
        }
    }
}

/**
 * Adds signals to an existing group
 */
function addSignalsToGroup(doc, groupName, signalIndices) {
    const signals = doc.m_signals || [];
    
    // Take the color from the existing group
    let groupColor = GROUP_VISUAL.defaultColor;
    for (const sig of signals) {
        if (sig.groupName === groupName && sig.groupColor) {
            groupColor = sig.groupColor;
            break;
        }
    }
    
    for (const idx of signalIndices) {
        if (idx >= 0 && idx < signals.length) {
            signals[idx].groupName = groupName;
            signals[idx].groupColor = groupColor;
        }
    }
}

/**
 * Removes signals from their group (ungroups them)
 */
function removeSignalsFromGroup(doc, signalIndices) {
    const signals = doc.m_signals || [];
    for (const idx of signalIndices) {
        if (idx >= 0 && idx < signals.length) {
            signals[idx].groupName = null;
            signals[idx].groupColor = null;
        }
    }
}

/**
 * Renames a group
 */
function renameGroup(doc, oldName, newName) {
    const signals = doc.m_signals || [];
    for (const signal of signals) {
        if (signal.groupName === oldName) {
            signal.groupName = newName;
        }
    }
}

/**
 * Changes a group's color
 */
function setGroupColor(doc, groupName, color) {
    const signals = doc.m_signals || [];
    for (const signal of signals) {
        if (signal.groupName === groupName) {
            signal.groupColor = color;
        }
    }
}

/**
 * Deletes a group completely (ungroups all of its signals)
 */
function deleteGroup(doc, groupName) {
    const signals = doc.m_signals || [];
    for (const signal of signals) {
        if (signal.groupName === groupName) {
            signal.groupName = null;
            signal.groupColor = null;
        }
    }
}

/**
 * Returns the list of unique group names
 */
function getGroupNames(doc) {
    const signals = doc.m_signals || [];
    const names = new Set();
    for (const signal of signals) {
        if (signal.groupName) {
            names.add(signal.groupName);
        }
    }
    return Array.from(names);
}

// ============================================
// Rendering functions
// ============================================

/**
 * Draws group brackets on the canvas
 * Supports subgroups with visual indentation
 */
function drawGroupBrackets(ctx, doc, signals, signalStartY, rowHeight, nameWidth) {
    const groups = getGroups(doc);
    if (groups.length === 0) return;
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000';
    
    // Sort by depth so parents are drawn first (outside in)
    const sortedGroups = [...groups].sort((a, b) => a.depth - b.depth);
    
    for (const group of sortedGroups) {
        const startY = signalStartY + group.startIndex * rowHeight + 6;
        const endY = signalStartY + (group.endIndex + 1) * rowHeight - 6;
        const bracketHeight = endY - startY;
        
        if (bracketHeight < 10) continue; // Group is too small
        
        // Bracket indent follows the subgroup depth
        const depthIndent = group.depth * GROUP_VISUAL.subgroupIndent;
        const bracketX = GROUP_VISUAL.bracketPadding + depthIndent;
        const bracketWidth = 8;
        
        // Group color: use the assigned color, or a color by depth
        const depthColorIndex = group.depth % GROUP_VISUAL.depthColors.length;
        const defaultDepthColor = GROUP_VISUAL.depthColors[depthColorIndex];
        const bracketColor = group.color || defaultDepthColor;
        
        ctx.strokeStyle = bracketColor;
        ctx.fillStyle = bracketColor;
        ctx.lineWidth = GROUP_VISUAL.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        
        // Draw a bracket shaped like [
        const r = Math.min(GROUP_VISUAL.curveRadius, bracketHeight / 4);
        
        ctx.beginPath();
        // Top arm
        ctx.moveTo(bracketX + bracketWidth, startY);
        ctx.lineTo(bracketX + r, startY);
        ctx.quadraticCurveTo(bracketX, startY, bracketX, startY + r);
        // Vertical line
        ctx.lineTo(bracketX, endY - r);
        // Bottom arm
        ctx.quadraticCurveTo(bracketX, endY, bracketX + r, endY);
        ctx.lineTo(bracketX + bracketWidth, endY);
        ctx.stroke();
        
        // Draw the group name (rotated vertically)
        // Use shortName for subgroups
        const displayGroupName = group.shortName || group.name;
        if (displayGroupName && bracketHeight > 20) {
            ctx.save();
            ctx.font = 'bold 11px Arial, sans-serif';
            ctx.fillStyle = bracketColor;
            
            const textX = bracketX - 3;
            const textY = startY + bracketHeight / 2;
            
            ctx.translate(textX, textY);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            // Truncate the name if it is too long
            let finalName = displayGroupName;
            const maxWidth = bracketHeight - 8;
            let measured = ctx.measureText(finalName).width;
            while (measured > maxWidth && finalName.length > 1) {
                finalName = finalName.slice(0, -1);
                measured = ctx.measureText(finalName + '…').width;
            }
            if (finalName !== displayGroupName && finalName.length > 0) {
                finalName += '…';
            }
            
            ctx.fillText(finalName, 0, 0);
            ctx.restore();
        }
    }
}

/**
 * Returns the extra indent for a signal name based on its group and depth
 */
function getSignalNameIndent(doc, signalIndex) {
    const signals = doc.m_signals || [];
    if (signalIndex < 0 || signalIndex >= signals.length) return 0;
    
    const groupName = signals[signalIndex].groupName;
    if (!groupName) return 0;
    
    const depth = getGroupDepth(groupName);
    return GROUP_VISUAL.signalIndent + (depth * GROUP_VISUAL.subgroupIndent);
}

/**
 * Hit test for clicks on a group bracket
 * Each group level has its own exclusive horizontal zone
 * A click on the left zone selects the parent group; the right zone selects the subgroup
 */
function hitTestGroupBracket(doc, mouseX, mouseY, signalStartY, rowHeight, signals) {
    const groups = getGroups(doc);
    if (groups.length === 0) return null;
    
    // Find the maximum depth
    const maxDepth = groups.reduce((max, g) => Math.max(max, g.depth), 0);
    
    // Process from the deepest level upward
    // Each level has its own exclusive horizontal zone
    for (let depth = maxDepth; depth >= 0; depth--) {
        const groupsAtDepth = groups.filter(g => g.depth === depth);
        
        for (const group of groupsAtDepth) {
            // Compute the exclusive horizontal zone for this level
            // The bracket sits at: bracketPadding + depth * subgroupIndent
            const bracketX = GROUP_VISUAL.bracketPadding + depth * GROUP_VISUAL.subgroupIndent;
            
            // Exclusive zone: from this level's bracket to the next level's bracket
            const hitLeft = bracketX - 20; // A little before the bracket, so it is easy to click
            const nextBracketX = GROUP_VISUAL.bracketPadding + (depth + 1) * GROUP_VISUAL.subgroupIndent;
            const hitRight = nextBracketX - 5; // Stop just before the next level
            
            const startY = signalStartY + group.startIndex * rowHeight;
            const endY = signalStartY + (group.endIndex + 1) * rowHeight;
            
            // Check vertical first, then horizontal
            if (mouseY >= startY && mouseY <= endY &&
                mouseX >= hitLeft && mouseX < hitRight) {
                return group;
            }
        }
    }
    
    return null;
}

// ============================================
// Export the API
// ============================================

if (typeof window !== 'undefined') {
    window.GroupManager = {
        // Constants
        VISUAL: GROUP_VISUAL,
        
        // Hierarchy
        getGroupDepth,
        getParentGroupName,
        getShortGroupName,
        
        // Queries
        getGroups,
        getSignalGroupName,
        isSignalInGroup,
        getSignalsInGroup,
        getSignalsInGroupRecursive,
        getGroupContainingSignal,
        getGroupNames,
        
        // Modification
        createGroup,
        addSignalsToGroup,
        removeSignalsFromGroup,
        renameGroup,
        setGroupColor,
        deleteGroup,
        
        // Rendering
        drawGroupBrackets,
        getSignalNameIndent,
        hitTestGroupBracket
    };
}
