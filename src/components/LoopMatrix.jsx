/**
 * LoopMatrix Component
 * Configure multi-stage repetition with independent speeds
 */
import { useState } from 'react';

const MAX_SPEED = 10.0;
const MIN_SPEED = 0.1;

export default function LoopMatrix({
    config = [{ speed: 1.0 }],
    onChange,
    maxStages = 10
}) {
    const [stages, setStages] = useState(config);

    const handleSpeedChange = (index, speed) => {
        let value = parseFloat(speed);
        if (isNaN(value)) value = 1.0;
        value = Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));

        const newStages = [...stages];
        newStages[index] = { ...newStages[index], speed: value };
        setStages(newStages);
        onChange?.(newStages);
    };

    const addStage = () => {
        if (stages.length >= maxStages) return;
        const lastSpeed = stages[stages.length - 1]?.speed || 1.0;
        const newStages = [...stages, { speed: lastSpeed }];
        setStages(newStages);
        onChange?.(newStages);
    };

    const removeStage = (index) => {
        if (stages.length <= 1) return;
        const newStages = stages.filter((_, i) => i !== index);
        setStages(newStages);
        onChange?.(newStages);
    };

    return (
        <div className="loop-matrix-config">
            <div className="flex items-center justify-between mb-md">
                <h4>播放矩陣</h4>
                <button
                    className="btn btn-ghost"
                    onClick={addStage}
                    disabled={stages.length >= maxStages}
                >
                    ➕ 新增
                </button>
            </div>

            <div className="loop-stages-list">
                {stages.map((stage, index) => (
                    <div key={index} className="loop-stage-config card flex items-center gap-md">
                        <div className="loop-stage-number">
                            第 {index + 1} 次
                        </div>

                        <div className="flex items-center gap-sm" style={{ flex: 1 }}>
                            <input
                                type="range"
                                min={MIN_SPEED}
                                max={MAX_SPEED}
                                step="0.1"
                                value={stage.speed}
                                onChange={(e) => handleSpeedChange(index, e.target.value)}
                                className="slider"
                                style={{ flex: 1 }}
                            />
                            <span style={{ minWidth: '45px', textAlign: 'right', fontSize: 'var(--font-size-sm)' }}>
                                {stage.speed.toFixed(1)}x
                            </span>
                        </div>

                        {stages.length > 1 && (
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => removeStage(index)}
                                style={{ fontSize: '16px', padding: '8px' }}
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-muted mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                設定重複次數和每次的播放速度。例如：1x → 3x → 5x → 1x
            </p>
        </div>
    );
}
