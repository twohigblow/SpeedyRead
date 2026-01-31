/**
 * TTS Timing Calibration Service
 * 
 * Measures precise character timing during TTS playback at 1x speed.
 * Handles punctuation correctly - punctuation gets 0ms timing.
 */

import { updateText } from './db.js';

// Chinese punctuation and common punctuation marks
const PUNCTUATION_REGEX = /[，。！？、；：""''「」『』【】〖〗《》〈〉（）\[\]{},.!?;:'"()\-–—…\s]/;

/**
 * Check if a character is punctuation
 */
function isPunctuation(char) {
    return PUNCTUATION_REGEX.test(char);
}

/**
 * Calibrate timing for a text by playing TTS and measuring each character
 * Punctuation is handled specially - it gets 0ms timing (or pause timing)
 * 
 * @param {string} text - The text to calibrate
 * @param {string} voiceUri - Voice to use for calibration
 * @param {object} options - Options
 * @returns {Promise<object>} Timing data
 */
export async function calibrateTiming(text, voiceUri = null, options = {}) {
    const { onProgress, onStart, onEnd } = options;
    const synth = window.speechSynthesis;

    // Parse ALL characters (including punctuation) for display
    const allChars = text.split('').filter(c => c.trim());

    // Count speakable characters (excluding punctuation)
    const speakableChars = allChars.filter(c => !isPunctuation(c));
    const numSpeakable = speakableChars.length;

    console.log(`Text has ${allChars.length} chars, ${numSpeakable} speakable`);

    const timingData = {
        voiceUri: voiceUri || 'default',
        calibratedAt: Date.now(),
        totalDuration: 0,
        chars: []
    };

    return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice
        if (voiceUri) {
            const voices = synth.getVoices();
            const voice = voices.find(v => v.voiceURI === voiceUri);
            if (voice) utterance.voice = voice;
        } else {
            const voices = synth.getVoices();
            const chineseVoice = voices.find(v =>
                v.lang === 'zh-HK' || v.lang === 'yue-HK' ||
                v.lang === 'zh-CN' || v.lang === 'zh-TW'
            );
            if (chineseVoice) utterance.voice = chineseVoice;
        }

        // Calibrate at 1x speed
        utterance.rate = 1.0;

        let startTime = 0;

        utterance.onstart = () => {
            startTime = Date.now();
            onStart?.();
            console.log(`Calibration started: ${numSpeakable} speakable chars`);
        };

        utterance.onend = () => {
            const totalDuration = Date.now() - startTime;
            timingData.totalDuration = totalDuration;

            // Calculate duration per SPEAKABLE character only
            const durationPerSpeakable = numSpeakable > 0 ? totalDuration / numSpeakable : 0;

            console.log(`Calibration: ${totalDuration}ms / ${numSpeakable} speakable = ${Math.round(durationPerSpeakable)}ms/char`);

            // Build timing for ALL chars, but only speakable chars get duration
            let currentTime = 0;
            timingData.chars = allChars.map((char) => {
                if (isPunctuation(char)) {
                    // Punctuation: instant (0ms duration)
                    return {
                        char,
                        start: Math.round(currentTime),
                        end: Math.round(currentTime),
                        isPunctuation: true
                    };
                } else {
                    // Speakable character: gets full duration
                    const start = currentTime;
                    currentTime += durationPerSpeakable;
                    return {
                        char,
                        start: Math.round(start),
                        end: Math.round(currentTime),
                        isPunctuation: false
                    };
                }
            });

            onProgress?.(1);
            onEnd?.();
            resolve(timingData);
        };

        utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') {
                resolve(null);
            } else {
                reject(new Error(`Calibration failed: ${event.error}`));
            }
        };

        const voices = synth.getVoices();
        if (voices.length === 0) {
            speechSynthesis.onvoiceschanged = () => synth.speak(utterance);
        } else {
            synth.speak(utterance);
        }
    });
}

/**
 * Save calibration timing to a text record
 */
export async function saveTimingToText(textId, timing) {
    await updateText(textId, { timing });
    console.log(`Saved timing for text ${textId}`);
}

/**
 * Scale timing to a different playback speed
 */
export function getScaledTiming(timing, speed) {
    if (!timing || !timing.chars) return null;

    return {
        ...timing,
        totalDuration: Math.round(timing.totalDuration / speed),
        chars: timing.chars.map(c => ({
            ...c,
            start: Math.round(c.start / speed),
            end: Math.round(c.end / speed)
        }))
    };
}

/**
 * Check if text needs calibration
 */
export function needsCalibration(textRecord, currentVoiceUri = null) {
    if (!textRecord.timing) return true;
    if (currentVoiceUri && textRecord.timing.voiceUri !== currentVoiceUri) return true;
    return false;
}

/**
 * Get character timing for precise karaoke playback
 * Returns array scaled to the given speed
 */
export function getKaraokeTiming(timing, speed) {
    if (!timing || !timing.chars) return null;

    return timing.chars.map((c, index) => ({
        index,
        char: c.char,
        startTime: Math.round(c.start / speed),
        endTime: Math.round(c.end / speed),
        isPunctuation: c.isPunctuation || false
    }));
}
