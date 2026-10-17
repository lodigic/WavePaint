// SignalTypes.js - Signal type definitions and utilities

// Signal types are already defined in core.js as SignalType enum
// This file provides additional type-related utilities

/**
 * Checks if a signal type is drawable.
 * @param {number} type - Signal type
 * @returns {boolean} true if drawable
 */
function isDrawableSignalType(type) {
    return type === SignalType.Bit || type === SignalType.Vector;
}

/**
 * Gets the display name for a signal type.
 * @param {number} type - Signal type
 * @returns {string} Display name
 */
function getSignalTypeName(type) {
    switch(type) {
        case SignalType.Bit: return 'Bit';
        case SignalType.Vector: return 'Vector';
        case SignalType.BlankRow: return 'Blank Row';
        default: return 'Unknown';
    }
}

/**
 * Gets the display name for a radix.
 * @param {number} radix - Radix value
 * @returns {string} Display name
 */
function getRadixName(radix) {
    switch(radix) {
        case Radix.Hexadecimal: return 'Hex';
        case Radix.Decimal: return 'Dec';
        case Radix.Binary: return 'Bin';
        default: return 'Unknown';
    }
}
