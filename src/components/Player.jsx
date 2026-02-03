/**
 * Player Component
 * Main audio player with speed control and karaoke display
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import * as tts from '../services/tts';
import { playTTSAtSpeed, stopTTS } from '../services/tts-cache';
import { playBlobAtSpeed, stopPlayback, initAudioContext } from '../services/audio-processor';

export default function Player({
    text = '',
    recording = null, // Audio blob for recordings
    loopConfig = [{ speed: 1.0 }],
    ttsMode = 'offline',       // 'offline' (Web Speech) or 'online' (Google Cloud)
    voiceUri = null,           // Chinese voice (Web Speech)
    englishVoiceUri = null,    // English voice (Web Speech)
    googleTtsApiKey = null,    // Google Cloud TTS API key
    googleVoiceType = 'Neural2', // Neural2, WaveNet, Standard
    googleChineseVoice = null, // Selected Google Chinese voice
    googleEnglishVoice = null, // Selected Google English voice
    timing = null, // Calibrated timing data
    onComplete = null
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentSpeed, setCurrentSpeed] = useState(1.0);
    const [currentStage, setCurrentStage] = useState(0);

    const stageRef = useRef(0);
    const abortRef = useRef(false);

    // Play a single stage of the loop
    const playStage = useCallback(async (stageIndex) => {
        if (abortRef.current) return;

        const stage = loopConfig[stageIndex];
        if (!stage) return;

        setCurrentStage(stageIndex);
        setCurrentSpeed(stage.speed);

        // If we have a recording, play it with Web Audio API (supports up to 10x)
        if (recording) {
            try {
                await new Promise((resolve) => {
                    initAudioContext();
                    playBlobAtSpeed(recording, stage.speed, {
                        onEnded: resolve
                    });
                });
            } catch (err) {
                console.error('Recording playback failed:', err);
            }
        } else {
            // Use TTS
            const useGoogleTTS = ttsMode === 'online' && googleTtsApiKey;

            try {
                await playTTSAtSpeed(text, stage.speed, {
                    voiceUri,
                    englishVoiceUri,
                    ttsMode,
                    googleTtsApiKey: useGoogleTTS ? googleTtsApiKey : null,
                    googleVoiceType,
                    googleChineseVoice,
                    googleEnglishVoice,
                    timing,
                    onStart: () => {
                        console.log(`Playing at ${stage.speed}x`);
                    },
                    onEnd: () => {
                        console.log('Playback complete');
                    }
                });
            } catch (err) {
                console.error('TTS failed:', err);
            }
        }
    }, [text, recording, loopConfig, ttsMode, voiceUri, englishVoiceUri, googleTtsApiKey, googleVoiceType, googleChineseVoice, googleEnglishVoice, timing]);

    // Play all stages in sequence
    const playAllStages = useCallback(async () => {
        abortRef.current = false;
        setIsPlaying(true);

        for (let i = 0; i < loopConfig.length; i++) {
            if (abortRef.current) break;
            stageRef.current = i;
            await playStage(i);
        }

        setIsPlaying(false);
        onComplete?.();
    }, [loopConfig, playStage, onComplete]);

    // Control functions
    const handlePlay = useCallback(() => {
        if (isPaused) {
            tts.resume();
            setIsPaused(false);
        } else {
            playAllStages();
        }
    }, [isPaused, playAllStages]);

    const handlePause = useCallback(() => {
        tts.pause();
        setIsPaused(true);
    }, []);

    const handleStop = useCallback(() => {
        abortRef.current = true;
        tts.stop();
        stopPlayback();
        setIsPlaying(false);
        setIsPaused(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortRef.current = true;
            tts.stop();
            stopPlayback();
        };
    }, []);

    return (
        <div className="player">
            {/* Text Display */}
            <div className="karaoke-display card">
                {text || <span className="text-muted">沒有文字內容</span>}
            </div>

            {/* Loop Matrix Display */}
            {loopConfig.length > 1 && (
                <div className="loop-matrix">
                    {loopConfig.map((stage, index) => (
                        <div
                            key={index}
                            className={`loop-stage ${index === currentStage && isPlaying ? 'active' : ''}`}
                        >
                            <span className="loop-stage-number">第 {index + 1} 次</span>
                            <span className="loop-stage-speed">{stage.speed}x</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Speed Display */}
            <div className="speed-control">
                <span className="speed-display">{currentSpeed}x</span>
            </div>

            {/* Player Controls */}
            <div className="player-controls">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={handleStop}
                    disabled={!isPlaying}
                >
                    ⏹️
                </button>

                <button
                    className="play-btn"
                    onClick={isPlaying && !isPaused ? handlePause : handlePlay}
                    disabled={!text && !recording}
                >
                    {isPlaying && !isPaused ? '⏸️' : '▶️'}
                </button>

                <div className="btn btn-ghost btn-icon" style={{ opacity: 0, pointerEvents: 'none' }}>
                    {/* Placeholder for symmetry */}
                </div>
            </div>
        </div>
    );
}
