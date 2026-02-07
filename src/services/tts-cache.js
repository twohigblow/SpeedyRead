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
import { measureDuration, calculateUnitTimings } from './tts-calibrator.js';
import { playGoogleTTS } from './google-tts.js';

// Track current playback state
let currentKaraokeTimer = null;
let currentScheduledTimeouts = [];
let currentGoogleTTSController = null;
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
    const {
        voiceUri, englishVoiceUri,
        googleTtsApiKey, googleVoiceType, googleChineseVoice, googleEnglishVoice,
        timing, onBoundary, onEnd, onStart
    } = options;
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

    // If Google TTS API key is available, use Google Cloud TTS for accurate timing
    if (googleTtsApiKey) {
        const selectedGoogleVoice = isChinese ? googleChineseVoice : googleEnglishVoice;
        console.log(`Using Google Cloud TTS: ${googleVoiceType || 'Neural2'}, voice: ${selectedGoogleVoice || 'default'}`);
        try {
            const controller = await playGoogleTTS(text, googleTtsApiKey, effectiveSpeed, {
                voiceType: googleVoiceType || 'Neural2',
                chineseVoice: googleChineseVoice,
                englishVoice: googleEnglishVoice,
                onStart,
                onBoundary,
                onEnd: () => {
                    // CRITICAL FIX: Signal completion to the polling loop
                    isPlaying = false;
                    onEnd?.();
                }
            });

            // Store reference for stop functionality
            currentGoogleTTSController = controller;
            isPlaying = true;

            return new Promise((resolve) => {
                // The playGoogleTTS handles everything, we just wait for it
                const checkInterval = setInterval(() => {
                    if (!isPlaying) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        } catch (error) {
            console.warn('Google TTS failed, falling back to Web Speech API:', error.message);
            // Fall through to Web Speech API
        }
    }

    // Fall back to Web Speech API
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
                // Use dynamic calibration - measureDuration was already called above
                // or fall back to estimated timing based on text analysis

                // Check if we have pre-cached calibration timing from options
                if (options.dynamicTiming && options.dynamicTiming.length > 0) {
                    console.log(`Using pre-calibrated dynamic timing at ${effectiveSpeed}x`);

                    // Schedule each unit based on calibrated timing
                    options.dynamicTiming.forEach((unitTiming, i) => {
                        const scaledStartTime = unitTiming.startTime / effectiveSpeed;
                        const timeout = setTimeout(() => {
                            if (isPlaying) {
                                onBoundary?.({ charIndex: i, charLength: 1 });
                            }
                        }, scaledStartTime);
                        currentScheduledTimeouts.push(timeout);
                    });
                } else {
                    // Fallback: estimate using text analysis with word-length weighting
                    if (isChinese) {
                        // Chinese: character-based timing, exclude punctuation
                        const PUNCT_REGEX = /[，。！？、；：""''「」『』【】〖〗《》〈〉（）\[\]{},.!?;:'"()\-–—…\s]/;
                        const allChars = text.split('').filter(c => c.trim());
                        const speakableCount = allChars.filter(c => !PUNCT_REGEX.test(c)).length;

                        // Chinese TTS speaks ~3-4 chars per second at 1x
                        const baseTimePerChar = 0.30; // 300ms per character
                        const totalTime = (baseTimePerChar * speakableCount) / effectiveSpeed * 1000;
                        const intervalTime = totalTime / units;

                        console.log(`Chinese (estimated): ${speakableCount} speakable chars, ${Math.round(intervalTime)}ms/char at ${effectiveSpeed}x`);

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
                        // English: word-length weighted timing
                        const words = text.split(/\s+/).filter(w => w.trim());
                        const totalChars = words.reduce((sum, w) => sum + w.replace(/[^\w]/g, '').length, 0);

                        // Base: ~400ms average per word at 1x (TTS is slower than reading)
                        const baseTotalTime = 400 * words.length;
                        const scaledTotalTime = baseTotalTime / effectiveSpeed;

                        console.log(`English (word-weighted): ${words.length} words, ~${Math.round(scaledTotalTime / words.length)}ms avg at ${effectiveSpeed}x`);

                        // Fire first immediately
                        onBoundary?.({ charIndex: 0, charLength: 1 });

                        // Schedule each word with weighted timing
                        let cumulativeTime = 0;
                        for (let i = 1; i < words.length; i++) {
                            // Weight by previous word's length
                            const prevWordChars = words[i - 1].replace(/[^\w]/g, '').length;
                            const wordDuration = (prevWordChars / totalChars) * scaledTotalTime;
                            cumulativeTime += wordDuration;

                            const capturedIndex = i;
                            const capturedTime = cumulativeTime;

                            const timeout = setTimeout(() => {
                                if (isPlaying) {
                                    onBoundary?.({ charIndex: capturedIndex, charLength: 1 });
                                }
                            }, capturedTime);
                            currentScheduledTimeouts.push(timeout);
                        }
                    }
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

    // Stop Google Cloud TTS if active
    if (currentGoogleTTSController) {
        currentGoogleTTSController.stop?.();
        currentGoogleTTSController = null;
    }

    isPlaying = false;
}

/**
 * Get max supported TTS speed
 */
export function getMaxTTSSpeed() {
    return MAX_TTS_SPEED;
}
