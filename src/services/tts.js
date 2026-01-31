/**
 * Text-to-Speech Service
 * Handles Web Speech API and voice management
 */

let synth = null;
let voices = [];
let currentUtterance = null;

// Initialize speech synthesis
export function initTTS() {
    if (typeof window === 'undefined') return;
    synth = window.speechSynthesis;

    // Load voices (may need to wait for voiceschanged event)
    const loadVoices = () => {
        voices = synth.getVoices();
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
}

// Get available voices filtered by language
export function getVoices(language = null) {
    if (!synth) initTTS();

    const allVoices = synth?.getVoices() || [];

    if (!language) return allVoices;

    return allVoices.filter(v => v.lang.startsWith(language));
}

// Get Chinese voices (Cantonese and Mandarin)
export function getChineseVoices() {
    const allVoices = getVoices();
    return {
        cantonese: allVoices.filter(v => v.lang === 'zh-HK' || v.lang === 'yue-HK'),
        mandarin: allVoices.filter(v => v.lang === 'zh-CN' || v.lang === 'zh-TW' || v.lang === 'cmn-CN')
    };
}

// Get English voices (US, UK, AU, etc.)
export function getEnglishVoices() {
    const allVoices = getVoices();
    return allVoices.filter(v =>
        v.lang.startsWith('en-') || v.lang === 'en'
    );
}

// Get voice by URI
export function getVoiceByUri(uri) {
    const allVoices = getVoices();
    return allVoices.find(v => v.voiceURI === uri);
}

// Get a default voice for Chinese text
function getDefaultVoice(text) {
    const allVoices = getVoices();

    // Check if text contains Chinese characters
    const isChinese = /[\u4e00-\u9fff]/.test(text);

    if (isChinese) {
        // Try to find Cantonese voice first
        let voice = allVoices.find(v => v.lang === 'zh-HK' || v.lang === 'yue-HK');
        if (voice) return voice;

        // Fall back to Mandarin
        voice = allVoices.find(v => v.lang === 'zh-CN' || v.lang === 'zh-TW' || v.lang === 'cmn-CN');
        if (voice) return voice;
    }

    // Return first available voice as fallback
    return allVoices[0] || null;
}

// Speak text with options
export function speak(text, options = {}) {
    return new Promise((resolve, reject) => {
        if (!synth) initTTS();

        // Cancel any current speech
        stop();

        const {
            voiceUri = null,
            rate = 1.0,
            pitch = 1.0,
            volume = 1.0,
            onBoundary = null, // Callback for word boundaries (karaoke)
            onStart = null,
            onEnd = null,
            onError = null
        } = options;

        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice - use specified voice or find a default
        if (voiceUri) {
            const voice = getVoiceByUri(voiceUri);
            if (voice) utterance.voice = voice;
        } else {
            // Auto-select a default voice based on text content
            const defaultVoice = getDefaultVoice(text);
            if (defaultVoice) utterance.voice = defaultVoice;
        }

        // Clamp rate to browser limits (typically 0.1 - 10)
        utterance.rate = Math.max(0.1, Math.min(rate, 3.0)); // Most browsers cap at ~3x
        utterance.pitch = pitch;
        utterance.volume = volume;

        // Event handlers
        utterance.onstart = () => {
            onStart?.();
        };

        utterance.onend = () => {
            currentUtterance = null;
            onEnd?.();
            resolve();
        };

        utterance.onerror = (event) => {
            currentUtterance = null;
            onError?.(event);
            reject(event);
        };

        // Word boundary events for karaoke highlighting
        utterance.onboundary = (event) => {
            if (event.name === 'word' && onBoundary) {
                onBoundary({
                    charIndex: event.charIndex,
                    charLength: event.charLength || 1,
                    elapsedTime: event.elapsedTime
                });
            }
        };

        currentUtterance = utterance;
        synth.speak(utterance);
    });
}

// Stop current speech
export function stop() {
    if (synth) {
        synth.cancel();
        currentUtterance = null;
    }
}

// Pause speech
export function pause() {
    if (synth) synth.pause();
}

// Resume speech
export function resume() {
    if (synth) synth.resume();
}

// Check if speaking
export function isSpeaking() {
    return synth?.speaking || false;
}

// Check if paused
export function isPaused() {
    return synth?.paused || false;
}

// Preview a voice with sample text
export function previewVoice(voiceUri, language = 'zh-HK') {
    const samples = {
        'zh-HK': '你好，歡迎使用高速聽力訓練。',
        'zh-CN': '你好，欢迎使用高速听力训练。',
        'en': 'Hello, welcome to SpeedyRead.'
    };

    const text = samples[language] || samples['zh-HK'];
    return speak(text, { voiceUri, rate: 1.0 });
}

// Generate TTS audio buffer for high-speed processing
// This captures the speech to an AudioBuffer for Web Audio API manipulation
export async function generateAudioBuffer(text, options = {}) {
    // This is a fallback implementation
    // In practice, we'll use the audio-processor service for >3x speeds
    return new Promise((resolve, reject) => {
        try {
            // For standard speeds, just use regular TTS
            const rate = options.rate || 1.0;
            if (rate <= 3.0) {
                speak(text, options).then(resolve).catch(reject);
            } else {
                // For high speeds, we need to use Web Audio API
                // This will be handled by audio-processor service
                reject(new Error('Use audio-processor for speeds > 3x'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize on module load
if (typeof window !== 'undefined') {
    initTTS();
}
