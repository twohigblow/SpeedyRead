/**
 * FlashCard Page
 * Display text as flashcards with TTS pronunciation
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getText, getSettings, updateSettings } from '../services/db';
import { splitIntoCards, getFontSizeValue, FONT_FAMILIES, FONT_SIZES } from '../utils/flashcard-utils';
import { speak as speakOffline, stop as stopOffline } from '../services/tts';
import { synthesizeWithTimestamps } from '../services/google-tts';

export default function FlashCard() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [text, setText] = useState(null);
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentLoop, setCurrentLoop] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [settings, setSettings] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(true);

    // Local settings (can be different from global settings)
    const [flashSpeed, setFlashSpeed] = useState(2.0);
    const [ttsSpeed, setTtsSpeed] = useState(1.0);
    const [fontSize, setFontSize] = useState(48);
    const [font, setFont] = useState('system');
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [autoPlay, setAutoPlay] = useState(true);
    const [maxLoops, setMaxLoops] = useState(1);
    const [autoPlayVoice, setAutoPlayVoice] = useState(false);
    const [error, setError] = useState(null);

    const timerRef = useRef(null);
    const abortRef = useRef(false);

    useEffect(() => {
        loadData();
        return () => {
            stopPlayback();
        };
    }, [id]);

    const loadData = async () => {
        try {
            const [textData, settingsData] = await Promise.all([
                getText(parseInt(id)),
                getSettings()
            ]);

            if (!textData) {
                navigate('/library');
                return;
            }

            setText(textData);
            setSettings(settingsData);

            // Load settings
            setFlashSpeed(settingsData.flashSpeed || 2.0);
            setTtsSpeed(settingsData.flashTtsSpeed || 1.0);
            setFontSize(settingsData.flashFontSize || 48);
            setFont(settingsData.flashFont || 'system');
            setTtsEnabled(settingsData.flashTtsEnabled !== false);
            setAutoPlay(settingsData.flashAutoPlay !== false);
            setMaxLoops(settingsData.flashLoops || 1);
            setAutoPlayVoice(settingsData.flashAutoPlayVoice || false);

            // Split text into cards
            const cardArray = splitIntoCards(textData.content);
            setCards(cardArray);
        } catch (err) {
            console.error('Failed to load text:', err);
        } finally {
            setLoading(false);
        }
    };

    const stopPlayback = () => {
        abortRef.current = true;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        stopOffline();
        setIsPlaying(false);
    };

    const pronounceCard = async (cardText) => {
        if (!ttsEnabled || !cardText) return;

        try {
            const useGoogleTTS = settings?.ttsMode === 'online' && settings?.googleTtsApiKey;

            if (useGoogleTTS) {
                // Use Google TTS
                const isChinese = /[\u4e00-\u9fff]/.test(cardText);
                const result = await synthesizeWithTimestamps(
                    cardText,
                    settings.googleTtsApiKey,
                    {
                        voiceType: settings.googleVoiceType,
                        speed: ttsSpeed,
                        chineseVoice: isChinese ? settings.googleChineseVoice : null,
                        englishVoice: !isChinese ? settings.googleEnglishVoice : null
                    }
                );

                // Convert base64 to Blob URL for better iOS compatibility
                // LINEAR16 format from Google TTS is PCM audio (WAV)
                const byteCharacters = atob(result.audioContent);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const audioBlob = new Blob([byteArray], { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);

                const audio = new Audio(audioUrl);

                // Wait for audio to load (critical for iOS)
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.warn('Flashcard audio loading timeout, attempting to play anyway');
                        resolve();
                    }, 3000);

                    audio.onloadeddata = () => {
                        clearTimeout(timeout);
                        console.log('Flashcard audio loaded successfully');
                        resolve();
                    };

                    audio.onerror = (e) => {
                        clearTimeout(timeout);
                        console.error('Flashcard audio loading error:', e);
                        reject(new Error('Failed to load audio'));
                    };

                    // iOS fallback - canplay event
                    audio.oncanplay = () => {
                        clearTimeout(timeout);
                        console.log('Flashcard audio can play');
                        resolve();
                    };
                });

                // Play with cleanup
                try {
                    console.log('Attempting to play flashcard audio...');
                    await audio.play();
                    console.log('Flashcard audio playing successfully');
                    // Clean up after playback
                    audio.onended = () => {
                        console.log('Flashcard audio ended, cleaning up');
                        URL.revokeObjectURL(audioUrl);
                    };
                } catch (playError) {
                    console.error('Flashcard audio play failed:', playError);
                    URL.revokeObjectURL(audioUrl);
                    throw playError;
                }
            } else {
                // Use Web Speech API
                await speakOffline(cardText, {
                    voiceUri: settings?.voiceUri,
                    rate: ttsSpeed
                });
            }
        } catch (err) {
            console.error('TTS failed:', err);
            const errorMsg = `Flashcard TTS Error (${settings?.ttsMode || 'unknown'}): ${err.message || err}`;
            setError(errorMsg);
            // Show error for 10 seconds
            setTimeout(() => setError(null), 10000);
        }
    };

    const playCard = async (index) => {
        if (index < 0 || index >= cards.length) return;

        setCurrentIndex(index);
        await pronounceCard(cards[index]);
    };

    const playAllCards = useCallback(async () => {
        abortRef.current = false;
        setIsPlaying(true);

        for (let i = currentIndex; i < cards.length; i++) {
            if (abortRef.current) break;

            await playCard(i);

            if (abortRef.current || !autoPlay || i === cards.length - 1) break;

            // Wait for flash speed delay
            await new Promise(resolve => {
                timerRef.current = setTimeout(resolve, flashSpeed * 1000);
            });
        }

        setIsPlaying(false);
    }, [cards, currentIndex, flashSpeed, autoPlay]);

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            if (autoPlayVoice && ttsEnabled) {
                pronounceCard(cards[nextIndex]);
            }
        } else {
            // At last card - loop back to first if more loops remaining
            if (currentLoop < maxLoops) {
                setCurrentIndex(0);
                setCurrentLoop(prev => prev + 1);
                if (autoPlayVoice && ttsEnabled) {
                    pronounceCard(cards[0]);
                }
            }
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            if (autoPlayVoice && ttsEnabled) {
                pronounceCard(cards[prevIndex]);
            }
        }
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            if (autoPlay) {
                playAllCards();
            } else {
                playCard(currentIndex);
            }
        }
    };

    const saveCurrentSettings = async () => {
        await updateSettings({
            flashSpeed,
            flashTtsSpeed: ttsSpeed,
            flashFontSize: fontSize,
            flashFont: font,
            flashTtsEnabled: ttsEnabled,
            flashAutoPlay: autoPlay,
            flashLoops: maxLoops,
            flashAutoPlayVoice: autoPlayVoice
        });
    };

    useEffect(() => {
        // Auto-save settings when changed
        if (settings) {
            saveCurrentSettings();
        }
    }, [flashSpeed, ttsSpeed, fontSize, font, ttsEnabled, autoPlay, maxLoops, autoPlayVoice]);

    if (loading) {
        return (
            <div className="page">
                <div className="container text-center">
                    <div className="loading-spinner" style={{ margin: 'var(--space-2xl) auto' }}></div>
                </div>
            </div>
        );
    }

    if (!text || cards.length === 0) {
        return (
            <div className="page">
                <div className="container text-center">
                    <p className="text-muted">沒有可用的閃卡</p>
                    <Link to={`/reader/${id}`} className="btn btn-primary mt-md">返回朗讀</Link>
                </div>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <Link to={`/reader/${id}`} className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <h1 className="page-title" style={{ flex: 1, fontSize: 'var(--font-size-xl)' }}>
                        閃卡 - {text.title || '未命名'}
                    </h1>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        ⚙️
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div style={{
                        background: '#ff4444',
                        color: 'white',
                        padding: 'var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-md)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        <strong>⚠️ Error:</strong> {error}
                    </div>
                )}

                {/* Settings Panel */}
                {showSettings && (
                    <div className="card mb-md flashcard-settings-panel">
                        <h3 className="mb-md">閃卡設定</h3>

                        {/* Flash Speed */}
                        <div className="mb-md">
                            <label className="label">閃卡速度: {flashSpeed.toFixed(1)}秒</label>
                            <input
                                type="range"
                                min="0.5"
                                max="5"
                                step="0.1"
                                value={flashSpeed}
                                onChange={(e) => setFlashSpeed(parseFloat(e.target.value))}
                                className="slider"
                            />
                        </div>

                        {/* TTS Speed */}
                        <div className="mb-md">
                            <label className="label">語音速度: {ttsSpeed.toFixed(1)}x</label>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={ttsSpeed}
                                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                                className="slider"
                            />
                        </div>

                        {/* Font Size */}
                        <div className="mb-md">
                            <label className="label">字體大小</label>
                            <select
                                className="input"
                                value={fontSize}
                                onChange={(e) => setFontSize(e.target.value)}
                            >
                                {FONT_SIZES.map(size => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Font Family */}
                        <div className="mb-md">
                            <label className="label">字體</label>
                            <select
                                className="input"
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                            >
                                {FONT_FAMILIES.map(font => (
                                    <option key={font.value} value={font.value}>{font.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* TTS Toggle */}
                        <div className="mb-md flex items-center gap-md">
                            <label className="label" style={{ marginBottom: 0 }}>啟用語音</label>
                            <input
                                type="checkbox"
                                checked={ttsEnabled}
                                onChange={(e) => setTtsEnabled(e.target.checked)}
                                style={{ width: 'auto' }}
                            />
                        </div>

                        {/* Auto-play Toggle */}
                        <div className="flex items-center gap-md">
                            <label className="label" style={{ marginBottom: 0 }}>自動播放</label>
                            <input
                                type="checkbox"
                                checked={autoPlay}
                                onChange={(e) => setAutoPlay(e.target.checked)}
                                style={{ width: 'auto' }}
                            />
                        </div>
                    </div>
                )}

                {/* Progress */}
                <div className="flashcard-progress mb-md">
                    <span className="text-muted">
                        {currentIndex + 1} / {cards.length} {maxLoops > 1 && `(Loop ${currentLoop}/${maxLoops})`}
                    </span>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Flashcard Display */}
                <div
                    className="flashcard-display card"
                    style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: font === 'kai' ? "'Free HK Kai', serif" : 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    {currentCard}
                </div>

                {/* Controls */}
                <div className="flashcard-controls mt-lg">
                    <div className="flex gap-md mb-md">
                        <button
                            className="btn btn-ghost"
                            onClick={handlePrevious}
                            disabled={currentIndex === 0 || isPlaying}
                            style={{ flex: 1 }}
                        >
                            ← 上一張
                        </button>
                        <button
                            className="btn btn-ghost"
                            onClick={handleNext}
                            disabled={isPlaying}
                            style={{ flex: 1 }}
                        >
                            下一張 →
                        </button>
                    </div>

                    <button
                        className="btn btn-primary btn-large"
                        onClick={handlePlayPause}
                        style={{ width: '100%' }}
                    >
                        {isPlaying ? '⏸️ 暫停' : '▶️ 播放'}
                    </button>
                </div>
            </div>
        </div>
    );
}
