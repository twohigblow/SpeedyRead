/**
 * Reader Page
 * Main reading interface with player, recording, and calibration
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getText, getSettings, getRecordings, createRecording, updateText } from '../services/db';
import { calibrateTiming, saveTimingToText, needsCalibration } from '../services/calibration';
import Player from '../components/Player';
import LoopMatrix from '../components/LoopMatrix';
import RecordingPanel from '../components/RecordingPanel';

export default function Reader() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [text, setText] = useState(null);
    const [settings, setSettings] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [loopConfig, setLoopConfig] = useState([{ speed: 1.0 }]);
    const [activeRecording, setActiveRecording] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [showRecording, setShowRecording] = useState(false);
    const [loading, setLoading] = useState(true);

    // Calibration state
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationProgress, setCalibrationProgress] = useState(0);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [textData, settingsData, recordingsData] = await Promise.all([
                getText(parseInt(id)),
                getSettings(),
                getRecordings(parseInt(id))
            ]);

            if (!textData) {
                navigate('/library');
                return;
            }

            setText(textData);
            setSettings(settingsData);
            setRecordings(recordingsData);
            setLoopConfig(settingsData.loopConfig || [{ speed: 1.0 }]);
        } catch (err) {
            console.error('Failed to load text:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCalibrate = async () => {
        if (isCalibrating) return;

        setIsCalibrating(true);
        setCalibrationProgress(0);

        try {
            const timing = await calibrateTiming(
                text.content,
                settings?.voiceUri,
                {
                    onProgress: (p) => setCalibrationProgress(p),
                    onStart: () => console.log('Calibration started'),
                    onEnd: () => console.log('Calibration complete')
                }
            );

            if (timing) {
                // Save timing to database
                await saveTimingToText(text.id, timing);
                // Reload text to get updated timing
                const updatedText = await getText(text.id);
                setText(updatedText);
                console.log('Timing saved:', timing);
            }
        } catch (err) {
            console.error('Calibration failed:', err);
        } finally {
            setIsCalibrating(false);
            setCalibrationProgress(0);
        }
    };

    const handleRecordingSaved = async (recordingData) => {
        try {
            await createRecording({
                textId: parseInt(id),
                audioBlob: recordingData.audioBlob,
                duration: recordingData.duration
            });
            loadData();
            setShowRecording(false);
        } catch (err) {
            console.error('Failed to save recording:', err);
        }
    };

    const handleEditTitle = async () => {
        const newTitle = window.prompt('輸入新標題:', text.title);
        if (newTitle && newTitle !== text.title) {
            await updateText(text.id, { title: newTitle });
            loadData();
        }
    };

    // Check if calibration is needed
    const showCalibrationNeeded = text && needsCalibration(text, settings?.voiceUri);
    const hasCalibration = text?.timing?.chars?.length > 0;

    if (loading) {
        return (
            <div className="page">
                <div className="container text-center">
                    <div className="loading-spinner" style={{ margin: 'var(--space-2xl) auto' }}></div>
                </div>
            </div>
        );
    }

    if (!text) {
        return (
            <div className="page">
                <div className="container text-center">
                    <p className="text-muted">找不到文字</p>
                    <Link to="/library" className="btn btn-primary mt-md">返回書庫</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <Link to="/library" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <h1
                        className="page-title"
                        style={{ flex: 1, fontSize: 'var(--font-size-xl)', cursor: 'pointer' }}
                        onClick={handleEditTitle}
                    >
                        {text.title || '未命名'}
                    </h1>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setShowConfig(!showConfig)}
                    >
                        ⚙️
                    </button>
                </div>

                {/* Player */}
                <Player
                    text={text.content}
                    recording={activeRecording?.audioBlob}
                    loopConfig={loopConfig}
                    ttsMode={settings?.ttsMode}
                    voiceUri={settings?.voiceUri}
                    englishVoiceUri={settings?.englishVoiceUri}
                    googleTtsApiKey={settings?.googleTtsApiKey}
                    googleVoiceType={settings?.googleVoiceType}
                    googleChineseVoice={settings?.googleChineseVoice}
                    googleEnglishVoice={settings?.googleEnglishVoice}
                    timing={text?.timing}
                />

                {/* Config Panel (expandable) */}
                {showConfig && (
                    <div className="card mt-md">
                        <LoopMatrix
                            config={loopConfig}
                            onChange={setLoopConfig}
                        />
                    </div>
                )}

                {/* Mode Toggle: 朗讀 vs 閃卡 */}
                <div className="flex gap-md mt-lg">
                    <Link
                        to={`/reader/${text.id}`}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                    >
                        🔊 朗讀
                    </Link>
                    <Link
                        to={`/flashcard/${text.id}`}
                        className="btn btn-ghost"
                        style={{ flex: 1 }}
                    >
                        🗂️ 閃卡
                    </Link>
                </div>

                {/* Recording Toggle */}
                <div className="flex gap-md mt-md">
                    <button
                        className={`btn ${activeRecording ? 'btn-ghost' : 'btn-secondary'}`}
                        onClick={() => setActiveRecording(null)}
                        style={{ flex: 1 }}
                    >
                        TTS 語音
                    </button>
                    <button
                        className={`btn ${showRecording ? 'btn-secondary' : 'btn-ghost'}`}
                        onClick={() => setShowRecording(!showRecording)}
                        style={{ flex: 1 }}
                    >
                        🎙️ 錄音
                    </button>
                </div>

                {/* Recording Panel */}
                {showRecording && (
                    <div className="mt-md">
                        <RecordingPanel
                            textId={text.id}
                            onRecordingSaved={handleRecordingSaved}
                        />
                    </div>
                )}

                {/* Saved Recordings */}
                {recordings.length > 0 && (
                    <div className="mt-lg">
                        <h4 className="mb-md">已儲存的錄音</h4>
                        <div className="recordings-list">
                            {recordings.map((rec, index) => (
                                <div
                                    key={rec.id}
                                    className={`card card-interactive mb-sm flex items-center gap-md ${activeRecording?.id === rec.id ? 'active' : ''
                                        }`}
                                    style={{
                                        borderColor: activeRecording?.id === rec.id ? 'var(--color-secondary)' : undefined
                                    }}
                                    onClick={() => setActiveRecording(rec)}
                                >
                                    <span>🎙️</span>
                                    <div style={{ flex: 1 }}>
                                        <div>錄音 #{index + 1}</div>
                                        <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {Math.round(rec.duration)}秒
                                        </div>
                                    </div>
                                    {activeRecording?.id === rec.id && (
                                        <span className="tag" style={{ background: 'var(--color-secondary)' }}>
                                            播放中
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Text Content View */}
                <details className="mt-lg">
                    <summary className="text-muted" style={{ cursor: 'pointer' }}>
                        查看完整文字
                    </summary>
                    <div className="card mt-sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {text.content}
                    </div>
                </details>
            </div>
        </div>
    );
}
