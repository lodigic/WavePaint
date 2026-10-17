/**
 * AppInitMenus.js - Menu initialization and handlers
 */

/**
 * Initializes menu action handlers.
 */
function initMenuHandlers() {
    // Menu actions
    document.querySelectorAll('[data-action]').forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            const action = this.getAttribute('data-action');
            console.log('Menu action clicked:', action);
            await handleAction(action);
            // Collapse dropdown after action
            const dropdownContent = this.closest('.dropdown-content');
            if (dropdownContent) {
                dropdownContent.style.display = 'none';
                // Also collapse any open submenus
                const submenus = dropdownContent.querySelectorAll('.submenu-content');
                submenus.forEach(submenu => {
                    submenu.style.display = 'none';
                });
            }
            // Also collapse menu-bar submenus
            document.querySelectorAll('#menu-bar .submenu').forEach(s => {
                s.style.visibility = '';
                s.style.display = '';
            });
        });
    });

    // File menu handlers
    console.log('Setting up File menu handlers...');
    const fileMenuItems = document.querySelectorAll('#menu-bar .submenu li');
    
    fileMenuItems.forEach(item => {
        const text = item.textContent.trim();
        
        if (text === 'New') {
            item.addEventListener('click', async function(e) {
                e.preventDefault();
                console.log('Creating new file...');
                const confirm = await wpConfirm('Create a new waveform? All unsaved changes will be lost.', 'New File');
                if (confirm) {
                    document_wave = new WaveDocument();
                    selectedSignalIndex = -1;
                    drawWaveform();
                    updateSidePanels();
                    updateColorPicker();
                }
                document.querySelectorAll('#menu-bar .submenu').forEach(s => {
                    s.style.visibility = '';
                    s.style.display = '';
                });
            });
        } else if (text === 'Open') {
            item.addEventListener('click', async function(e) {
                e.preventDefault();
                console.log('Opening file...');
                const success = await openFile(document_wave);
                if (success) {
                    selectedSignalIndex = -1;
                    document.getElementById('sample-spin').value = document_wave.m_sampleCount;
                    document.getElementById('substep-spin').value = document_wave.m_subStepCount;
                    drawWaveform();
                    updateSidePanels();
                    updateColorPicker();
                    await wpAlert('File loaded successfully!', 'Open File');
                }
                document.querySelectorAll('#menu-bar .submenu').forEach(s => {
                    s.style.visibility = '';
                    s.style.display = '';
                });
            });
        } else if (text === 'Save As') {
            item.addEventListener('click', async function(e) {
                e.preventDefault();
                console.log('Saving file...');
                const fileName = await wpPrompt('Enter file name:', 'waveform.wp', 'Save File');
                if (fileName) {
                    const success = await saveToFile(document_wave, fileName);
                    if (success) {
                        await wpAlert('File saved successfully!', 'Save File');
                    } else {
                        await wpAlert('Failed to save file.', 'Save File');
                    }
                }
                document.querySelectorAll('#menu-bar .submenu').forEach(s => {
                    s.style.visibility = '';
                    s.style.display = '';
                });
            });
        } else if (text === 'Copy Share Link') {
            item.addEventListener('click', async function(e) {
                e.preventDefault();
                document.querySelectorAll('#menu-bar .submenu').forEach(s => {
                    s.style.visibility = '';
                    s.style.display = '';
                });
                try {
                    const url = await createShareLink(document_wave);
                    let copied = false;
                    try {
                        await navigator.clipboard.writeText(url);
                        copied = true;
                    } catch (clipErr) {
                        console.warn('Clipboard write failed, showing link instead:', clipErr);
                    }
                    const note = url.length > 8000
                        ? '\n\n(Heads up: this diagram is large, so the link is long — some chat apps may truncate it.)'
                        : '';
                    if (copied) {
                        await wpAlert('Share link copied to clipboard!\n\n' + url + note, 'Share Link');
                    } else {
                        await wpPrompt('Copy this share link:', url, 'Share Link');
                    }
                } catch (err) {
                    console.error('Failed to create share link:', err);
                    await wpAlert('Could not create a share link.', 'Share Link');
                }
            });
        } else if (text === 'Load Example') {
            item.addEventListener('click', async function(e) {
                e.preventDefault();
                console.log('Opening Load Example dialog...');
                await openLoadExampleDialog();
                document.querySelectorAll('#menu-bar .submenu').forEach(s => {
                    s.style.visibility = '';
                    s.style.display = '';
                });
            });
        }
    });
}

