/**
 * Google Cloud Text-to-Speech Service
 * 
 * Provides TTS with word-level timestamps for accurate karaoke synchronization.
 * Falls back to Web Speech API if no API key is configured.
 */

import { detectLanguage } from './language-detect.js';

// Google Cloud TTS API endpoint
const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Voice types in priority order (best quality first)
export const VOICE_TYPES = ['Neural2', 'WaveNet', 'Standard'];

// Voice mapping for different languages and types
const VOICE_CONFIG = {
    zh: {
        languageCode: 'yue-HK',
        voices: {
            'Neural2': 'yue-HK-Standard-A',  // No Neural2 for Cantonese, fall back
            'WaveNet': 'yue-HK-Standard-A',  // No WaveNet for Cantonese, fall back
            'Standard': 'yue-HK-Standard-A'
        },
        ssmlGender: 'FEMALE'
    },
    'zh-mandarin': {
        languageCode: 'cmn-CN',
        voices: {
            'Neural2': 'cmn-CN-Wavenet-A',   // No Neural2, use WaveNet
            'WaveNet': 'cmn-CN-Wavenet-A',
            'Standard': 'cmn-CN-Standard-A'
        },
        ssmlGender: 'FEMALE'
    },
    en: {
        languageCode: 'en-US',
        voices: {
            'Neural2': 'en-US-Neural2-F',
            'WaveNet': 'en-US-Wavenet-F',
            'Standard': 'en-US-Standard-A'
        },
        ssmlGender: 'FEMALE'
    }
};

// Track which voice types have hit quota limits (resets on page reload)
const quotaExhaustedTypes = new Set();

/**
 * Get the best available voice type, considering quota limits
 */
export function getAvailableVoiceType(preferredType = 'Neural2') {
    const typeIndex = VOICE_TYPES.indexOf(preferredType);
    const orderedTypes = [
        ...VOICE_TYPES.slice(typeIndex),
        ...VOICE_TYPES.slice(0, typeIndex)
    ];

    for (const type of orderedTypes) {
        if (!quotaExhaustedTypes.has(type)) {
            return type;
        }
    }

    // All exhausted, try the preferred one anyway (might work next month)
    return preferredType;
}

/**
 * Mark a voice type as having exhausted its quota
 */
export function markQuotaExhausted(voiceType) {
    quotaExhaustedTypes.add(voiceType);
    console.warn(`Google TTS: ${voiceType} quota exhausted, will try other types`);
}

/**
 * Get voice name for a language and type
 */
function getVoiceName(detectedLang, voiceType) {
    const config = VOICE_CONFIG[detectedLang] || VOICE_CONFIG.en;
    return config.voices[voiceType] || config.voices['Standard'];
}

/**
 * Get available Google Cloud TTS voices for a language
 */
export async function getGoogleVoices(apiKey, languageCode = null) {
    try {
        const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        let voices = data.voices || [];

        // Filter by language if specified
        if (languageCode) {
            voices = voices.filter(v =>
                v.languageCodes.some(code => code.startsWith(languageCode))
            );
        }

        return voices;
    } catch (error) {
        console.error('Failed to fetch Google voices:', error);
        return [];
    }
}

/**
 * Build SSML with word marks for timestamp retrieval
 * Each word/character gets a <mark> tag so we get timing data back
 */
function buildSSMLWithMarks(text, isChinese) {
    const units = isChinese
        ? text.split('').filter(c => c.trim())  // Character-based for Chinese
        : text.split(/\s+/).filter(w => w.trim());  // Word-based for English

    let ssml = '<speak>';

    units.forEach((unit, index) => {
        ssml += `<mark name="w${index}"/>${unit}`;
        if (!isChinese) ssml += ' ';  // Add space between English words
    });

    ssml += '</speak>';
    return { ssml, unitCount: units.length };
}

/**
 * Synthesize speech with Google Cloud TTS and get word timestamps
 * 
 * @param {string} text - Text to synthesize
 * @param {string} apiKey - Google Cloud API key
 * @param {object} options - Additional options including voiceType, chineseVoice, englishVoice
 * @returns {object} - { audioContent: base64, timestamps: [{start, end, unit}], voiceTypeUsed }
 */
