/**
 * Groups.js - Sistema Simplificado de Grupos de Señales
 * 
 * MODELO SIMPLE:
 * - Cada señal tiene un campo `groupName` (string o null)
 * - Señales con el mismo groupName forman un grupo visual
 * - Los subgrupos usan nombres jerárquicos: "Parent/Child/Grandchild"
 * - Los grupos se "descubren" dinámicamente de las señales
 */

// ============================================
// Constantes Visuales de Grupos
// ============================================

const GROUP_VISUAL = {
    bracketWidth: 10,
    bracketPadding: 32,    // Espacio inicial antes del primer bracket
    curveRadius: 5,
    lineWidth: 2,
    signalIndent: 12,
    subgroupIndent: 24,    // Separación entre niveles de subgrupos
    defaultColor: '#6496C8',
    headerHeight: 24,
    headerPadding: 4,
    // Colores por nivel de profundidad (para cuando no hay color asignado)
    depthColors: ['#6496C8', '#96C864', '#C89664', '#9664C8', '#64C896']
};

// ============================================
// Funciones Auxiliares de Jerarquía
// ============================================

/**
 * Obtiene el nivel de profundidad de un grupo por su nombre
 * "Group" -> 0, "Parent/Child" -> 1, "A/B/C" -> 2
 */