/**
 * Initializes dropdown menu handlers.
 */
function initDropdownHandlers() {
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.querySelector('.dropdown');
        const dropdownContent = document.querySelector('.dropdown-content');
        
        if (dropdown && dropdownContent && 
            !dropdown.contains(e.target) && 
            dropdownContent.style.display === 'block') {
            dropdownContent.style.display = 'none';
            const submenus = dropdownContent.querySelectorAll('.submenu-content');
            submenus.forEach(submenu => {
                submenu.style.display = 'none';
            });
        }
    });

    // Handle submenu hover
    document.querySelectorAll('.submenu').forEach(submenu => {
        const submenuContent = submenu.querySelector('.submenu-content');
        let hideTimeout;
        
        submenu.addEventListener('mouseenter', function() {
            if (hideTimeout) clearTimeout(hideTimeout);
            if (submenuContent) submenuContent.style.display = 'block';
        });
        
        submenu.addEventListener('mouseleave', function(e) {
            const relatedTarget = e.relatedTarget;
            if (submenuContent && !submenuContent.contains(relatedTarget)) {
                hideTimeout = setTimeout(() => {
                    if (submenuContent) submenuContent.style.display = 'none';
                }, 300);
            }
        });
        
        if (submenuContent) {
            submenuContent.addEventListener('mouseenter', function() {
                if (hideTimeout) clearTimeout(hideTimeout);
            });
            
            submenuContent.addEventListener('mouseleave', function(e) {
                const relatedTarget = e.relatedTarget;
                if (!submenu.contains(relatedTarget)) {
                    hideTimeout = setTimeout(() => {
                        submenuContent.style.display = 'none';
                    }, 300);
                }
            });
        }
    });

    // Dropdown toggle
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        const dropdownBtn = dropdown.querySelector('.tool-btn');

        if (dropdownBtn) {
            dropdownBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (dropdownContent.style.display === 'block') {
                    dropdownContent.style.display = 'none';
                    dropdownContent.querySelectorAll('.submenu-content').forEach(s => s.style.display = 'none');
                } else {
                    const rect = dropdownBtn.getBoundingClientRect();
                    dropdownContent.style.position = 'fixed';
                    dropdownContent.style.top = `${rect.bottom}px`;
                    dropdownContent.style.left = `${rect.left}px`;
                    dropdownContent.style.zIndex = '1150';
                    dropdownContent.style.display = 'block';
                }
            });
        }
        
        // Close dropdown when mouse leaves the entire dropdown area
        let dropdownCloseTimeout;
        dropdown.addEventListener('mouseleave', function(e) {
            if (dropdownContent.style.display === 'block') {
                dropdownCloseTimeout = setTimeout(() => {
                    dropdownContent.style.display = 'none';
                    dropdownContent.querySelectorAll('.submenu-content').forEach(s => s.style.display = 'none');
                }, 100);
            }
        });
        dropdown.addEventListener('mouseenter', function() {
            if (dropdownCloseTimeout) clearTimeout(dropdownCloseTimeout);
        });
        dropdownContent.addEventListener('mouseenter', function() {
            if (dropdownCloseTimeout) clearTimeout(dropdownCloseTimeout);
        });
    }

    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.display = 'none';
                content.querySelectorAll('.submenu-content').forEach(s => s.style.display = 'none');
            });
        }
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initMenuHandlers, initDropdownHandlers };
}
