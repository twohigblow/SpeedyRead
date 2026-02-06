/**
 * Gemini TTS Player Component
 * 
 * Demonstrates CORRECT usage of Gemini TTS with iOS audio fix
 * 
 * Key Pattern:
 * 1. Call unlockAudioForIOS() at the VERY TOP of click handler
 * 2. THEN do async operations (fetch, database, etc.)
 * 3. Finally play the audio
 */

import { useState, useEffect } from 'react';
import {
    unlockAudioForIOS,
    playGeminiTTS,
    GEMINI_VOICES,
    testGeminiTTSApiKey
} from '../services/gemini-tts';
import { getSettings } from '../services/db';

export default function GeminiTTSPlayer({ text, textId, sourceSampleRate = 24000 }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [voice, setVoice] = useState('Puck');
    const [speed, setSpeed] = useState(1.0);
    const [error, setError] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);

    // Load API key from settings
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settings = await getSettings();
        setApiKey(settings.geminiApiKey || '');
    };

    /**
     * CRITICAL iOS FIX PATTERN
     * This is how to properly handle audio on iOS
     */
    const handlePlay = async () => {
        try {
            setError(null);

            if (!apiKey) {
                setError('Please set Gemini API key in settings');
                return;
            }

            if (!text) {
                setError('No text to speak');
                return;
            }

            // ========================================
            // CRITICAL FIX #1: Unlock AudioContext
            // MUST be called SYNCHRONOUSLY inside click handler
            // BEFORE any async operations
            // ========================================
            await unlockAudioForIOS();

            // ========================================
            // Now safe to do async operations
            // The "gate" is open, audio will work
            // ========================================

            setIsPlaying(true);

            const player = await playGeminiTTS(text, apiKey, {
                voice,
                speed,
                textId,
                useCache: true,
                sourceSampleRate,
                onStart: () => {
                    console.log(`Gemini TTS started (Source: ${sourceSampleRate}Hz)`);
                },
                onEnd: () => {
                    console.log('Gemini TTS ended');
                    setIsPlaying(false);
                    setCurrentPlayer(null);
                }
            });

            setCurrentPlayer(player);

        } catch (err) {
            console.error('TTS error:', err);
            setError(err.message);
            setIsPlaying(false);
            setCurrentPlayer(null);
        }
    };

    const handleStop = () => {
        if (currentPlayer) {
            currentPlayer.stop();
            setIsPlaying(false);
            setCurrentPlayer(null);
        }
    };

    const testApiKey = async () => {
        if (!apiKey) {
            setError('Please enter API key');
            return;
        }

        setError('Testing API key...');
        const isValid = await testGeminiTTSApiKey(apiKey);

        if (isValid) {
            setError('✅ API key is valid');
        } else {
            setError('❌ API key is invalid');
        }
    };

    return (
        <div className="gemini-tts-player">
            <div className="controls">
                {/* Voice Selection */}
                <div className="control-group">
                    <label>Voice:</label>
                    <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        disabled={isPlaying}
                    >
                        {GEMINI_VOICES.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.name} - {v.description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Speed Control */}
                <div className="control-group">
                    <label>Speed: {speed.toFixed(1)}x</label>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        disabled={isPlaying}
                    />
                </div>

                {/* API Key (for demo - in production, get from settings) */}
                <div className="control-group">
                    <label>Gemini API Key:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter Gemini API key"
                            disabled={isPlaying}
                        />
                        <button onClick={testApiKey} disabled={isPlaying}>
                            Test
                        </button>
                    </div>
                </div>

                {/* Play/Stop Buttons */}
                <div className="control-group">
                    {!isPlaying ? (
                        <button
                            onClick={handlePlay}
                            className="btn-primary"
                        >
                            🔊 Play with Gemini TTS
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="btn-danger"
                        >
                            ⏹️ Stop
                        </button>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className={`message ${error.includes('✅') ? 'success' : 'error'}`}>
                        {error}
                    </div>
                )}
            </div>

            {/* Technical Info */}
            <div className="tech-info">
                <h4>iOS Audio Fix - How It Works</h4>
                <ol>
                    <li>
                        <strong>Unlock AudioContext:</strong> Called synchronously in click handler
                        before any async operations
                    </li>
                    <li>
                        <strong>Manual PCM Decoding:</strong> Converts Gemini's 16-bit PCM to Float32Array
                    </li>
                    <li>
                        <strong>Linear Interpolation Resampling:</strong> Resamples from 24kHz to device
                        sample rate (typically 48kHz on iOS)
                    </li>
                </ol>
                <p>
                    <strong>Why this works on iOS:</strong> Safari requires audio to be triggered
                    directly by user gesture. By resuming AudioContext immediately in the click handler,
                    the "gate" is opened, allowing subsequent audio playback even after async operations.
                </p>
            </div>

            <style jsx>{`
                .gemini-tts-player {
                    padding: 20px;
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 8px;
                    background: var(--bg-secondary, #f9f9f9);
                }

                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .control-group label {
                    font-weight: 600;
                    font-size: 14px;
                }

                .control-group select,
                .control-group input[type="password"],
                .control-group input[type="range"] {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .control-group input[type="range"] {
                    padding: 0;
                }

                button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-primary {
                    background: #4CAF50;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #45a049;
                }

                .btn-danger {
                    background: #f44336;
                    color: white;
                }

                .btn-danger:hover:not(:disabled) {
                    background: #da190b;
                }

                .message {
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 14px;
                }

                .message.error {
                    background: #ffebee;
                    color: #c62828;
                }

                .message.success {
                    background: #e8f5e9;
                    color: #2e7d32;
                }

                .tech-info {
                    margin-top: 24px;
                    padding: 16px;
                    background: white;
                    border-radius: 6px;
                    border-left: 4px solid #2196F3;
                }

                .tech-info h4 {
                    margin: 0 0 12px 0;
                    color: #2196F3;
                }

                .tech-info ol {
                    margin: 8px 0;
                    padding-left: 20px;
                }

                .tech-info li {
                    margin: 8px 0;
                    line-height: 1.5;
                }

                .tech-info p {
                    margin: 12px 0 0 0;
                    padding: 12px;
                    background: #e3f2fd;
                    border-radius: 4px;
                    font-size: 13px;
                    line-height: 1.6;
                }
            `}</style>
        </div>
    );
}
