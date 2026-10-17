// VcdHierarchy.js - VCD signal hierarchy panel for WavePaint Web

/**
 * @brief VCD Hierarchy Panel Manager
 * 
 * Provides a panel for viewing and managing imported VCD signals:
 * - Hierarchical tree view of modules
 * - Signal list for selected module
 * - Transfer signals to main waveform view
 * - Search functionality
 */
const VcdHierarchyPanel = (function() {
    'use strict';

    // State
    let isVisible = false;
    let selectedModulePath = '';
    let selectedSignalIndices = new Set();

    /**
     * @brief Create the VCD hierarchy panel HTML
     */
    function createPanel() {
        // Check if panel already exists
        if (document.getElementById('vcd-hierarchy-panel')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'vcd-hierarchy-panel';
        panel.className = 'vcd-hierarchy-panel hidden';
        panel.innerHTML = `
            <div class="vcd-panel-header">
                <span class="vcd-panel-title">VCD Signals</span>
                <div class="vcd-panel-actions">
                    <button id="vcd-transfer-btn" class="vcd-panel-btn" title="Transfer selected signals to waveform">
                        ➕ Add to Waveform
                    </button>
                    <button id="vcd-transfer-all-btn" class="vcd-panel-btn" title="Transfer all signals from current module">
                        ➕ Add All
                    </button>
                    <button id="vcd-close-btn" class="vcd-panel-btn close" title="Close VCD panel">✕</button>
                </div>
            </div>
            <div class="vcd-panel-search">
                <input type="text" id="vcd-search-input" placeholder="Search signals..." />
            </div>
            <div class="vcd-panel-content">
                <div class="vcd-panel-splitter">
                    <div class="vcd-hierarchy-tree" id="vcd-hierarchy-tree">
                        <div class="vcd-tree-empty">No VCD file loaded</div>
                    </div>
                    <div class="vcd-splitter-handle" id="vcd-splitter-handle"></div>
                    <div class="vcd-signal-list" id="vcd-signal-list">
                        <div class="vcd-list-empty">Select a module</div>
                    </div>
                </div>
            </div>
            <div class="vcd-panel-footer">
                <span id="vcd-status">Ready</span>
                <span id="vcd-signal-count"></span>
            </div>
        `;

        // Insert after main-area
        const mainArea = document.getElementById('main-area');
        if (mainArea && mainArea.parentNode) {
            mainArea.parentNode.insertBefore(panel, mainArea.nextSibling);
        } else {
            document.body.appendChild(panel);
        }

        // Setup event handlers
        setupEventHandlers();
    }

    /**
     * @brief Setup event handlers for the panel
     */
    function setupEventHandlers() {
        // Close button
        const closeBtn = document.getElementById('vcd-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => hide());
        }

        // Transfer button
        const transferBtn = document.getElementById('vcd-transfer-btn');
        if (transferBtn) {
            transferBtn.addEventListener('click', () => transferSelected());
        }

        // Transfer all button
        const transferAllBtn = document.getElementById('vcd-transfer-all-btn');
        if (transferAllBtn) {
            transferAllBtn.addEventListener('click', () => transferAllFromCurrentModule());
        }

        // Search input
        const searchInput = document.getElementById('vcd-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => filterSignals(e.target.value));
        }

        // Splitter handle for resizing
        const splitterHandle = document.getElementById('vcd-splitter-handle');
        if (splitterHandle) {
            let isDragging = false;
            let startX = 0;
            let startWidth = 0;

            splitterHandle.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                const tree = document.getElementById('vcd-hierarchy-tree');
                startWidth = tree.offsetWidth;
                document.body.style.cursor = 'col-resize';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const tree = document.getElementById('vcd-hierarchy-tree');
                const delta = e.clientX - startX;
                const newWidth = Math.max(100, Math.min(400, startWidth + delta));
                tree.style.width = `${newWidth}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    document.body.style.cursor = '';
                }
            });
        }
    }

    /**
     * @brief Show the VCD panel
     */
    function show() {
        createPanel();
        const panel = document.getElementById('vcd-hierarchy-panel');
        if (panel) {
            panel.classList.remove('hidden');
            isVisible = true;
            
            // Adjust main area
            const mainArea = document.getElementById('main-area');
            if (mainArea) {
                mainArea.classList.add('with-vcd-panel');
            }
        }
    }

    /**
     * @brief Hide the VCD panel
     */
    function hide() {
        const panel = document.getElementById('vcd-hierarchy-panel');
        if (panel) {
            panel.classList.add('hidden');
            isVisible = false;
            
            // Restore main area
            const mainArea = document.getElementById('main-area');
            if (mainArea) {
                mainArea.classList.remove('with-vcd-panel');
            }
        }
    }

    /**
     * @brief Toggle panel visibility
     */
    function toggle() {
        if (isVisible) {
            hide();
        } else {
            show();
        }
    }

    /**
     * @brief Check if panel is visible
     * @return {boolean}
     */
    function isOpen() {
        return isVisible;
    }

    /**
     * @brief Rebuild the hierarchy tree from VCD signals
     * @param {WaveDocument} doc - The document containing VCD signals
     */
    function rebuildHierarchy(doc) {
        if (!doc || !doc.m_vcdSignals || doc.m_vcdSignals.length === 0) {
            clearPanel();
            return;
        }

        show();

        const treeContainer = document.getElementById('vcd-hierarchy-tree');
        const statusEl = document.getElementById('vcd-signal-count');
        
        if (!treeContainer) return;

        // Build hierarchy
        const hierarchy = VcdIO.buildHierarchy(doc.m_vcdSignals);
        
        // Update status
        if (statusEl) {
            statusEl.textContent = `${doc.m_vcdSignals.length} signals`;
        }

        // Clear and rebuild tree
        treeContainer.innerHTML = '';
        
        if (hierarchy.children.size === 0 && hierarchy.signals.length === 0) {
            treeContainer.innerHTML = '<div class="vcd-tree-empty">No signals found</div>';
            return;
        }

        // Create tree recursively
        const buildTreeNode = (node, path = '') => {
            const container = document.createElement('div');
            container.className = 'vcd-tree-node';

            // Add child modules
            for (const [name, child] of node.children) {
                const childPath = path ? `${path}.${name}` : name;
                const moduleEl = document.createElement('div');
                moduleEl.className = 'vcd-tree-module';
                
                const hasChildren = child.children.size > 0;
                const signalCount = countSignalsRecursive(child);
                
                moduleEl.innerHTML = `
                    <span class="vcd-tree-toggle">${hasChildren ? '▶' : '•'}</span>
                    <span class="vcd-tree-icon">📁</span>
                    <span class="vcd-tree-name">${name}</span>
                    <span class="vcd-tree-count">(${signalCount})</span>
                `;
                
                moduleEl.dataset.path = childPath;
                
                // Click to select module
                moduleEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectModule(childPath, doc);
                    
                    // Toggle expansion
                    const toggle = moduleEl.querySelector('.vcd-tree-toggle');
                    const childContainer = moduleEl.nextElementSibling;
                    if (childContainer && childContainer.classList.contains('vcd-tree-children')) {
                        const isExpanded = !childContainer.classList.contains('hidden');
                        childContainer.classList.toggle('hidden');
                        if (toggle) toggle.textContent = isExpanded ? '▶' : '▼';
                    }
                });

                container.appendChild(moduleEl);

                // Add children container
                if (hasChildren) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'vcd-tree-children';
                    childrenContainer.appendChild(buildTreeNode(child, childPath));
                    container.appendChild(childrenContainer);
                }
            }

            return container;
        };

        treeContainer.appendChild(buildTreeNode(hierarchy));

        // Expand all initially
        const toggles = treeContainer.querySelectorAll('.vcd-tree-toggle');
        toggles.forEach(t => {
            if (t.textContent === '▶') {
                const module = t.parentElement;
                const children = module.nextElementSibling;
                if (children && children.classList.contains('vcd-tree-children')) {
                    children.classList.remove('hidden');
                    t.textContent = '▼';
                }
            }
        });

        // Select first module by default
        const firstModule = treeContainer.querySelector('.vcd-tree-module');
        if (firstModule) {
            const path = firstModule.dataset.path;
            selectModule(path, doc);
        }
    }

    /**
     * @brief Count signals in a hierarchy node recursively
     */
    function countSignalsRecursive(node) {
        let count = node.signals.length;
        for (const child of node.children.values()) {
            count += countSignalsRecursive(child);
        }
        return count;
    }

    /**
     * @brief Select a module and show its signals
     * @param {string} path - Module path
     * @param {WaveDocument} doc - Document
     */
    function selectModule(path, doc) {
        selectedModulePath = path;
        selectedSignalIndices.clear();

        // Update tree selection
        const treeContainer = document.getElementById('vcd-hierarchy-tree');
        if (treeContainer) {
            treeContainer.querySelectorAll('.vcd-tree-module').forEach(m => {
                m.classList.toggle('selected', m.dataset.path === path);
            });
        }

        // Get signals for this module using fullName for path matching
        const signals = [];
        const prefix = path + '.';
        
        for (let i = 0; i < doc.m_vcdSignals.length; i++) {
            const sig = doc.m_vcdSignals[i];
            // Use fullName for hierarchy matching, fallback to name
            const hierarchicalName = sig.fullName || sig.name;
            
            // Include signals that belong to this module (not nested deeper)
            if (hierarchicalName.startsWith(prefix)) {
                const remainder = hierarchicalName.substring(prefix.length);
                if (!remainder.includes('.')) {
                    signals.push({ index: i, name: sig.name, fullName: hierarchicalName });
                }
            } else if (!hierarchicalName.includes('.') && path === '') {
                // Top-level signals when no path
                signals.push({ index: i, name: sig.name, fullName: hierarchicalName });
            }
        }

        // Show signals in list
        showSignalList(signals, doc);

        // Update status
        const statusEl = document.getElementById('vcd-status');
        if (statusEl) {
            statusEl.textContent = `Module: ${path || '(root)'}`;
        }
    }

    /**
     * @brief Show signal list
     * @param {Array} signals - Array of { index, name, fullName }
     * @param {WaveDocument} doc - Document
     */
    function showSignalList(signals, doc) {
        const listContainer = document.getElementById('vcd-signal-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (signals.length === 0) {
            listContainer.innerHTML = '<div class="vcd-list-empty">No signals in this module</div>';
            return;
        }

        for (const sig of signals) {
            const signalEl = document.createElement('div');
            signalEl.className = 'vcd-signal-item';
            signalEl.dataset.index = sig.index;
            
            const vcdSignal = doc.m_vcdSignals[sig.index];
            const typeIcon = vcdSignal.type === SignalType.Vector ? '📊' : '📈';
            const width = vcdSignal.type === SignalType.Vector ? '[n:0]' : '';
            
            // Add tooltip with full hierarchical name
            signalEl.title = sig.fullName || sig.name;
            
            signalEl.innerHTML = `
                <span class="vcd-signal-icon">${typeIcon}</span>
                <span class="vcd-signal-name">${sig.name}</span>
                <span class="vcd-signal-width">${width}</span>
            `;

            // Click to select
            signalEl.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    if (selectedSignalIndices.has(sig.index)) {
                        selectedSignalIndices.delete(sig.index);
                        signalEl.classList.remove('selected');
                    } else {
                        selectedSignalIndices.add(sig.index);
                        signalEl.classList.add('selected');
                    }
                } else if (e.shiftKey && selectedSignalIndices.size > 0) {
                    // Range select
                    const lastIndex = Array.from(selectedSignalIndices).pop();
                    const items = listContainer.querySelectorAll('.vcd-signal-item');
                    let inRange = false;
                    items.forEach(item => {
                        const idx = parseInt(item.dataset.index);
                        if (idx === lastIndex || idx === sig.index) {
                            inRange = !inRange;
                            selectedSignalIndices.add(idx);
                            item.classList.add('selected');
                        } else if (inRange) {
                            selectedSignalIndices.add(idx);
                            item.classList.add('selected');
                        }
                    });
                    // Include the end point
                    selectedSignalIndices.add(sig.index);
                    signalEl.classList.add('selected');
                } else {
                    // Single select
                    listContainer.querySelectorAll('.vcd-signal-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    selectedSignalIndices.clear();
                    selectedSignalIndices.add(sig.index);
                    signalEl.classList.add('selected');
                }
            });

            // Double-click to transfer
            signalEl.addEventListener('dblclick', () => {
                selectedSignalIndices.clear();
                selectedSignalIndices.add(sig.index);
                transferSelected();
            });

            listContainer.appendChild(signalEl);
        }
    }

    /**
     * @brief Filter signals by search term
     * @param {string} term - Search term
     */
    function filterSignals(term) {
        const listContainer = document.getElementById('vcd-signal-list');
        if (!listContainer) return;

        const items = listContainer.querySelectorAll('.vcd-signal-item');
        const lowerTerm = term.toLowerCase();

        items.forEach(item => {
            const name = item.querySelector('.vcd-signal-name');
            if (name) {
                const matches = name.textContent.toLowerCase().includes(lowerTerm);
                item.style.display = matches || !term ? '' : 'none';
            }
        });
    }

    /**
     * @brief Transfer selected signals to main waveform
     */
    function transferSelected() {
        if (selectedSignalIndices.size === 0) {
            if (typeof wpAlert === 'function') {
                wpAlert('Please select signals to transfer', 'VCD Import');
            }
            return;
        }

        if (typeof document_wave !== 'undefined' && typeof VcdIO !== 'undefined') {
            VcdIO.transferVcdSignalsToMain(document_wave, Array.from(selectedSignalIndices));
            
            if (typeof drawWaveform === 'function') {
                drawWaveform();
            }
            if (typeof updateSidePanels === 'function') {
                updateSidePanels();
            }
            
            if (typeof wpAlert === 'function') {
                wpAlert(`Transferred ${selectedSignalIndices.size} signal(s) to waveform`, 'VCD Import');
            }
        }
    }

    /**
     * @brief Transfer all signals from current module
     */
    function transferAllFromCurrentModule() {
        const listContainer = document.getElementById('vcd-signal-list');
        if (!listContainer) return;

        const items = listContainer.querySelectorAll('.vcd-signal-item');
        if (items.length === 0) {
            if (typeof wpAlert === 'function') {
                wpAlert('No signals in current module', 'VCD Import');
            }
            return;
        }

        // Select all visible signals
        selectedSignalIndices.clear();
        items.forEach(item => {
            if (item.style.display !== 'none') {
                selectedSignalIndices.add(parseInt(item.dataset.index));
            }
        });

        transferSelected();
    }

    /**
     * @brief Clear the panel
     */
    function clearPanel() {
        const treeContainer = document.getElementById('vcd-hierarchy-tree');
        const listContainer = document.getElementById('vcd-signal-list');
        const statusEl = document.getElementById('vcd-status');
        const countEl = document.getElementById('vcd-signal-count');

        if (treeContainer) {
            treeContainer.innerHTML = '<div class="vcd-tree-empty">No VCD file loaded</div>';
        }
        if (listContainer) {
            listContainer.innerHTML = '<div class="vcd-list-empty">Select a module</div>';
        }
        if (statusEl) {
            statusEl.textContent = 'Ready';
        }
        if (countEl) {
            countEl.textContent = '';
        }

        selectedModulePath = '';
        selectedSignalIndices.clear();
    }

    // Public API
    return {
        show,
        hide,
        toggle,
        isOpen,
        rebuildHierarchy,
        clearPanel
    };
})();
