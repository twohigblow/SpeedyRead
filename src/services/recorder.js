/**
 * Voice Recorder Service
 * Handles recording user voice and saving to IndexedDB
 */

let mediaRecorder = null;
let audioChunks = [];
let recordingStream = null;

/**
 * Check if recording is supported
 */
export function isRecordingSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, we just wanted to check permission
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

/**
 * Start recording
 * @param {object} options - Recording options
 * @returns {Promise<void>}
 */
export async function startRecording(options = {}) {
    const {
        onStart = null,
        onDataAvailable = null,
        mimeType = 'audio/webm;codecs=opus'
    } = options;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        throw new Error('Recording already in progress');
    }

    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        audioChunks = [];

        // Check supported mime types
        const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
            ? mimeType
            : 'audio/webm';

        mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType: supportedMimeType
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                onDataAvailable?.(event.data);
            }
        };

        mediaRecorder.onstart = () => {
            onStart?.();
        };

        mediaRecorder.start(100); // Collect data every 100ms
        return true;
    } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
    }
}

/**
 * Stop recording and return audio blob
 * @returns {Promise<Blob>} - Audio blob
 */
export async function stopRecording() {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder) {
            reject(new Error('No recording in progress'));
            return;
        }

        mediaRecorder.onstop = () => {
            // Stop all tracks
            if (recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
                recordingStream = null;
            }

            // Create blob from chunks
            const mimeType = mediaRecorder.mimeType;
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            audioChunks = [];
            mediaRecorder = null;

            resolve(audioBlob);
        };

        mediaRecorder.onerror = (event) => {
            reject(event.error);
        };

        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        } else {
            reject(new Error('Recording not in progress'));
        }
    });
}

/**
 * Pause recording
 */
export function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        return true;
    }
    return false;
}

/**
 * Resume recording
 */
export function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        return true;
    }
    return false;
}

/**
 * Cancel recording without saving
 */
export function cancelRecording() {
    if (mediaRecorder) {
        if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        mediaRecorder = null;
    }

    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        recordingStream = null;
    }

    audioChunks = [];
}

/**
 * Check if currently recording
 */
export function isRecording() {
    return mediaRecorder?.state === 'recording';
}

/**
 * Check if recording is paused
 */
export function isRecordingPaused() {
    return mediaRecorder?.state === 'paused';
}

/**
 * Get recording duration estimate (in seconds)
 * Note: This is approximate based on chunk timing
 */
export function getRecordingDuration() {
    if (!audioChunks.length) return 0;
    // Approximate: each chunk is ~100ms
    return audioChunks.length * 0.1;
}

/**
 * Create an audio URL from the recording blob
 * Remember to revoke the URL when done!
 * @param {Blob} audioBlob - Audio blob
 * @returns {string} - Object URL
 */
export function createAudioURL(audioBlob) {
    return URL.createObjectURL(audioBlob);
}

/**
 * Revoke an audio URL
 * @param {string} url - Object URL to revoke
 */
export function revokeAudioURL(url) {
    URL.revokeObjectURL(url);
}

/**
 * Convert audio blob to ArrayBuffer
 * @param {Blob} audioBlob - Audio blob
 * @returns {Promise<ArrayBuffer>} - Array buffer
 */
export async function blobToArrayBuffer(audioBlob) {
    return audioBlob.arrayBuffer();
}

/**
 * Get audio duration from blob
 * @param {Blob} audioBlob - Audio blob
 * @returns {Promise<number>} - Duration in seconds
 */
export async function getAudioDuration(audioBlob) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
        };
        audio.onerror = reject;
        audio.src = createAudioURL(audioBlob);
    });
}
