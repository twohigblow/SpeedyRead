/**
 * TTS Playback Service with Calibration Support
 * 
 * Auto-detects language and selects appropriate voice.
 * Uses calibrated timing when available for precise karaoke.
 * 
 * Browser cap: speechSynthesis max rate is 3x.
 */

import { stopPlayback } from './audio-processor.js';
import { getKaraokeTiming } from './calibration.js';
import { detectLanguage, getBaseTimePerChar } from './language-detect.js';

// Track current playback state
let currentKaraokeTimer = null;
let currentScheduledTimeouts = [];
let isPlaying = false;

// Browser TTS max speed
const MAX_TTS_SPEED = 3.0;

/**
 * Get default voice for a language
 */
function getDefaultVoice(lang) {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    if (lang === 'en') {
        // Prefer US English, then any English
        const usVoice = voices.find(v => v.lang === 'en-US');
        if (usVoice) return usVoice;
        return voices.find(v => v.lang.startsWith('en')) || null;
    } else {
        // Chinese: prefer Cantonese, then Mandarin
        const cantonese = voices.find(v => v.lang === 'zh-HK' || v.lang === 'yue-HK');
        if (cantonese) return cantonese;
        const mandarin = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh-TW' || v.lang === 'cmn-CN');
        if (mandarin) return mandarin;
        return voices.find(v => v.lang.startsWith('zh')) || null;
    }
}

/**
 * Clear all scheduled karaoke timeouts
 */
function clearKaraokeSchedule() {
    if (currentKaraokeTimer) {
        clearInterval(currentKaraokeTimer);
        currentKaraokeTimer = null;
    }
    currentScheduledTimeouts.forEach(t => clearTimeout(t));
    currentScheduledTimeouts = [];
}

/**
 * Play TTS with auto language detection and calibrated timing
 * 
 * @param {string} text - Text to speak
 * @param {number} speed - Target speed (capped at 3x for TTS)
 * @param {object} options - Options including timing data
 */
