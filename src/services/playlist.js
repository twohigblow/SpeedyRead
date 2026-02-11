/**
 * Dynamic Playlist Engine Service
 * 
 * Manages multi-library queues with per-repeat speed control,
 * sleep mode optimization, and intelligent audio processing.
 */

import { playTTSAtSpeed } from './tts-cache.js';
import { getAllLibraries, getWordsFromLibrary, getText } from './db.js';

// LocalStorage key for playlists
const PLAYLIST_STORAGE_KEY = 'SPEEDY_READ_NIGHTLY_FLOW';

/**
 * Data structure for a playlist item
 * @typedef {Object} PlaylistItem
 * @property {string} id - Unique ID
 * @property {string} libraryId - Reference to library (null if isText)
 * @property {string} textId - Reference to text (null if library)
 * @property {string} name - Library/Text name
 * @property {Array<Loop>} loops - Array of speed configurations
 * @property {number} gapBetweenLoops - Gap in ms between loops
 * @property {boolean} sleepMode - Enable sleep mode for this item
 * @property {boolean} isText - True if this is a single text, false if library
 */

/**
 * Loop configuration
 * @typedef {Object} Loop
 * @property {number} speed - Playback speed
 * @property {number} volume - Volume (0-100)
 * @property {number} pitch - Pitch shift (-12 to +12 semitones)
 */

// Global playback state
let currentPlayback = {
    isPlaying: false,
    currentItemIndex: 0,
    currentLoopIndex: 0,
    isPaused: false,
    controller: null
};

/**
 * Create a new playlist item
 */
export function createPlaylistItem(id, name, options = {}) {
    const {
        loops = [{ speed: 1.0, volume: 80, pitch: 0 }],
        gapBetweenLoops = 2000,
        sleepMode = false,
        isText = false
    } = options;

    return {
        id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        libraryId: isText ? null : id,
        textId: isText ? id : null,
        name,
        loops,
        gapBetweenLoops,
        sleepMode,
        isText
    };
}

/**
 * Save playlist to localStorage
 */
export function savePlaylist(playlist) {
    try {
        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist));
        console.log('Playlist saved:', playlist.length, 'items');
        return true;
    } catch (error) {
        console.error('Failed to save playlist:', error);
        return false;
    }
}

/**
 * Load playlist from localStorage
 */
export function loadPlaylist() {
    try {
        const stored = localStorage.getItem(PLAYLIST_STORAGE_KEY);
        if (!stored) return [];

        const playlist = JSON.parse(stored);
        console.log('Playlist loaded:', playlist.length, 'items');
        return playlist;
    } catch (error) {
        console.error('Failed to load playlist:', error);
        return [];
    }
}

/**
 * Add item to playlist
 */
export function addToPlaylist(item) {
    const playlist = loadPlaylist();
    playlist.push(item);
    savePlaylist(playlist);
    return playlist;
}

/**
 * Remove item from playlist
 */
export function removeFromPlaylist(itemId) {
    const playlist = loadPlaylist();
    const filtered = playlist.filter(item => item.id !== itemId);
    savePlaylist(filtered);
    return filtered;
}

/**
 * Update playlist item
 */
export function updatePlaylistItem(itemId, updates) {
    const playlist = loadPlaylist();
    const index = playlist.findIndex(item => item.id === itemId);

    if (index !== -1) {
        playlist[index] = { ...playlist[index], ...updates };
        savePlaylist(playlist);
    }

    return playlist;
}

/**
 * Reorder playlist items
 */
export function reorderPlaylist(fromIndex, toIndex) {
    const playlist = loadPlaylist();
    const [moved] = playlist.splice(fromIndex, 1);
    playlist.splice(toIndex, 0, moved);
    savePlaylist(playlist);
    return playlist;
}

/**
 * Clear entire playlist
 */
export function clearPlaylist() {
    savePlaylist([]);
    return [];
}

/**
 * Sleep mode audio processor
 * Applies warmth filter, pitch shift, and volume decay
 */
