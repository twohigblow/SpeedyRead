/**
 * Playlist Player Component
 * 
 * Plays the configured playlist with visual feedback,
 * progress tracking, and playback controls.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    loadPlaylist,
    runPlaylist,
    stopPlaylist,
    pausePlaylist,
    resumePlaylist,
    getPlaybackState,
    formatDuration
} from '../services/playlist.js';

export default function PlaylistPlayer() {
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [totalWords, setTotalWords] = useState(0);
    const [currentText, setCurrentText] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const storedPlaylist = loadPlaylist();

        if (storedPlaylist.length === 0) {
            navigate('/playlist');
            return;
        }

        setPlaylist(storedPlaylist);
    }, [navigate]);

    useEffect(() => {
        let interval;

        if (isPlaying && !isPaused && startTime) {
            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 100);
        }

        return () => clearInterval(interval);
    }, [isPlaying, isPaused, startTime]);

    const handlePlay = async () => {
        if (playlist.length === 0) return;

        setIsPlaying(true);
        setIsPaused(false);
        setStartTime(Date.now());

        try {
            await runPlaylist(playlist, {
                onStart: () => {
                    console.log('Playlist started');
                },

                onItemStart: (itemIndex, item) => {
                    console.log(`Item started: ${item.name}`);
                    setCurrentItemIndex(itemIndex);
                    setCurrentLoopIndex(0);
                },

                onLoopStart: (itemIndex, loopIndex, loop) => {
                    console.log(`Loop ${loopIndex + 1} started at ${loop.speed}x`);
                    setCurrentLoopIndex(loopIndex);
                },

                onProgress: (itemIndex, loopIndex, wordIndex, totalWords) => {
                    setCurrentWordIndex(wordIndex);
                    setTotalWords(totalWords);
                },

                onItemEnd: (itemIndex, item) => {
                    console.log(`Item completed: ${item.name}`);
                },

                onEnd: () => {
                    console.log('Playlist completed');
                    setIsPlaying(false);
                    setIsPaused(false);

                    // Show completion dialog
                    setTimeout(() => {
                        if (confirm('Playlist completed! Play again?')) {
                            handlePlay();
                        } else {
                            navigate('/playlist');
                        }
                    }, 500);
                },

                onError: (error) => {
                    console.error('Playlist error:', error);
                    alert(`Error: ${error.message}`);
                    setIsPlaying(false);
                    setIsPaused(false);
                }
            });

        } catch (error) {
            console.error('Playback error:', error);
            setIsPlaying(false);
            setIsPaused(false);
        }
    };

    const handlePause = () => {
        pausePlaylist();
        setIsPaused(true);
    };

    const handleResume = () => {
        resumePlaylist();
        setIsPaused(false);
    };

    const handleStop = () => {
        stopPlaylist();
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentItemIndex(0);
        setCurrentLoopIndex(0);
        setCurrentWordIndex(0);
    };

    const handleExit = () => {
        if (isPlaying) {
            if (confirm('Stop playback and exit?')) {
                handleStop();
                navigate('/playlist');
            }
        } else {
            navigate('/playlist');
        }
    };

    const currentItem = playlist[currentItemIndex];
    const currentLoop = currentItem?.loops[currentLoopIndex];
    const progress = totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0;

    return (
        <div className="page playlist-player-page">
            {/* Header */}
            <header className="player-header">
                <button className="btn btn-icon" onClick={handleExit}>
                    ← Back
                </button>
                <h2>Playlist Player</h2>
                <div style={{ width: '40px' }}></div>
            </header>

            {/* Player Content */}
            <div className="player-content">
                {/* Progress Overview */}
                <div className="progress-overview card">
                    <div className="overview-stat">
                        <div className="stat-label">Library</div>
                        <div className="stat-value">
                            {currentItemIndex + 1} / {playlist.length}
                        </div>
                    </div>
                    <div className="overview-stat">
                        <div className="stat-label">Loop</div>
                        <div className="stat-value">
                            {currentLoopIndex + 1} / {currentItem?.loops.length || 0}
                        </div>
                    </div>
                    <div className="overview-stat">
                        <div className="stat-label">Elapsed</div>
                        <div className="stat-value">{formatDuration(elapsedTime)}</div>
                    </div>
                </div>

                {/* Current Library */}
                <div className="current-library card">
                    <div className="library-icon">📚</div>
                    <div className="library-info">
                        <div className="library-name">{currentItem?.name || 'Ready to play'}</div>
                        {currentLoop && (
                            <div className="library-meta">
                                Speed: {currentLoop.speed}x •
                                Volume: {currentLoop.volume}% •
                                Pitch: {currentLoop.pitch > 0 ? '+' : ''}{currentLoop.pitch}
                                {currentItem?.sleepMode && <span className="sleep-indicator">🌙 Sleep Mode</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                {isPlaying && (
                    <div className="progress-section card">
                        <div className="progress-label">
                            Word {currentWordIndex + 1} of {totalWords}
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="progress-percentage">{Math.round(progress)}%</div>
                    </div>
                )}

                {/* Current Text Display */}
                {currentText && (
                    <div className="current-text card">
                        <div className="text-display">{currentText}</div>
                    </div>
                )}

                {/* Playlist Queue */}
                <div className="playlist-queue card">
                    <h3>Queue</h3>
                    <div className="queue-list">
                        {playlist.map((item, index) => (
                            <div
                                key={item.id}
                                className={`queue-item ${index === currentItemIndex ? 'active' : ''} ${index < currentItemIndex ? 'completed' : ''}`}
                            >
                                <div className="queue-number">{index + 1}</div>
                                <div className="queue-info">
                                    <div className="queue-name">{item.name}</div>
                                    <div className="queue-meta">
                                        {item.loops.length} loop{item.loops.length !== 1 ? 's' : ''}
                                        {item.sleepMode && ' 🌙'}
                                    </div>
                                </div>
                                <div className="queue-status">
                                    {index < currentItemIndex && '✓'}
                                    {index === currentItemIndex && isPlaying && '▶️'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Player Controls */}
            <div className="player-controls">
                {!isPlaying ? (
                    <button className="btn btn-play" onClick={handlePlay}>
                        ▶️ Start Playlist
                    </button>
                ) : isPaused ? (
                    <>
                        <button className="btn btn-secondary" onClick={handleResume}>
                            ▶️ Resume
                        </button>
                        <button className="btn btn-danger" onClick={handleStop}>
                            ⏹️ Stop
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={handlePause}>
                            ⏸️ Pause
                        </button>
                        <button className="btn btn-danger" onClick={handleStop}>
                            ⏹️ Stop
                        </button>
                    </>
                )}
            </div>

            <style jsx>{`
                .playlist-player-page {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .player-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: rgba(255,255,255,0.95);
                    backdrop-filter: blur(10px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .player-header h2 {
                    margin: 0;
                    font-size: 18px;
                }

                .player-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .card {
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .progress-overview {
                    display: flex;
                    justify-content: space-around;
                    text-align: center;
                }

                .overview-stat {
                    flex: 1;
                }

                .stat-label {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--primary-color, #4CAF50);
                }

                .current-library {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .library-icon {
                    font-size: 48px;
                }

                .library-info {
                    flex: 1;
                }

                .library-name {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .library-meta {
                    font-size: 13px;
                    color: #666;
                }

                .sleep-indicator {
                    margin-left: 8px;
                    color: #673AB7;
                    font-weight: 600;
                }

                .progress-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .progress-label {
                    font-size: 14px;
                    color: #666;
                }

                .progress-bar {
                    height: 8px;
                    background: #e0e0e0;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--primary-color, #4CAF50), #66BB6A);
                    transition: width 0.3s ease;
                }

                .progress-percentage {
                    text-align: right;
                    font-size: 12px;
                    color: #666;
                }

                .current-text {
                    text-align: center;
                    min-height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .text-display {
                    font-size: 32px;
                    font-weight: 600;
                    color: #333;
                }

                .playlist-queue h3 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                }

                .queue-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .queue-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 8px;
                    background: #f5f5f5;
                    transition: all 0.2s;
                }

                .queue-item.active {
                    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(102, 187, 106, 0.1));
                    border: 2px solid var(--primary-color, #4CAF50);
                }

                .queue-item.completed {
                    opacity: 0.6;
                }

                .queue-number {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #ddd;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 600;
                }

                .queue-item.active .queue-number {
                    background: var(--primary-color, #4CAF50);
                    color: white;
                }

                .queue-info {
                    flex: 1;
                }

                .queue-name {
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .queue-meta {
                    font-size: 12px;
                    color: #666;
                }

                .queue-status {
                    font-size: 20px;
                }

                .player-controls {
                    background: rgba(255,255,255,0.95);
                    backdrop-filter: blur(10px);
                    padding: 16px 20px;
                    display: flex;
                    gap: 12px;
                    box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
                }

                .player-controls button {
                    flex: 1;
                    padding: 16px;
                    font-size: 16px;
                    font-weight: 600;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-play {
                    background: var(--primary-color, #4CAF50);
                    color: white;
                }

                .btn-play:hover {
                    background: #45a049;
                    transform: scale(1.02);
                }

                .btn-secondary {
                    background: #2196F3;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #1976D2;
                }

                .btn-danger {
                    background: #f44336;
                    color: white;
                }

                .btn-danger:hover {
                    background: #da190b;
                }

                @media (max-width: 768px) {
                    .player-content {
                        padding: 12px;
                    }

                    .library-icon {
                        font-size: 36px;
                    }

                    .library-name {
                        font-size: 18px;
                    }

                    .text-display {
                        font-size: 24px;
                    }
                }
            `}</style>
        </div>
    );
}