export async function playTTSAtSpeed(text, speed, options = {}) {
    const { voiceUri, englishVoiceUri, timing, onBoundary, onEnd, onStart } = options;
    const synth = window.speechSynthesis;

    // Detect language
    const detectedLang = detectLanguage(text);
    const isChinese = detectedLang === 'zh';

    // Select voice based on detected language
    let selectedVoiceUri = isChinese ? voiceUri : englishVoiceUri;

    console.log(`Language detected: ${detectedLang}, using ${isChinese ? 'Chinese' : 'English'} voice`);

    // Cap speed at browser max
    const effectiveSpeed = Math.min(speed, MAX_TTS_SPEED);

    if (speed > MAX_TTS_SPEED) {
        console.warn(`TTS capped at ${MAX_TTS_SPEED}x (requested ${speed}x)`);
    }

    // Parse units for karaoke
    const units = isChinese
        ? text.split('').filter(c => c.trim()).length
        : text.split(/\s+/).filter(w => w.trim()).length;

    // Clear previous schedule
    clearKaraokeSchedule();

    return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice - use selected voice URI or fall back to default
        const voices = synth.getVoices();
        if (selectedVoiceUri) {
            const voice = voices.find(v => v.voiceURI === selectedVoiceUri);
            if (voice) {
                utterance.voice = voice;
            } else {
                const defaultVoice = getDefaultVoice(detectedLang);
                if (defaultVoice) utterance.voice = defaultVoice;
            }
        } else {
            const defaultVoice = getDefaultVoice(detectedLang);
            if (defaultVoice) utterance.voice = defaultVoice;
        }

        utterance.rate = effectiveSpeed;
        isPlaying = true;

        utterance.onstart = () => {
            onStart?.();

            // Use calibrated timing if available
            if (timing && timing.chars && timing.chars.length > 0) {
                const scaledTiming = getKaraokeTiming(timing, effectiveSpeed);

                console.log(`Using calibrated timing at ${effectiveSpeed}x`);

                // Schedule each character highlight based on calibrated timing
                scaledTiming.forEach((charTiming, i) => {
                    const timeout = setTimeout(() => {
                        if (isPlaying) {
                            onBoundary?.({ charIndex: i, charLength: 1 });
                        }
                    }, charTiming.startTime);
                    currentScheduledTimeouts.push(timeout);
                });
            } else {
                // Fall back to timer-based estimation
                if (isChinese) {
                    // Chinese: character-based timing, exclude punctuation
                    const PUNCT_REGEX = /[，。！？、；：""''「」『』【】〖〗《》〈〉（）\[\]{},.!?;:'"()\-–—…\s]/;
                    const allChars = text.split('').filter(c => c.trim());
                    const speakableCount = allChars.filter(c => !PUNCT_REGEX.test(c)).length;

                    // Chinese: ~5-6 chars per second at 1x
                    const baseTimePerChar = 0.18; // seconds
                    const totalTime = (baseTimePerChar * speakableCount) / effectiveSpeed * 1000;
                    const intervalTime = totalTime / units;

                    console.log(`Chinese: ${speakableCount} speakable chars, ${Math.round(intervalTime)}ms/char at ${effectiveSpeed}x`);

                    // Fire first immediately
                    onBoundary?.({ charIndex: 0, charLength: 1 });
                    let karaokeIndex = 1;

                    currentKaraokeTimer = setInterval(() => {
                        if (karaokeIndex < units && isPlaying) {
                            onBoundary?.({ charIndex: karaokeIndex, charLength: 1 });
                            karaokeIndex++;
                        } else {
                            clearInterval(currentKaraokeTimer);
                            currentKaraokeTimer = null;
                        }
                    }, intervalTime);
                } else {
                    // English: word-based timing
                    const words = text.split(/\s+/).filter(w => w.trim());

                    // English: ~2.5 words per second at 1x speed (150 WPM)
                    const baseTimePerWord = 0.4; // seconds per word
                    const totalTime = (baseTimePerWord * words.length) / effectiveSpeed * 1000;
                    const intervalTime = totalTime / words.length;

                    console.log(`English: ${words.length} words, ${Math.round(intervalTime)}ms/word at ${effectiveSpeed}x`);

                    // Fire first immediately
                    onBoundary?.({ charIndex: 0, charLength: 1 });
                    let wordIndex = 1;

                    currentKaraokeTimer = setInterval(() => {
                        if (wordIndex < words.length && isPlaying) {
                            onBoundary?.({ charIndex: wordIndex, charLength: 1 });
                            wordIndex++;
                        } else {
                            clearInterval(currentKaraokeTimer);
                            currentKaraokeTimer = null;
                        }
                    }, intervalTime);
                }
            }
        };

        utterance.onend = () => {
            const finalIndex = units - 1;
            isPlaying = false;
            clearKaraokeSchedule();

            // Ensure all chars marked
            for (let i = 0; i < units; i++) {
                onBoundary?.({ charIndex: i, charLength: 1 });
            }

            onEnd?.();
            resolve();
        };

        utterance.onerror = (event) => {
            isPlaying = false;
            clearKaraokeSchedule();

            if (event.error === 'interrupted' || event.error === 'canceled') {
                onEnd?.();
                resolve();
            } else {
                reject(new Error(`TTS error: ${event.error}`));
            }
        };

        // Chrome voices workaround
        const allVoices = synth.getVoices();
        if (allVoices.length === 0) {
            speechSynthesis.onvoiceschanged = () => synth.speak(utterance);
        } else {
            synth.speak(utterance);
        }
    });
}

/**
 * Stop TTS playback
 */
export function stopTTS() {
    window.speechSynthesis?.cancel();
    stopPlayback();
    clearKaraokeSchedule();
    isPlaying = false;
}

/**
 * Get max supported TTS speed
 */
export function getMaxTTSSpeed() {
    return MAX_TTS_SPEED;
}
