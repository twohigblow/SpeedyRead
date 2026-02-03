/**
 * Flashcard Utilities
 * Helper functions for flashcard feature
 */

/**
 * Split text into cards by commas
 * @param {string} text - Text to split
 * @returns {string[]} - Array of card content
 */
export function splitIntoCards(text) {
    if (!text) return [];

    // Split by both English and Chinese commas
    const cards = text.split(/[,，]/)
        .map(card => card.trim())
        .filter(card => card.length > 0);

    return cards;
}

/**
 * Get CSS font size value
 * @param {string} size - Size name
 * @returns {string} - CSS font size value
 */
export function getFontSizeValue(size) {
    const sizes = {
        'small': '1.5rem',
        'medium': '2rem',
        'large': '3rem',
        'xlarge': '4rem'
    };
    return sizes[size] || sizes['large'];
}

/**
 * Available font families
 */
export const FONT_FAMILIES = [
    { value: 'system-ui', label: '系統字型' },
    { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Courier New", monospace', label: 'Courier' },
    { value: '"Microsoft JhengHei", "微軟正黑體", sans-serif', label: '微軟正黑體' },
    { value: '"PingFang TC", "蘋方-繁", sans-serif', label: '蘋方體' },
    { value: '"Noto Sans TC", sans-serif', label: 'Noto Sans' }
];

/**
 * Font size options
 */
export const FONT_SIZES = [
    { value: 'small', label: '小 (1.5rem)' },
    { value: 'medium', label: '中 (2rem)' },
    { value: 'large', label: '大 (3rem)' },
    { value: 'xlarge', label: '特大 (4rem)' }
];