export async function synthesizeWithTimestamps(text, apiKey, options = {}) {
    const detectedLang = detectLanguage(text);
    const isChinese = detectedLang === 'zh';

    // Build SSML with marks
    const { ssml, unitCount } = buildSSMLWithMarks(text, isChinese);

    // Get the best available voice type
    const preferredType = options.voiceType || 'Neural2';
    const voiceType = getAvailableVoiceType(preferredType);

    // Get voice config for this language
    const langConfig = VOICE_CONFIG[detectedLang] || VOICE_CONFIG.en;

    // Use user-selected voice if provided, otherwise use default for the voice type
    let voiceName;
    if (isChinese && options.chineseVoice) {
        voiceName = options.chineseVoice;
    } else if (!isChinese && options.englishVoice) {
        voiceName = options.englishVoice;
    } else {
        voiceName = getVoiceName(detectedLang, voiceType);
    }

    // Extract language code from voice name (e.g., "en-US-Neural2-F" -> "en-US")
    const voiceLanguageCode = voiceName.split('-').slice(0, 2).join('-');

    const requestBody = {
        input: { ssml },
        voice: {
            languageCode: voiceLanguageCode || langConfig.languageCode,
            name: voiceName,
            ssmlGender: langConfig.ssmlGender
        },
        audioConfig: {
            // Use LINEAR16 (PCM) for better iOS compatibility
            // MP3 can have issues with certain sample rates on iOS
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 24000,  // Explicitly set sample rate (iOS-friendly)
            speakingRate: options.speed || 1.0,
            pitch: 0
        },
        // Request timing info
        enableTimePointing: ['SSML_MARK']
    };

    console.log(`Google TTS: Synthesizing ${unitCount} ${isChinese ? 'characters' : 'words'} with ${voiceName}`);

    const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';

        // Check if it's a quota error
        if (response.status === 429 || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            markQuotaExhausted(voiceType);

            // Try next available type
            const nextType = getAvailableVoiceType(preferredType);
            if (nextType !== voiceType) {
                console.log(`Google TTS: Retrying with ${nextType}...`);
                return synthesizeWithTimestamps(text, apiKey, { ...options, voiceType: nextType });
            }
        }

        throw new Error(`Google TTS API error: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();

    // Debug: Log raw timepoints from Google
    console.log('Google TTS raw timepoints:', JSON.stringify(data.timepoints?.slice(0, 5)));

    // Parse timepoints from response
    const timestamps = parseTimepoints(data.timepoints || [], unitCount, isChinese);

    console.log(`Google TTS: Received ${timestamps.length} timestamps, first few:`,
        timestamps.slice(0, 3).map(t => `${t.index}: ${t.startTime}ms`));

    return {
        audioContent: data.audioContent,  // base64 encoded audio
        timestamps,
        unitCount,
        isChinese,
        voiceTypeUsed: voiceType
    };
}

/**
 * Parse timepoints from Google TTS response into our format
 */
function parseTimepoints(timepoints, unitCount, isChinese) {
    const timestamps = [];

    for (let i = 0; i < unitCount; i++) {
        const mark = timepoints.find(tp => tp.markName === `w${i}`);
        const nextMark = timepoints.find(tp => tp.markName === `w${i + 1}`);

        if (mark) {
            // Google returns time in seconds as string like "1.234s"
            const startTime = parseGoogleTime(mark.timeSeconds);
            const endTime = nextMark ? parseGoogleTime(nextMark.timeSeconds) : startTime + 0.3;

            timestamps.push({
                index: i,
                startTime: startTime * 1000,  // Convert to ms
                endTime: endTime * 1000,
                duration: (endTime - startTime) * 1000
            });
        } else {
            // Fallback: estimate based on position
            const avgDuration = isChinese ? 0.25 : 0.4;  // seconds per unit
            timestamps.push({
                index: i,
                startTime: i * avgDuration * 1000,
                endTime: (i + 1) * avgDuration * 1000,
                duration: avgDuration * 1000
            });
        }
    }

    return timestamps;
}

/**
 * Parse Google's time format (can be number or string like "1.5s")
 */
function parseGoogleTime(timeValue) {
    if (typeof timeValue === 'number') {
        return timeValue;
    }
    if (typeof timeValue === 'string') {
        return parseFloat(timeValue.replace('s', ''));
    }
    return 0;
}

/**
 * Create WAV header for raw LINEAR16 PCM data
 * Google Cloud TTS returns raw PCM without WAV headers
 */
function createWavHeader(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
    const dataLength = pcmData.length;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // ByteRate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return new Uint8Array(header);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Convert base64 LINEAR16 audio to WAV Blob
 */
function base64ToWavBlob(base64, sampleRate = 24000) {
    // Decode base64 to raw PCM data
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const pcmData = new Uint8Array(byteNumbers);

    // Create WAV header
    const wavHeader = createWavHeader(pcmData, sampleRate);

    // Combine header and PCM data
    const wavFile = new Uint8Array(wavHeader.length + pcmData.length);
    wavFile.set(wavHeader, 0);
    wavFile.set(pcmData, wavHeader.length);

    return new Blob([wavFile], { type: 'audio/wav' });
}

/**
 * Play audio from base64 content
 * Returns a promise that resolves when playback completes
 */
export function playBase64Audio(base64Audio, onTimeUpdate) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);

        audio.ontimeupdate = () => {
            onTimeUpdate?.(audio.currentTime * 1000);  // ms
        };

        audio.onended = () => resolve();
        audio.onerror = (e) => reject(new Error(`Audio playback error: ${e.message}`));

        audio.play().catch(reject);

        // Return audio element for external control
        return audio;
    });
}

/**
 * Full TTS playback with Google Cloud and karaoke callbacks
 * 
 * @param {string} text - Text to speak
 * @param {string} apiKey - Google Cloud API key
 * @param {number} speed - Playback speed (1.0 = normal)
 * @param {object} options - { voiceType, chineseVoice, englishVoice, onStart, onBoundary, onEnd }
 */
export async function playGoogleTTS(text, apiKey, speed = 1.0, options = {}) {
    const { voiceType, chineseVoice, englishVoice, onStart, onBoundary, onEnd } = options;

    try {
        // Synthesize with timestamps
        const result = await synthesizeWithTimestamps(text, apiKey, {
            speed,
            voiceType,
            chineseVoice,
            englishVoice
        });
        const { audioContent, timestamps, unitCount, voiceTypeUsed } = result;

        console.log(`Google TTS: Playing audio`);

        // Convert LINEAR16 PCM to WAV with proper headers
        const audioBlob = base64ToWavBlob(audioContent, 24000);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        let currentIndex = 0;
        let isPlaying = true;
        let animationFrameId = null;

        // Wait for audio to load before playing (critical for iOS)
        // Add timeout to prevent hanging
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn('Audio loading timeout, attempting to play anyway');
                resolve();
            }, 3000);

            audio.onloadeddata = () => {
                clearTimeout(timeout);
                console.log('Audio loaded successfully');
                resolve();
            };

            audio.onerror = (e) => {
                clearTimeout(timeout);
                console.error('Audio loading error:', e);
                reject(new Error('Failed to load audio'));
            };

            // For iOS, also listen to canplay event as fallback
            audio.oncanplay = () => {
                clearTimeout(timeout);
                console.log('Audio can play');
                resolve();
            };
        });

        onStart?.();

        // Use requestAnimationFrame for more precise karaoke timing
        // ontimeupdate only fires ~4 times/second, which is too slow for karaoke
        const updateKaraoke = () => {
            if (!isPlaying || audio.paused || audio.ended) {
                return;
            }

            const currentTimeMs = audio.currentTime * 1000;

            // Find which unit we should be highlighting
            while (currentIndex < timestamps.length) {
                const ts = timestamps[currentIndex];
                if (currentTimeMs >= ts.startTime) {
                    onBoundary?.({ charIndex: currentIndex, charLength: 1 });
                    currentIndex++;
                } else {
                    break;
                }
            }

            animationFrameId = requestAnimationFrame(updateKaraoke);
        };

        audio.onplay = () => {
            animationFrameId = requestAnimationFrame(updateKaraoke);
        };

        audio.onpause = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };

        audio.onended = () => {
            isPlaying = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            // Ensure all units are highlighted
            for (let i = currentIndex; i < unitCount; i++) {
                onBoundary?.({ charIndex: i, charLength: 1 });
            }
            // Clean up blob URL to prevent memory leaks
            URL.revokeObjectURL(audioUrl);
            onEnd?.();
        };

        audio.onerror = (e) => {
            isPlaying = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            // Clean up blob URL
            URL.revokeObjectURL(audioUrl);
            console.error('Audio playback error:', e);
            onEnd?.();
        };

        // Play with error handling for iOS
        try {
            await audio.play();
        } catch (playError) {
            console.error('Failed to start audio playback:', playError);
            URL.revokeObjectURL(audioUrl);
            throw new Error(`Audio playback failed: ${playError.message}`);
        }

        // Return control object
        return {
            stop: () => {
                isPlaying = false;
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                audio.pause();
                audio.currentTime = 0;
                URL.revokeObjectURL(audioUrl);
            },
            audio
        };

    } catch (error) {
        console.error('Google TTS error:', error);
        throw error;
    }
}

/**
 * Test API key validity
 */
export async function testApiKey(apiKey) {
    try {
        const voices = await getGoogleVoices(apiKey, 'en');
        return voices.length > 0;
    } catch {
        return false;
    }
}
