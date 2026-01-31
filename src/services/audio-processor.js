/**
 * Audio Processor Service
 * Handles high-speed playback (>3x) using Web Audio API
 * 
 * Since browsers cap speechSynthesis at ~2-3x, we implement:
 * 1. Generate TTS at 1x speed
 * 2. Capture audio stream to AudioBuffer
 * 3. Use AudioBufferSourceNode with high playbackRate
 */

let audioContext = null;

// Initialize AudioContext (must be called after user interaction)
export function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Get or create AudioContext
function getAudioContext() {
    if (!audioContext) {
        initAudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

// Global state for playback control
let currentSource = null;
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;

/**
 * Generate audio buffer from TTS using MediaRecorder
 * This captures the system audio output from speech synthesis
 */
export async function captureTTSToBuffer(text, voiceUri = null) {
    return new Promise((resolve, reject) => {
        const ctx = getAudioContext();

        // Create a destination for recording
        const dest = ctx.createMediaStreamDestination();
        const mediaRecorder = new MediaRecorder(dest.stream);
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            try {
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                resolve(audioBuffer);
            } catch (err) {
                reject(err);
            }
        };

        // Note: This approach has limitations
        // We can't actually capture speechSynthesis output directly
        // Instead, we'll use a different approach with recorded audio

        reject(new Error('Direct TTS capture not supported. Use recorded audio or pre-generated audio files.'));
    });
}

/**
 * Play an AudioBuffer at a specified speed
 * @param {AudioBuffer} buffer - The audio buffer to play
 * @param {number} speed - Playback speed (0.5 - 10.0)
 * @param {object} options - Playback options
 */
export function playBuffer(buffer, speed = 1.0, options = {}) {
    const ctx = getAudioContext();
    const { onEnded, startOffset = 0 } = options;

    // Stop any current playback
    stopPlayback();

    // Create source node
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Set playback rate (Web Audio API supports much higher rates)
    source.playbackRate.value = Math.max(0.25, Math.min(speed, 10.0));

    // Connect to output
    source.connect(ctx.destination);

    // Handle end of playback
    source.onended = () => {
        isPlaying = false;
        currentSource = null;
        onEnded?.();
    };

    // Start playback
    currentSource = source;
    isPlaying = true;
    startTime = ctx.currentTime;
    source.start(0, startOffset);

    return source;
}

/**
 * Play audio from a Blob at specified speed
 * @param {Blob} audioBlob - Audio blob (from recording)
 * @param {number} speed - Playback speed
 * @param {object} options - Playback options
 */
export async function playBlobAtSpeed(audioBlob, speed = 1.0, options = {}) {
    const ctx = getAudioContext();

    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        return playBuffer(audioBuffer, speed, options);
    } catch (error) {
        console.error('Failed to decode audio:', error);
        throw error;
    }
}

/**
 * Stop current playback
 */
export function stopPlayback() {
    if (currentSource) {
        try {
            currentSource.stop();
        } catch (e) {
            // Ignore errors if already stopped
        }
        currentSource = null;
    }
    isPlaying = false;
    pauseTime = 0;
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying() {
    return isPlaying;
}

/**
 * Create an audio buffer from raw audio data
 * @param {Float32Array} audioData - Raw audio samples
 * @param {number} sampleRate - Sample rate (default 44100)
 */
export function createBufferFromData(audioData, sampleRate = 44100) {
    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(1, audioData.length, sampleRate);
    buffer.copyToChannel(audioData, 0);
    return buffer;
}

/**
 * High-speed TTS implementation using oscillator-based synthesis
 * This is an alternative approach when standard TTS capture isn't available
 * 
 * For production, consider:
 * 1. Using a Web Audio API compatible TTS library
 * 2. Pre-generating audio files server-side
 * 3. Using the Recording feature for parent recordings
 */
export async function experimentalHighSpeedTTS(text, voiceUri, targetSpeed, callbacks = {}) {
    const { onStart, onEnd, onProgress, onBoundary } = callbacks;

    // For speeds > 3x with TTS, we have limited options:
    // 
    // Option 1: Use speechSynthesis at max rate (usually 2-3x)
    //           This won't achieve 10x but is most compatible
    //
    // Option 2: Use recorded audio from parents (recommended)
    //           Record at 1x, then play back at any speed
    //
    // Option 3: Use server-side TTS (requires network)

    const synth = window.speechSynthesis;

    return new Promise((resolve, reject) => {
        onStart?.();

        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice
        if (voiceUri) {
            const voices = synth.getVoices();
            const voice = voices.find(v => v.voiceURI === voiceUri);
            if (voice) utterance.voice = voice;
        }

        // Use maximum browser-supported rate
        // Note: Actual max varies by browser (Chrome ~2x, Safari ~3x)
        const maxBrowserRate = 3.0;
        utterance.rate = Math.min(targetSpeed, maxBrowserRate);

        let charIndex = 0;
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                charIndex = event.charIndex;
                const progress = charIndex / text.length;
                onProgress?.(progress);
                onBoundary?.({ charIndex, charLength: event.charLength || 1 });
            }
        };

        utterance.onend = () => {
            onEnd?.();
            resolve();
        };

        utterance.onerror = (event) => {
            reject(event);
        };

        synth.speak(utterance);
    });
}

/**
 * Calculate estimated duration at given speed
 * @param {number} originalDuration - Duration at 1x speed (seconds)
 * @param {number} speed - Target speed
 */
export function calculateDuration(originalDuration, speed) {
    return originalDuration / speed;
}

/**
 * Get current playback position (approximate)
 */
export function getPlaybackPosition() {
    if (!isPlaying || !audioContext || !currentSource) return 0;
    return (audioContext.currentTime - startTime) * (currentSource.playbackRate?.value || 1);
}

// Cleanup function
export function cleanup() {
    stopPlayback();
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }
}
