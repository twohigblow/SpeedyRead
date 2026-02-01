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
    const [activeWordIndex, setActiveWordIndex] = useState(-1);
    const [spokenWords, setSpokenWords] = useState(new Set());

    const wordsRef = useRef([]);
    const stageRef = useRef(0);
    const abortRef = useRef(false);

    // Parse text into words/characters for karaoke
    useEffect(() => {
        // Split on spaces for English, or individual characters for Chinese
        const isChinese = /[\u4e00-\u9fff]/.test(text);
        if (isChinese) {
            wordsRef.current = text.split('').filter(c => c.trim());
        } else {
            wordsRef.current = text.split(/\s+/).filter(w => w.trim());
        }
    }, [text]);

    // Play a single stage of the loop
    const playStage = useCallback(async (stageIndex) => {
        if (abortRef.current) return;

        const stage = loopConfig[stageIndex];
        if (!stage) return;

        setCurrentStage(stageIndex);
        setCurrentSpeed(stage.speed);
        setActiveWordIndex(0);
        setSpokenWords(new Set());

        // Parse words for karaoke
        const isChinese = /[\u4e00-\u9fff]/.test(text);
        const totalUnits = isChinese ? text.split('').filter(c => c.trim()).length : text.split(/\s+/).filter(w => w.trim()).length;

        // If we have a recording, play it with Web Audio API (supports up to 10x)
        if (recording) {
            try {
                // For recordings, we can use Web Audio API for true high-speed playback
                const estimatedDuration = 5; // Estimate, we don't have exact duration here
                const actualDuration = estimatedDuration / stage.speed;

                // Simulate karaoke for high-speed recording playback
                const karaokeInterval = setInterval(() => {
                    if (abortRef.current) {
                        clearInterval(karaokeInterval);
                        return;
                    }
                    setActiveWordIndex(prev => {
                        const next = prev + 1;
                        if (next < totalUnits) {
                            setSpokenWords(p => new Set([...p, prev]));
                            return next;
                        }
                        return prev;
                    });
                }, (actualDuration * 1000) / totalUnits);

                await new Promise((resolve, reject) => {
                    initAudioContext();
                    playBlobAtSpeed(recording, stage.speed, {
                        onEnded: () => {
                            clearInterval(karaokeInterval);
                            // Mark all as spoken
                            setSpokenWords(new Set(Array.from({ length: totalUnits }, (_, i) => i)));
                            setActiveWordIndex(totalUnits - 1);
                            resolve();
                        }
                    });
                });
            } catch (err) {
                console.error('Recording playback failed:', err);
            }
        } else {
            // Use TTS - check mode to determine which TTS to use
            const useGoogleTTS = ttsMode === 'online' && googleTtsApiKey;

            // Only enable karaoke for online mode (Google TTS has accurate timing)
            // Offline Web Speech API timing is too inaccurate for karaoke
            const enableKaraoke = useGoogleTTS;

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
                        console.log(`Playing at ${stage.speed}x${useGoogleTTS ? ' (Google TTS + Karaoke)' : ' (Web Speech, no karaoke)'}`);
                        // For offline mode, immediately mark all as "active" (no highlighting animation)
                        if (!enableKaraoke) {
                            setActiveWordIndex(-1);
                            setSpokenWords(new Set());
                        }
                    },
                    onBoundary: enableKaraoke ? ({ charIndex }) => {
                        setActiveWordIndex(charIndex);
                        setSpokenWords(prev => new Set([...prev, ...Array.from({ length: charIndex }, (_, i) => i)]));
                    } : null,
                    onEnd: () => {
                        if (enableKaraoke) {
                            setSpokenWords(new Set(Array.from({ length: totalUnits }, (_, i) => i)));
                            setActiveWordIndex(totalUnits - 1);
                        }
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
        setActiveWordIndex(-1);
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
        setActiveWordIndex(-1);
        setSpokenWords(new Set());
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortRef.current = true;
            tts.stop();
            stopPlayback();
        };
    }, []);

    // Render karaoke text
    const renderKaraokeText = () => {
        const isChinese = /[\u4e00-\u9fff]/.test(text);
        const units = isChinese ? text.split('') : text.split(/\s+/);

        return units.map((unit, index) => {
            const isActive = index === activeWordIndex;
            const isSpoken = spokenWords.has(index);

            return (
                <span
                    key={index}
                    className={`karaoke-word ${isActive ? 'active' : ''} ${isSpoken ? 'spoken' : ''}`}
                >
                    {unit}
                    {!isChinese && index < units.length - 1 ? ' ' : ''}
                </span>
            );
        });
    };

    return (
        <div className="player">
            {/* Karaoke Display */}
            <div className="karaoke-display card">
                {text ? renderKaraokeText() : <span className="text-muted">沒有文字內容</span>}
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
