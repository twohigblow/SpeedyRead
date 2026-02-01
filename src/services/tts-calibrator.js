/**
 * TTS Calibrator Service
 * 
 * Measures actual TTS duration by silently pre-playing text.
 * Provides accurate timing for karaoke synchronization.
 */

import { detectLanguage } from './language-detect.js';

// Cache calibration results per text+voice combination
const calibrationCache = new Map();

/**
 * Generate cache key for a text/voice combination
 */
function getCacheKey(text, voiceUri) {
    return `${voiceUri || 'default'}:${text}`;
}

/**
 * Measure actual TTS duration for a piece of text
 * Returns duration in milliseconds
 * 
 * @param {string} text - Text to measure
 * @param {string} voiceUri - Voice URI to use
 * @returns {Promise<number>} Duration in milliseconds
 */
export async function measureDuration(text, voiceUri) {
    const cacheKey = getCacheKey(text, voiceUri);

    // Return cached result if available
    if (calibrationCache.has(cacheKey)) {
        console.log(`Using cached calibration for: "${text.substring(0, 20)}..."`);
        return calibrationCache.get(cacheKey);
    }

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice
        if (voiceUri) {
            const voice = voices.find(v => v.voiceURI === voiceUri);
            if (voice) utterance.voice = voice;
        }

        // Use 1x speed for accurate measurement
        utterance.rate = 1.0;
        // Set volume to 0 for silent calibration
        utterance.volume = 0;

        let startTime;

        utterance.onstart = () => {
            startTime = performance.now();
        };

        utterance.onend = () => {
            const duration = performance.now() - startTime;
            calibrationCache.set(cacheKey, duration);
            console.log(`Calibrated "${text.substring(0, 20)}...": ${Math.round(duration)}ms`);
            resolve(duration);
        };

        utterance.onerror = (e) => {
            console.warn('Calibration error:', e.error);
            // Fall back to estimate
            const estimate = estimateDuration(text);
            resolve(estimate);
        };

        synth.speak(utterance);
    });
}

/**
 * Estimate duration when calibration fails
 * Uses word-length weighting for English
 */
function estimateDuration(text) {
    const lang = detectLanguage(text);

    if (lang === 'zh') {
        // Chinese: ~100ms per character
        const chars = text.replace(/[\s\p{P}]/gu, '').length;
        return chars * 100;
    } else {
        // English: weight by word length (average ~50ms per character)
        const words = text.split(/\s+/).filter(w => w.trim());
        let totalMs = 0;
        for (const word of words) {
            // Base 100ms + 30ms per character
            totalMs += 100 + (word.replace(/[^\w]/g, '').length * 30);
        }
        return totalMs;
    }
}

/**
 * Calculate per-unit timing from total duration
 * For Chinese: per-character timing
 * For English: per-word timing weighted by word length
 * 
 * @param {string} text - The text
 * @param {number} totalDuration - Total duration in ms at 1x speed
 * @param {number} playbackSpeed - Current playback speed
 * @returns {Array<{unit: string, duration: number, startTime: number}>}
 */
export function calculateUnitTimings(text, totalDuration, playbackSpeed = 1.0) {
    const lang = detectLanguage(text);
    const scaledDuration = totalDuration / playbackSpeed;
    const timings = [];

    if (lang === 'zh') {
        // Chinese: split by character, distribute time evenly (excluding punctuation weight)
        const PUNCT_REGEX = /[，。！？、；：""''「」『』【】〖〗《》〈〉（）\[\]{},.!?;:'"()\-–—…\s]/;
        const chars = text.split('').filter(c => c.trim());
        const speakableChars = chars.filter(c => !PUNCT_REGEX.test(c));
        const timePerSpeakable = scaledDuration / speakableChars.length;

        let currentTime = 0;
        let speakableIndex = 0;

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const isPunct = PUNCT_REGEX.test(char);

            // Punctuation gets minimal time, speakable chars get full time
            const charDuration = isPunct ? 20 : timePerSpeakable;

            timings.push({
                unit: char,
                index: i,
                duration: charDuration,
                startTime: currentTime
            });

            currentTime += charDuration;
        }
    } else {
        // English: weight by word length
        const words = text.split(/\s+/).filter(w => w.trim());
        const totalChars = words.reduce((sum, w) => sum + w.replace(/[^\w]/g, '').length, 0);

        let currentTime = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordChars = word.replace(/[^\w]/g, '').length;
            // Weight duration by word length
            const wordDuration = (wordChars / totalChars) * scaledDuration;

            timings.push({
                unit: word,
                index: i,
                duration: wordDuration,
                startTime: currentTime
            });

            currentTime += wordDuration;
        }
    }

    return timings;
}

/**
 * Calibrate a full passage (all sentences)
 * 
 * @param {string} text - Full passage text
 * @param {string} voiceUri - Voice URI
 * @returns {Promise<{totalDuration: number, timings: Array}>}
 */
export async function calibratePassage(text, voiceUri) {
    const totalDuration = await measureDuration(text, voiceUri);
    const timings = calculateUnitTimings(text, totalDuration, 1.0);

    return {
        totalDuration,
        timings,
        calibrated: true
    };
}

/**
 * Clear calibration cache (e.g., when voice changes)
 */
export function clearCalibrationCache() {
    calibrationCache.clear();
    console.log('Calibration cache cleared');
}
