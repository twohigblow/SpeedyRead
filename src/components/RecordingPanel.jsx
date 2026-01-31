/**
 * RecordingPanel Component
 * Record and playback user voice with speed control
 */
import { useState, useEffect, useRef } from 'react';
import * as recorder from '../services/recorder';
import { playBlobAtSpeed, stopPlayback, initAudioContext } from '../services/audio-processor';

export default function RecordingPanel({
    textId = null,
    onRecordingSaved,
    existingRecording = null
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentRecording, setCurrentRecording] = useState(existingRecording);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [error, setError] = useState(null);

    const timerRef = useRef(null);

    // Update duration while recording
    useEffect(() => {
        if (isRecording && !isPaused) {
            timerRef.current = setInterval(() => {
                setDuration(d => d + 0.1);
            }, 100);
        } else {
            clearInterval(timerRef.current);
        }

        return () => clearInterval(timerRef.current);
    }, [isRecording, isPaused]);

    const handleStartRecording = async () => {
        try {
            setError(null);
            setDuration(0);

            const hasPermission = await recorder.requestMicrophonePermission();
            if (!hasPermission) {
                setError('需要麥克風權限才能錄音');
                return;
            }

            await recorder.startRecording({
                onStart: () => setIsRecording(true)
            });
        } catch (err) {
            setError(err.message);
        }
    };

    const handleStopRecording = async () => {
        try {
            const audioBlob = await recorder.stopRecording();
            setIsRecording(false);
            setCurrentRecording(audioBlob);

            // Get actual duration
            const actualDuration = await recorder.getAudioDuration(audioBlob);
            setDuration(actualDuration);
        } catch (err) {
            setError(err.message);
            setIsRecording(false);
        }
    };

    const handlePauseRecording = () => {
        if (isPaused) {
            recorder.resumeRecording();
            setIsPaused(false);
        } else {
            recorder.pauseRecording();
            setIsPaused(true);
        }
    };

    const handleDeleteRecording = () => {
        if (currentRecording instanceof Blob) {
            // Clean up blob URL if any
        }
        setCurrentRecording(null);
        setDuration(0);
        setIsPlaying(false);
        stopPlayback();
    };

    const handlePlayRecording = async () => {
        if (!currentRecording) return;

        try {
            initAudioContext();
            setIsPlaying(true);

            await playBlobAtSpeed(currentRecording, playbackSpeed, {
                onEnded: () => setIsPlaying(false)
            });
        } catch (err) {
            setError(err.message);
            setIsPlaying(false);
        }
    };

    const handleStopPlayback = () => {
        stopPlayback();
        setIsPlaying(false);
    };

    const handleSave = () => {
        if (currentRecording) {
            onRecordingSaved?.({
                audioBlob: currentRecording,
                duration,
                textId
            });
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="recording-panel card">
            <h4 className="mb-md">🎙️ 錄音</h4>

            {error && (
                <div className="toast" style={{ position: 'relative', bottom: 0, transform: 'none', marginBottom: 'var(--space-md)' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Recording State */}
            {isRecording && (
                <div className="recording-active text-center mb-lg">
                    <div className="recording-indicator justify-center mb-md">
                        <span className="recording-dot"></span>
                        <span>錄音中...</span>
                    </div>
                    <div className="speed-display">{formatDuration(duration)}</div>
                </div>
            )}

            {/* Recording Controls */}
            <div className="recording-controls player-controls">
                {!isRecording && !currentRecording && (
                    <button
                        className="play-btn"
                        onClick={handleStartRecording}
                        style={{ background: 'var(--gradient-secondary)' }}
                    >
                        🎤
                    </button>
                )}

                {isRecording && (
                    <>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={handlePauseRecording}
                        >
                            {isPaused ? '▶️' : '⏸️'}
                        </button>

                        <button
                            className="play-btn"
                            onClick={handleStopRecording}
                            style={{ background: 'var(--color-error)' }}
                        >
                            ⏹️
                        </button>
                    </>
                )}

                {currentRecording && !isRecording && (
                    <>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={handleDeleteRecording}
                        >
                            🗑️
                        </button>

                        <button
                            className="play-btn"
                            onClick={isPlaying ? handleStopPlayback : handlePlayRecording}
                        >
                            {isPlaying ? '⏹️' : '▶️'}
                        </button>

                        <button
                            className="btn btn-primary btn-icon"
                            onClick={handleSave}
                        >
                            💾
                        </button>
                    </>
                )}
            </div>

            {/* Playback Speed Control (when recording exists) */}
            {currentRecording && !isRecording && (
                <div className="speed-control mt-lg">
                    <label className="label">播放速度: {playbackSpeed}x</label>
                    <input
                        type="range"
                        className="speed-slider"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <div className="flex justify-between text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        <span>0.5x</span>
                        <span>10x</span>
                    </div>
                </div>
            )}

            {/* Duration display */}
            {currentRecording && !isRecording && (
                <p className="text-center text-muted mt-md">
                    錄音時長: {formatDuration(duration)}
                </p>
            )}
        </div>
    );
}
