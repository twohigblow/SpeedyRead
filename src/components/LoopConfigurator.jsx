/**
 * Loop Configurator Component
 * 
 * Allows users to configure multiple loops with different speeds,
 * volumes, and pitch settings for each repeat.
 */

import { useState } from 'react';

const SPEED_OPTIONS = [0.5, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
const PITCH_OPTIONS = [-12, -8, -5, -3, -2, -1, 0, 1, 2, 3, 5, 8, 12];

export default function LoopConfigurator({ loops = [], onChange, sleepMode = false }) {
    const [expanded, setExpanded] = useState(null);

    const handleAddLoop = () => {
        const lastLoop = loops[loops.length - 1] || { speed: 1.0, volume: 80, pitch: 0 };
        const newLoop = { ...lastLoop };
        onChange([...loops, newLoop]);
    };

    const handleRemoveLoop = (index) => {
        if (loops.length <= 1) return;
        const updated = loops.filter((_, i) => i !== index);
        onChange(updated);
    };

    const handleUpdateLoop = (index, field, value) => {
        const updated = [...loops];
        updated[index] = { ...updated[index], [field]: parseFloat(value) };
        onChange(updated);
    };

    const toggleExpand = (index) => {
        setExpanded(expanded === index ? null : index);
    };

    // Visual indicator for sleep mode
    const getLoopStyle = (loop, index) => {
        if (!sleepMode) return {};

        // Visual fade effect for sleep mode
        const opacity = 1 - (index / loops.length) * 0.3;
        return {
            opacity,
            background: `linear-gradient(135deg, rgba(103, 58, 183, ${opacity * 0.1}), rgba(63, 81, 181, ${opacity * 0.1}))`
        };
    };

    return (
        <div className="loop-configurator">
            {/* Header */}
            <div className="flex items-center justify-between mb-md">
                <h4>🔁 Loop Configuration</h4>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleAddLoop}
                    disabled={loops.length >= 10}
                >
                    ➕ Add Loop
                </button>
            </div>

            {/* Sleep Mode Warning */}
            {sleepMode && (
                <div className="alert alert-info mb-md">
                    <span className="alert-icon">🌙</span>
                    <div>
                        <strong>Sleep Mode Active</strong>
                        <p>Speed capped at 1.2x, auto pitch/volume decay enabled</p>
                    </div>
                </div>
            )}

            {/* Loop List */}
            <div className="loop-list">
                {loops.map((loop, index) => (
                    <div
                        key={index}
                        className="loop-item card"
                        style={getLoopStyle(loop, index)}
                    >
                        {/* Loop Header */}
                        <div
                            className="loop-header"
                            onClick={() => toggleExpand(index)}
                        >
                            <div className="loop-number">
                                Loop {index + 1}
                            </div>

                            <div className="loop-summary">
                                <span className="speed-badge">{loop.speed}x</span>
                                {loop.volume !== 80 && (
                                    <span className="volume-badge">🔊 {loop.volume}%</span>
                                )}
                                {loop.pitch !== 0 && (
                                    <span className="pitch-badge">
                                        🎵 {loop.pitch > 0 ? '+' : ''}{loop.pitch}
                                    </span>
                                )}
                            </div>

                            <div className="loop-actions">
                                <button
                                    className="btn btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(index);
                                    }}
                                >
                                    {expanded === index ? '▼' : '▶'}
                                </button>

                                {loops.length > 1 && (
                                    <button
                                        className="btn btn-icon btn-danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveLoop(index);
                                        }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Loop Details (Expanded) */}
                        {expanded === index && (
                            <div className="loop-details">
                                {/* Speed Control */}
                                <div className="control-group">
                                    <label>
                                        <span className="label-text">Speed</span>
                                        <span className="label-value">{loop.speed}x</span>
                                    </label>
                                    <div className="control-row">
                                        <input
                                            type="range"
                                            min="0.5"
                                            max={sleepMode ? "1.2" : "3.0"}
                                            step="0.1"
                                            value={loop.speed}
                                            onChange={(e) => handleUpdateLoop(index, 'speed', e.target.value)}
                                            className="slider"
                                        />
                                        <select
                                            value={loop.speed}
                                            onChange={(e) => handleUpdateLoop(index, 'speed', e.target.value)}
                                            className="input input-sm"
                                            style={{ width: '80px' }}
                                        >
                                            {SPEED_OPTIONS.map(s => (
                                                <option key={s} value={s} disabled={sleepMode && s > 1.2}>
                                                    {s}x
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Volume Control */}
                                <div className="control-group">
                                    <label>
                                        <span className="label-text">Volume</span>
                                        <span className="label-value">{loop.volume}%</span>
                                    </label>
                                    <div className="control-row">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={loop.volume}
                                            onChange={(e) => handleUpdateLoop(index, 'volume', e.target.value)}
                                            className="slider"
                                        />
                                    </div>
                                </div>

                                {/* Pitch Control */}
                                <div className="control-group">
                                    <label>
                                        <span className="label-text">Pitch</span>
                                        <span className="label-value">
                                            {loop.pitch > 0 ? '+' : ''}{loop.pitch} semitones
                                        </span>
                                    </label>
                                    <div className="control-row">
                                        <input
                                            type="range"
                                            min="-12"
                                            max="12"
                                            step="1"
                                            value={loop.pitch}
                                            onChange={(e) => handleUpdateLoop(index, 'pitch', e.target.value)}
                                            className="slider"
                                        />
                                        <select
                                            value={loop.pitch}
                                            onChange={(e) => handleUpdateLoop(index, 'pitch', e.target.value)}
                                            className="input input-sm"
                                            style={{ width: '80px' }}
                                        >
                                            {PITCH_OPTIONS.map(p => (
                                                <option key={p} value={p}>
                                                    {p > 0 ? '+' : ''}{p}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Sleep Mode Impact Preview */}
                                {sleepMode && (
                                    <div className="sleep-preview">
                                        <small>
                                            💤 Sleep adjustments applied:<br />
                                            Final pitch: {Math.max(loop.pitch - (index * 2), -12)} |
                                            Final volume: ~{Math.round(loop.volume * (1 - index * 0.1))}%
                                        </small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Presets */}
            <div className="presets-section mt-md">
                <label className="label-text mb-sm">Quick Presets:</label>
                <div className="preset-buttons">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onChange([
                            { speed: 1.5, volume: 80, pitch: 0 },
                            { speed: 1.2, volume: 80, pitch: 0 },
                            { speed: 1.0, volume: 80, pitch: 0 }
                        ])}
                    >
                        🏃 Fast → Slow
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onChange([
                            { speed: 1.0, volume: 80, pitch: 0 },
                            { speed: 1.5, volume: 80, pitch: 0 },
                            { speed: 2.0, volume: 80, pitch: 0 }
                        ])}
                    >
                        🚀 Slow → Fast
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onChange([
                            { speed: 1.0, volume: 100, pitch: 0 },
                            { speed: 1.0, volume: 70, pitch: -2 },
                            { speed: 0.9, volume: 50, pitch: -5 }
                        ])}
                    >
                        🌙 Sleep Mode
                    </button>
                </div>
            </div>

            <style jsx>{`
                .loop-configurator {
                    background: var(--bg-secondary, #f9f9f9);
                    padding: 16px;
                    border-radius: 8px;
                }

                .loop-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .loop-item {
                    overflow: hidden;
                    transition: all 0.2s;
                }

                .loop-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    cursor: pointer;
                    user-select: none;
                }

                .loop-header:hover {
                    background: rgba(0,0,0,0.02);
                }

                .loop-number {
                    font-weight: 600;
                    min-width: 60px;
                }

                .loop-summary {
                    flex: 1;
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .speed-badge,
                .volume-badge,
                .pitch-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .speed-badge {
                    background: #4CAF50;
                    color: white;
                }

                .volume-badge {
                    background: #FF9800;
                    color: white;
                }

                .pitch-badge {
                    background: #2196F3;
                    color: white;
                }

                .loop-actions {
                    display: flex;
                    gap: 4px;
                }

                .loop-details {
                    padding: 16px;
                    border-top: 1px solid var(--border-color, #ddd);
                    background: rgba(0,0,0,0.02);
                }

                .control-group {
                    margin-bottom: 16px;
                }

                .control-group:last-child {
                    margin-bottom: 0;
                }

                .control-group label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }

                .label-text {
                    font-weight: 600;
                }

                .label-value {
                    color: var(--primary-color, #4CAF50);
                    font-weight: 600;
                }

                .control-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .slider {
                    flex: 1;
                }

                .sleep-preview {
                    margin-top: 12px;
                    padding: 8px;
                    background: rgba(103, 58, 183, 0.1);
                    border-radius: 4px;
                    font-size: 12px;
                    color: #673AB7;
                }

                .presets-section {
                    border-top: 1px solid var(--border-color, #ddd);
                    padding-top: 16px;
                }

                .preset-buttons {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .alert {
                    display: flex;
                    gap: 8px;
                    padding: 12px;
                    border-radius: 6px;
                }

                .alert-info {
                    background: #E3F2FD;
                    border: 1px solid #2196F3;
                }

                .alert-icon {
                    font-size: 20px;
                }

                .alert p {
                    margin: 4px 0 0 0;
                    font-size: 13px;
                    color: #666;
                }

                @media (max-width: 768px) {
                    .preset-buttons {
                        flex-direction: column;
                    }

                    .preset-buttons button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
