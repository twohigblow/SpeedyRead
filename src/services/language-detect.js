/**
 * Language Detection Utility
 * 
 * Detects the primary language of text to select appropriate TTS voice.
 */

/**
 * Detect the primary language of the text
 * @param {string} text - Text to analyze
 * @returns {'zh' | 'en'} - Detected language code
 */
export function detectLanguage(text) {
    if (!text) return 'zh'; // Default to Chinese

    // Count Chinese characters (CJK Unified Ideographs)
    const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length || 0;

    // Count English/Latin alphabet characters
    const englishChars = text.match(/[a-zA-Z]/g)?.length || 0;

    const result = chineseChars > englishChars ? 'zh' : 'en';

    console.log(`[Lang Detect] Chinese: ${chineseChars}, English: ${englishChars} => ${result}`);

    return result;
}

/**
 * Check if text is primarily Chinese
 */
export function isChinese(text) {
    return detectLanguage(text) === 'zh';
}

/**
 * Check if text is primarily English
 */
export function isEnglish(text) {
    return detectLanguage(text) === 'en';
}

/**
 * Get the appropriate voice URI based on text language
 * @param {string} text - Text to speak
 * @param {string} chineseVoiceUri - URI for Chinese voice
 * @param {string} englishVoiceUri - URI for English voice
 * @returns {string} - Selected voice URI
 */
export function selectVoiceForText(text, chineseVoiceUri, englishVoiceUri) {
    const lang = detectLanguage(text);

    if (lang === 'en' && englishVoiceUri) {
        return englishVoiceUri;
    }

    return chineseVoiceUri || null;
}

/**
 * Get base time per unit for karaoke timing
 * English is typically spoken faster than Chinese
 * @param {string} text - Text to analyze
 * @returns {number} - Milliseconds per character at 1x speed
 */
export function getBaseTimePerChar(text) {
    const lang = detectLanguage(text);

    // Calibrated values:
    // Chinese: ~5 chars/second at 1x = 200ms/char (but measured ~340ms, so use 150ms for safety)
    // English: ~8-10 words/second at 1x = ~100-125ms/word average
    return lang === 'zh' ? 0.15 : 0.12; // seconds
}
