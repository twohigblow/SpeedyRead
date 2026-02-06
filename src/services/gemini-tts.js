/**
 * Gemini Text-to-Speech Service
 * 
 * Uses Google Gemini API for TTS (returns raw LINEAR16 PCM at 24kHz).
 * Implements iOS-compatible audio playback with three key techniques:
 * 
 * 1. ctx.resume() Synchronous Handshake - Resume AudioContext immediately in click handler
 * 2. Manual PCM to Float32 Decoding - Convert raw bytes to Float32Array
 * 3. Linear Interpolation Resampling - Resample from 24kHz to device's native rate
 */

// Gemini API endpoint for TTS
const GEMINI_TTS_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Singleton AudioContext (iOS requires user gesture to unlock)
let audioContext = null;

/**
 * Get or create AudioContext
 * MUST be called within a user gesture handler on iOS
 */
export function getContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * CRITICAL iOS FIX #1: Resume AudioContext Synchronously
 * This MUST be called at the very top of a click/tap handler
 * before any async operations (fetch, database, etc.)
 */
export async function unlockAudioForIOS() {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
        console.log('AudioContext unlocked for iOS');
    }
    return ctx;
}

/**
 * Synthesize speech using Gemini API
 * Returns raw LINEAR16 PCM data (24kHz, mono, 16-bit)
 * 
 * @param {string} text - Text to synthesize
 * @param {string} apiKey - Gemini API key
 * @param {object} options - { voice, speed }
 * @returns {ArrayBuffer} - Raw PCM audio data
 */
export async function synthesizeGeminiTTS(text, apiKey, options = {}) {
    const { voice = 'Puck', speed = 1.0 } = options;

    const requestBody = {
        contents: [{
            parts: [{
                text: text
            }]
        }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voice // Options: Puck, Charon, Kore, Fenrir, Aoede
                    }
                }
            }
        }
    };

    const url = `${GEMINI_TTS_API_URL}?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        throw new Error(`Gemini TTS API error: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();

    // Extract inline audio data (base64 encoded LINEAR16 PCM)
    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData || !inlineData.data) {
        throw new Error('No audio data in Gemini response');
    }

    // Decode base64 to ArrayBuffer
    const base64Audio = inlineData.data;
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

/**
 * CRITICAL iOS FIX #2: Manual PCM to Float32 Decoding
 * Convert raw 16-bit PCM to Float32Array for Web Audio API
 * 
 * @param {ArrayBuffer} pcmData - Raw 16-bit LINEAR16 PCM data
 * @returns {Float32Array} - Normalized float samples (-1.0 to 1.0)
 */
export function manualDecodeInt16ToFloat32(pcmData) {
    const int16View = new DataView(pcmData);
    const sampleCount = pcmData.byteLength / 2; // 2 bytes per sample
    const sourceFloat32 = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        const int16 = int16View.getInt16(i * 2, true); // true = little-endian

        // Normalize to -1.0 to 1.0 range
        // Split negative/positive for better precision
        sourceFloat32[i] = int16 < 0
            ? int16 / 32768.0   // -32768 to 0 -> -1.0 to 0
            : int16 / 32767.0;  // 0 to 32767 -> 0 to 1.0
    }

    return sourceFloat32;
}

/**
 * CRITICAL iOS FIX #3: Linear Interpolation Resampling
 * Resample audio from Gemini's 24kHz to device's native sample rate
 * 
 * @param {Float32Array} sourceFloat32 - Source audio samples at 24kHz
 * @param {number} sourceSampleRate - Source sample rate (24000)
 * @param {number} targetSampleRate - Target sample rate (e.g., 48000, 44100)
 * @returns {Float32Array} - Resampled audio
 */
export function resampleWithLinearInterpolation(sourceFloat32, sourceSampleRate, targetSampleRate) {
    const ratio = sourceSampleRate / targetSampleRate;
    const targetLength = Math.floor(sourceFloat32.length / ratio);
    const targetFloat32 = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
        // Calculate source sample position
        const sourceIndex = i * ratio;
        const index1 = Math.floor(sourceIndex);
        const index2 = Math.min(index1 + 1, sourceFloat32.length - 1);
        const fraction = sourceIndex - index1;

        // Linear interpolation between two nearest samples
        targetFloat32[i] = sourceFloat32[index1] * (1 - fraction) +
            sourceFloat32[index2] * fraction;
    }

    return targetFloat32;
}

/**
 * Complete audio processing pipeline for iOS compatibility
 * Combines all three iOS fixes
 * 
 * @param {ArrayBuffer} pcmData - Raw 16-bit PCM from Gemini (24kHz)
 * @param {AudioContext} ctx - The already-unlocked AudioContext
 * @param {number} sourceSampleRate - Source sample rate (default 24000)
 * @returns {AudioBuffer} - Ready-to-play AudioBuffer
 */
export function processGeminiAudioForIOS(pcmData, ctx, sourceSampleRate = 24000) {
    // Step 1: Decode INT16 to Float32
    const sourceFloat32 = manualDecodeInt16ToFloat32(pcmData);

    // Step 2: Resample to device's native rate
    const targetSampleRate = ctx.sampleRate; // Device's native rate (typically 44100 or 48000)

    console.log(`Resampling from ${sourceSampleRate}Hz to ${targetSampleRate}Hz`);

    const resampledFloat32 = resampleWithLinearInterpolation(
        sourceFloat32,
        sourceSampleRate,
        targetSampleRate
    );


    // Step 3: Create AudioBuffer and copy data
    const audioBuffer = ctx.createBuffer(
        1,                          // mono
        resampledFloat32.length,    // length in samples
        targetSampleRate            // sample rate
    );

    audioBuffer.copyToChannel(resampledFloat32, 0);

    return audioBuffer;
}