function applySleepModeProcessing(loop, itemIndex, totalItems, loopIndex, totalLoops) {
    const processed = { ...loop };

    // 1. Speed cap for sleep mode (max 1.2x)
    if (processed.speed > 1.2) {
        console.log(`Sleep mode: Capping speed from ${processed.speed}x to 1.2x`);
        processed.speed = 1.2;
    }

    // 2. Auto pitch shift - gradual decrease
    // Each library gets -2 semitones, each loop within library gets -0.5 semitones
    const libraryPitchShift = itemIndex * -2;
    const loopPitchShift = loopIndex * -0.5;
    processed.pitch = (loop.pitch || 0) + libraryPitchShift + loopPitchShift;

    // Cap at -12 semitones (one octave down)
    processed.pitch = Math.max(processed.pitch, -12);

    // 3. Volume decay - progressive reduction
    const volumeDecayFactor = 1 - (itemIndex / totalItems) * 0.5; // Up to 50% reduction
    processed.volume = Math.round((loop.volume || 80) * volumeDecayFactor);

    console.log(`Sleep mode processing: speed=${processed.speed}x, pitch=${processed.pitch}, volume=${processed.volume}%`);

    return processed;
}

/**
 * Delay helper
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get all words from a library formatted for playback
 */
async function getLibraryContent(libraryId) {
    const words = await getWordsFromLibrary(libraryId);

    // Format words for TTS
    // For spelling words: "J,E,A,N,S, Jeans"
    // For sentences: just the text
    const formattedTexts = words.map(word => {
        if (word.type === 'spelling' || word.characters) {
            const spelling = word.characters || word.front.split('').join(',');
            return `${spelling}, ${word.front}`;
        }
        return word.front;
    });

    return formattedTexts;
}

/**
 * Get content from a single text formatted for playback
 */
async function getTextContent(textId) {
    const text = await getText(textId);
    if (!text) return [];

    // Split text into sentences or chunks
    // For now, just return the whole text as one item
    return [text.content];
}

/**
 * Run a single loop with specified speed and audio processing
 */
async function runLoop(texts, loop, callbacks = {}) {
    const { onProgress, onWordStart, onWordEnd } = callbacks;

    for (let i = 0; i < texts.length; i++) {
        // Check if playback was stopped
        if (!currentPlayback.isPlaying) {
            throw new Error('Playback stopped');
        }

        // Wait if paused
        while (currentPlayback.isPaused && currentPlayback.isPlaying) {
            await delay(100);
        }

        onWordStart?.(i, texts[i]);
        onProgress?.(i, texts.length);

        // Play with TTS
        await playTTSAtSpeed(texts[i], loop.speed, {
            volume: loop.volume / 100,
            pitch: loop.pitch,
            onStart: () => console.log(`Playing: ${texts[i]} at ${loop.speed}x`),
            onEnd: () => console.log(`Finished: ${texts[i]}`)
        });

        onWordEnd?.(i, texts[i]);
    }
}

/**
 * Main playlist runner engine
 * 
 * @param {Array<PlaylistItem>} playlist - The playlist to run
 * @param {Object} callbacks - Event callbacks
 * @returns {Promise<void>}
 */