function getGroupDepth(groupName) {
    if (!groupName) return 0;
    return (groupName.match(/\//g) || []).length;
}

/**
 * Obtiene el nombre padre de un subgrupo
 * "Parent/Child" -> "Parent", "Group" -> null
 */
function getParentGroupName(groupName) {
    if (!groupName || !groupName.includes('/')) return null;
    return groupName.substring(0, groupName.lastIndexOf('/'));
}

/**
 * Obtiene el nombre corto (sin el path) de un grupo
 * "Parent/Child" -> "Child", "Group" -> "Group"
 */
function getShortGroupName(groupName) {
    if (!groupName) return '';
    const lastSlash = groupName.lastIndexOf('/');
    return lastSlash >= 0 ? groupName.substring(lastSlash + 1) : groupName;
}

// ============================================
// Funciones de Consulta de Grupos
// ============================================

/**
 * Obtiene todos los grupos únicos del documento, incluyendo grupos padre inferidos
 * Un grupo incluye todas las señales con el mismo groupName
 * El bracket va desde la primera hasta la última señal del grupo
 * Para subgrupos, también se crean los grupos padre automáticamente
 * @returns {Array<{name: string, color: string, startIndex: number, endIndex: number, depth: number, shortName: string}>}
 */
function getGroups(doc) {
    const signals = doc.m_signals || [];
    const groupMap = new Map(); // name -> { name, color, startIndex, endIndex, depth }
    
    for (let i = 0; i < signals.length; i++) {
        const signal = signals[i];
        const groupName = signal.groupName || null;
        
        if (groupName) {
            // Registrar el grupo de la señal
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
            
            // También registrar todos los grupos padre para crear jerarquía visual
            let parentName = getParentGroupName(groupName);
            while (parentName) {
                if (groupMap.has(parentName)) {
                    // Extender el grupo padre para incluir esta señal
                    const parent = groupMap.get(parentName);
                    if (i < parent.startIndex) parent.startIndex = i;
                    if (i > parent.endIndex) parent.endIndex = i;
                } else {
                    // Crear grupo padre
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
    
    // Convertir a array y ordenar por depth (padres primero) y luego por startIndex
    return Array.from(groupMap.values()).sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.startIndex - b.startIndex;
    });
}

/**
 * Obtiene el nombre del grupo de una señal
 */
function getSignalGroupName(doc, signalIndex) {
    const signals = doc.m_signals || [];
    if (signalIndex < 0 || signalIndex >= signals.length) return null;
    return signals[signalIndex].groupName || null;
}

/**
 * Verifica si una señal está en un grupo
 */
function isSignalInGroup(doc, signalIndex) {
    return getSignalGroupName(doc, signalIndex) !== null;
}

/**
 * Obtiene todas las señales de un grupo por nombre (solo exacto)
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
 * Obtiene todas las señales de un grupo incluyendo subgrupos
 * Por ejemplo, si groupName es "Bus", incluirá señales de "Bus", "Bus/Address", "Bus/Data", etc.
 */
function getSignalsInGroupRecursive(doc, groupName) {
    const signals = doc.m_signals || [];
    const indices = [];
    const prefix = groupName + '/';
    
    for (let i = 0; i < signals.length; i++) {
        const sigGroupName = signals[i].groupName;
        if (sigGroupName) {
            // Incluir si es exactamente el grupo o si es un subgrupo
            if (sigGroupName === groupName || sigGroupName.startsWith(prefix)) {
                indices.push(i);
            }
        }
    }
    return indices;
}

/**
 * Obtiene el grupo que contiene una señal específica (para hit test)
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
// Funciones de Modificación de Grupos
// ============================================

/**
 * Crea un grupo con las señales seleccionadas
 * @param {WaveDocument} doc 
 * @param {string} name - Nombre del grupo
 * @param {number[]} signalIndices - Índices de las señales a agrupar
 * @param {string} color - Color del grupo (opcional)
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
 * Añade señales a un grupo existente
 */
function addSignalsToGroup(doc, groupName, signalIndices) {
    const signals = doc.m_signals || [];
    
    // Obtener color del grupo existente
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
 * Elimina señales de su grupo (las desagrupa)
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
 * Renombra un grupo
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
 * Cambia el color de un grupo
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
 * Elimina un grupo completamente (desagrupa todas sus señales)
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
 * Obtiene la lista de nombres de grupos únicos
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
// Funciones de Renderizado
// ============================================

/**
 * Dibuja los brackets de grupos en el canvas
 * Soporta subgrupos con indentación visual
 */
function drawGroupBrackets(ctx, doc, signals, signalStartY, rowHeight, nameWidth) {
    const groups = getGroups(doc);
    if (groups.length === 0) return;
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000';
    
    // Ordenar por profundidad para dibujar padres primero (de afuera hacia adentro)
    const sortedGroups = [...groups].sort((a, b) => a.depth - b.depth);
    
    for (const group of sortedGroups) {
        const startY = signalStartY + group.startIndex * rowHeight + 6;
        const endY = signalStartY + (group.endIndex + 1) * rowHeight - 6;
        const bracketHeight = endY - startY;
        
        if (bracketHeight < 10) continue; // Grupo demasiado pequeño
        
        // Indent del bracket según profundidad del subgrupo
        const depthIndent = group.depth * GROUP_VISUAL.subgroupIndent;
        const bracketX = GROUP_VISUAL.bracketPadding + depthIndent;
        const bracketWidth = 8;
        
        // Color del grupo - usar color asignado o color por profundidad
        const depthColorIndex = group.depth % GROUP_VISUAL.depthColors.length;
        const defaultDepthColor = GROUP_VISUAL.depthColors[depthColorIndex];
        const bracketColor = group.color || defaultDepthColor;
        
        ctx.strokeStyle = bracketColor;
        ctx.fillStyle = bracketColor;
        ctx.lineWidth = GROUP_VISUAL.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        
        // Dibujar bracket en forma de [
        const r = Math.min(GROUP_VISUAL.curveRadius, bracketHeight / 4);
        
        ctx.beginPath();
        // Brazo superior
        ctx.moveTo(bracketX + bracketWidth, startY);
        ctx.lineTo(bracketX + r, startY);
        ctx.quadraticCurveTo(bracketX, startY, bracketX, startY + r);
        // Línea vertical
        ctx.lineTo(bracketX, endY - r);
        // Brazo inferior
        ctx.quadraticCurveTo(bracketX, endY, bracketX + r, endY);
        ctx.lineTo(bracketX + bracketWidth, endY);
        ctx.stroke();
        
        // Dibujar nombre del grupo (rotado verticalmente)
        // Usar shortName para subgrupos
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
            
            // Truncar nombre si es muy largo
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
 * Calcula el indent extra para el nombre de la señal según su grupo y profundidad
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
 * Hit test para clicks en el bracket del grupo
 * Cada nivel de grupo tiene su zona horizontal exclusiva
 * Click en zona izquierda = grupo padre, zona derecha = subgrupo
 */
function hitTestGroupBracket(doc, mouseX, mouseY, signalStartY, rowHeight, signals) {
    const groups = getGroups(doc);
    if (groups.length === 0) return null;
    
    // Encontrar la profundidad máxima
    const maxDepth = groups.reduce((max, g) => Math.max(max, g.depth), 0);
    
    // Procesar desde el nivel más profundo hacia arriba
    // Cada nivel tiene su zona horizontal exclusiva
    for (let depth = maxDepth; depth >= 0; depth--) {
        const groupsAtDepth = groups.filter(g => g.depth === depth);
        
        for (const group of groupsAtDepth) {
            // Calcular zona horizontal exclusiva para este nivel
            // El bracket está en: bracketPadding + depth * subgroupIndent
            const bracketX = GROUP_VISUAL.bracketPadding + depth * GROUP_VISUAL.subgroupIndent;
            
            // Zona exclusiva: desde el bracket de este nivel hasta el bracket del siguiente nivel
            const hitLeft = bracketX - 20; // Un poco antes del bracket para fácil click
            const nextBracketX = GROUP_VISUAL.bracketPadding + (depth + 1) * GROUP_VISUAL.subgroupIndent;
            const hitRight = nextBracketX - 5; // Hasta justo antes del siguiente nivel
            
            const startY = signalStartY + group.startIndex * rowHeight;
            const endY = signalStartY + (group.endIndex + 1) * rowHeight;
            
            // Check vertical primero, luego horizontal
            if (mouseY >= startY && mouseY <= endY &&
                mouseX >= hitLeft && mouseX < hitRight) {
                return group;
            }
        }
    }
    
    return null;
}

// ============================================
// Exportar API
// ============================================

if (typeof window !== 'undefined') {
    window.GroupManager = {
        // Constantes
        VISUAL: GROUP_VISUAL,
        
        // Jerarquía
        getGroupDepth,
        getParentGroupName,
        getShortGroupName,
        
        // Consultas
        getGroups,
        getSignalGroupName,
        isSignalInGroup,
        getSignalsInGroup,
        getSignalsInGroupRecursive,
        getGroupContainingSignal,
        getGroupNames,
        
        // Modificación
        createGroup,
        addSignalsToGroup,
        removeSignalsFromGroup,
        renameGroup,
        setGroupColor,
        deleteGroup,
        
        // Renderizado
        drawGroupBrackets,
        getSignalNameIndent,
        hitTestGroupBracket
    };
}