/**
 * Store audio in IndexedDB for offline playback
 * Uses simple key-value storage in 'gemini-tts-cache' store
 * 
 * @param {string} textId - Unique identifier for this text
 * @param {ArrayBuffer} pcmData - Raw PCM data to store
 */
export async function cacheGeminiAudio(textId, pcmData) {
    try {
        const dbName = 'SpeedyReadDB';
        const storeName = 'gemini-tts-cache';

        // Open or create database
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
        });

        // Store data
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            const cacheEntry = {
                pcmData: pcmData,
                metadata: {
                    source: 'gemini',
                    sampleRate: 24000,
                    channels: 1,
                    bitsPerSample: 16,
                    cachedAt: Date.now()
                }
            };

            const request = store.put(cacheEntry, textId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        db.close();
        console.log(`Cached Gemini audio for: ${textId}`);

    } catch (error) {
        console.warn('Failed to cache Gemini audio:', error);
        // Non-critical error, don't throw
    }
}

/**
 * Retrieve cached audio from IndexedDB
 * 
 * @param {string} textId - Unique identifier for this text
 * @returns {ArrayBuffer|null} - Raw PCM data or null if not found
 */
export async function getCachedGeminiAudio(textId) {
    try {
        const dbName = 'SpeedyReadDB';
        const storeName = 'gemini-tts-cache';

        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        const cacheEntry = await new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(textId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        db.close();

        if (!cacheEntry || cacheEntry.metadata?.source !== 'gemini') {
            return null;
        }

        console.log(`Retrieved cached Gemini audio for: ${textId}`);
        return cacheEntry.pcmData;

    } catch (error) {
        console.warn('Failed to retrieve cached audio:', error);
        return null;
    }
}

/**
 * Full TTS flow: Fetch from API or cache, decode, resample, and play
 * This is the MAIN function to use from components
 * 
 * Usage in component:
 * ```
 * const handlePlay = async () => {
 *   // CRITICAL: Unlock audio FIRST, inside click handler
 *   await unlockAudioForIOS();
 *   
 *   // Now safe to do async operations
 *   await playGeminiTTS(text, apiKey, { onStart, onEnd });
 * };
 * ```
 * 
 * @param {string} text - Text to speak
 * @param {string} apiKey - Gemini API key
 * @param {object} options - { voice, speed, onStart, onEnd, textId, sourceSampleRate }
 */
export async function playGeminiTTS(text, apiKey, options = {}) {
    const {
        voice = 'Puck',
        speed = 1.0,
        onStart = null,
        onEnd = null,
        textId = null,
        useCache = true,
        sourceSampleRate = 24000 // Default to Gemini's native rate
    } = options;

    try {
        // Get the unlocked context (should already be resumed from user gesture)
        const ctx = getContext();

        if (ctx.state === 'suspended') {
            console.warn('AudioContext still suspended! Make sure to call unlockAudioForIOS() in click handler');
            await ctx.resume();
        }

        let pcmData;

        // Try cache first if textId provided
        if (useCache && textId) {
            pcmData = await getCachedGeminiAudio(textId);
            if (pcmData) {
                console.log('Using cached Gemini audio');
            }
        }

        // Fetch from API if not cached
        if (!pcmData) {
            console.log('Fetching from Gemini API...');
            pcmData = await synthesizeGeminiTTS(text, apiKey, { voice, speed });

            // Cache for future use
            if (useCache && textId) {
                await cacheGeminiAudio(textId, pcmData);
            }
        }

        // Process audio with iOS-compatible pipeline
        const audioBuffer = processGeminiAudioForIOS(pcmData, ctx, sourceSampleRate);

        onStart?.();

        // Create and play audio source
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Apply speed (playback rate)
        source.playbackRate.value = speed;

        source.connect(ctx.destination);

        source.onended = () => {
            onEnd?.();
        };

        source.start(0);

        // Return control object
        return {
            stop: () => {
                try {
                    source.stop();
                } catch (e) {
                    // Already stopped
                }
            },
            source,
            context: ctx
        };

    } catch (error) {
        console.error('Gemini TTS error:', error);
        onEnd?.();
        throw error;
    }
}


/**
 * Available Gemini voices
 */
export const GEMINI_VOICES = [
    { id: 'Puck', name: 'Puck', description: 'Warm and friendly' },
    { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
    { id: 'Kore', name: 'Kore', description: 'Clear and professional' },
    { id: 'Fenrir', name: 'Fenrir', description: 'Strong and confident' },
    { id: 'Aoede', name: 'Aoede', description: 'Melodic and expressive' }
];

/**
 * Test Gemini API key validity
 */
export async function testGeminiTTSApiKey(apiKey) {
    try {
        // Try to synthesize a short test phrase
        await synthesizeGeminiTTS('Hello', apiKey);
        return true;
    } catch (error) {
        console.error('Gemini TTS API key test failed:', error);
        return false;
    }
}

/**
 * Cleanup AudioContext
 */
export function cleanup() {
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }
}