export async function runPlaylist(playlist, callbacks = {}) {
    const {
        onStart,
        onItemStart,
        onLoopStart,
        onProgress,
        onItemEnd,
        onEnd,
        onError
    } = callbacks;

    try {
        // Initialize playback state
        currentPlayback.isPlaying = true;
        currentPlayback.isPaused = false;
        currentPlayback.currentItemIndex = 0;
        currentPlayback.currentLoopIndex = 0;

        onStart?.();

        // Iterate through each library in playlist
        for (let itemIndex = 0; itemIndex < playlist.length; itemIndex++) {
            const item = playlist[itemIndex];

            // Check if stopped
            if (!currentPlayback.isPlaying) break;

            currentPlayback.currentItemIndex = itemIndex;
            onItemStart?.(itemIndex, item);

            console.log(`Starting Item ${itemIndex + 1}/${playlist.length}: ${item.name}`);

            // Load content based on item type
            let texts;
            if (item.isText) {
                texts = await getTextContent(item.textId);
            } else {
                texts = await getLibraryContent(item.libraryId);
            }

            if (texts.length === 0) {
                console.warn(`Item ${item.name} has no content, skipping`);
                continue;
            }

            // Iterate through each loop
            for (let loopIndex = 0; loopIndex < item.loops.length; loopIndex++) {
                // Check if stopped
                if (!currentPlayback.isPlaying) break;

                currentPlayback.currentLoopIndex = loopIndex;
                let loop = item.loops[loopIndex];

                // Apply sleep mode processing if enabled
                if (item.sleepMode) {
                    loop = applySleepModeProcessing(
                        loop,
                        itemIndex,
                        playlist.length,
                        loopIndex,
                        item.loops.length
                    );
                }

                onLoopStart?.(itemIndex, loopIndex, loop);

                console.log(`Loop ${loopIndex + 1}/${item.loops.length}: ${loop.speed}x, volume=${loop.volume}%, pitch=${loop.pitch}`);

                // Run the loop
                await runLoop(texts, loop, {
                    onProgress: (wordIndex, totalWords) => {
                        onProgress?.(itemIndex, loopIndex, wordIndex, totalWords);
                    }
                });

                // Gap between loops
                if (loopIndex < item.loops.length - 1) {
                    console.log(`Waiting ${item.gapBetweenLoops}ms between loops...`);
                    await delay(item.gapBetweenLoops);
                }
            }

            onItemEnd?.(itemIndex, item);

            // Extra gap between libraries (10 seconds)
            if (itemIndex < playlist.length - 1) {
                console.log('Waiting 10 seconds between libraries...');
                await delay(10000);
            }
        }

        // Playlist completed
        currentPlayback.isPlaying = false;
        onEnd?.();
        console.log('Playlist completed!');

    } catch (error) {
        console.error('Playlist error:', error);
        currentPlayback.isPlaying = false;
        onError?.(error);
    }
}

/**
 * Stop playlist playback
 */
export function stopPlaylist() {
    console.log('Stopping playlist...');
    currentPlayback.isPlaying = false;
    currentPlayback.isPaused = false;

    // Stop any active TTS
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

/**
 * Pause playlist playback
 */
export function pausePlaylist() {
    console.log('Pausing playlist...');
    currentPlayback.isPaused = true;

    if (window.speechSynthesis) {
        window.speechSynthesis.pause();
    }
}

/**
 * Resume playlist playback
 */
export function resumePlaylist() {
    console.log('Resuming playlist...');
    currentPlayback.isPaused = false;

    if (window.speechSynthesis) {
        window.speechSynthesis.resume();
    }
}

/**
 * Get current playback state
 */
export function getPlaybackState() {
    return { ...currentPlayback };
}

/**
 * Preview a single loop
 */
export async function previewLoop(libraryId, loop, callbacks = {}) {
    const texts = await getLibraryContent(libraryId);

    if (texts.length === 0) {
        throw new Error('Library has no content');
    }

    // Just play first 3 items for preview
    const previewTexts = texts.slice(0, 3);

    await runLoop(previewTexts, loop, callbacks);
}

/**
 * Calculate estimated playlist duration
 */
export function estimatePlaylistDuration(playlist, avgWordDuration = 2000) {
    let totalDuration = 0;

    for (let itemIndex = 0; itemIndex < playlist.length; itemIndex++) {
        const item = playlist[itemIndex];

        for (const loop of item.loops) {
            // Estimate based on average word duration / speed
            // Assuming average library has 20 words
            const estimatedLoopDuration = (20 * avgWordDuration) / loop.speed;
            totalDuration += estimatedLoopDuration;
            totalDuration += item.gapBetweenLoops;
        }

        // Gap between libraries
        if (itemIndex < playlist.length - 1) {
            totalDuration += 10000;
        }
    }

    return totalDuration; // in milliseconds
}

/**
 * Format duration for display
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Export playlist to JSON (for sharing/backup)
 */
export function exportPlaylist(playlist) {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        playlist
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Import playlist from JSON
 */
export function importPlaylist(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        if (!data.playlist || !Array.isArray(data.playlist)) {
            throw new Error('Invalid playlist format');
        }

        savePlaylist(data.playlist);
        return data.playlist;
    } catch (error) {
        console.error('Failed to import playlist:', error);
        throw error;
    }
}
