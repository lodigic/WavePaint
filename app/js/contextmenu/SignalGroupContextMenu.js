/**
 * Signal Group Context Menu - Right-click context menu for signal grouping
 * (Simplified version: uses groupName instead of groupId)
 */

/**
 * Shows a context menu for selected signals (for grouping functionality).
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 * @param {Array<number>} selectedSignalIndices - Array of selected signal indices
 */
function showSignalGroupContextMenu(clientX, clientY, selectedSignalIndices) {
    // Remove any existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    if (!selectedSignalIndices || selectedSignalIndices.length === 0) return;

    // Create context menu
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

    // Helper function to add menu items
    function addMenuItem(text, callback, disabled = false) {
        const item = document.createElement('div');
        item.textContent = text;
        item.style.padding = '8px 12px';
        item.style.cursor = disabled ? 'default' : 'pointer';
        item.style.color = disabled ? 'var(--text-disabled, #888)' : 'var(--text-color)';
        item.style.opacity = disabled ? '0.6' : '1';
        if (!disabled) {
            item.addEventListener('mouseenter', () => {
                item.style.background = 'var(--accent-color)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            item.addEventListener('click', () => {
                callback();
                if (menu.parentNode) document.body.removeChild(menu);
            });
        }
        menu.appendChild(item);
        return item;
    }

    // Add separator
    function addSeparator() {
        const sep = document.createElement('div');
        sep.style.height = '1px';
        sep.style.background = 'var(--border-color)';
        sep.style.margin = '4px 0';
        menu.appendChild(sep);
    }

    // Check if selected signals are in a group (simplified groupName model)
    const signals = document_wave.signalList();
    
    // Check whether ANY selected signal is in a group
    let existingGroupName = null;
    let anySignalInGroup = false;
    for (const idx of selectedSignalIndices) {
        const sig = signals[idx];
        if (sig && sig.groupName) {
            anySignalInGroup = true;
            if (!existingGroupName) {
                existingGroupName = sig.groupName;
            }
        }
    }
    
    const groupShortName = existingGroupName ? GroupManager.getShortGroupName(existingGroupName) : null;
    const isSubgroup = existingGroupName && existingGroupName.includes('/');

    // Create Group or Create Subgroup (when several signals are selected)
    if (selectedSignalIndices.length > 1) {
        if (anySignalInGroup) {
            // If any signal is in a group, only offer to create a subgroup
            addMenuItem(`Create Subgroup in "${groupShortName}"...`, async () => {
                const subName = prompt('Enter subgroup name:', 'Subgroup');
                if (subName && subName.trim()) {
                    const fullName = existingGroupName + '/' + subName.trim();
                    document_wave.pushUndoSnapshot();
                    GroupManager.createGroup(document_wave, fullName, selectedSignalIndices);
                    drawWaveform();
                }
            });
        } else {
            // If no signal is in a group, offer to create a new group
            addMenuItem('Create Group...', async () => {
                const groupName = prompt('Enter group name:', 'Group');
                if (groupName && groupName.trim()) {
                    document_wave.pushUndoSnapshot();
                    GroupManager.createGroup(document_wave, groupName.trim(), selectedSignalIndices);
                    drawWaveform();
                }
            });
        }
    }

    // If the signal is in a group, show the group options
    if (existingGroupName) {
        if (selectedSignalIndices.length > 1) {
            addSeparator();
        }
        
        addMenuItem(`Rename "${groupShortName}"...`, async () => {
            const newName = prompt(`Enter new name for ${isSubgroup ? 'subgroup' : 'group'}:`, groupShortName);
            if (newName && newName.trim()) {
                document_wave.pushUndoSnapshot();
                // Keep the parent hierarchy when this is a subgroup
                const parentPath = GroupManager.getParentGroupName(existingGroupName);
                const finalName = parentPath ? parentPath + '/' + newName.trim() : newName.trim();
                GroupManager.renameGroup(document_wave, existingGroupName, finalName);
                drawWaveform();
            }
        });
        
        addSeparator();
        
        addMenuItem(`Remove from "${groupShortName}"`, () => {
            document_wave.pushUndoSnapshot();
            GroupManager.removeSignalsFromGroup(document_wave, selectedSignalIndices);
            drawWaveform();
        });
        
        addMenuItem(`Delete "${groupShortName}"`, () => {
            document_wave.pushUndoSnapshot();
            GroupManager.deleteGroup(document_wave, existingGroupName);
            drawWaveform();
        });
    }
    
    // If there are no options, do not show an empty menu
    if (menu.children.length === 0) {
        return;
    }

    // Close menu when clicking elsewhere
    function closeMenu(e) {
        if (!menu.contains(e.target)) {
            if (menu.parentNode) document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        }
    }

    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}
