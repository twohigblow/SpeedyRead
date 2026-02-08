/**
 * Settings Page
 * User preferences, voice selection, API key, and data management
 */
import { useState, useEffect } from 'react';
import { getSettings, updateSettings, exportData, importData, clearAllData } from '../services/db';
import { testApiKey, VOICE_TYPES } from '../services/google-tts';
import { testGeminiApiKey } from '../services/ocr';
import VoiceSelector from '../components/VoiceSelector';
import LoopMatrix from '../components/LoopMatrix';

export default function Settings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
    const [googleKeyTesting, setGoogleKeyTesting] = useState(false);
    const [geminiKeyTesting, setGeminiKeyTesting] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const s = await getSettings();
        setSettings(s);
        setLoading(false);
    };

    const handleUpdate = async (key, value) => {
        const updated = await updateSettings({ [key]: value });
        setSettings(updated);
        showMessage('已儲存');
    };

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(null), 2000);
    };

    const handleExport = async () => {
        try {
            const data = await exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `speedyread-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showMessage('匯出成功');
        } catch (err) {
            showMessage('匯出失敗: ' + err.message);
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await importData(data);
            showMessage(`匯入成功: ${result.textsImported} 個文字, ${result.categoriesImported} 個分類`);
        } catch (err) {
            showMessage('匯入失敗: ' + err.message);
        }
    };

    const handleClearData = async () => {
        if (window.confirm('確定要清除所有資料嗎？此操作無法復原！')) {
            if (window.confirm('再次確認：所有文字、錄音和設定都會被刪除！')) {
                await clearAllData();
                loadSettings();
                showMessage('已清除所有資料');
            }
        }
    };

    const handleTestGoogleKey = async () => {
        if (!settings.googleTtsApiKey) {
            showMessage('請先輸入 API 金鑰');
            return;
        }
        setGoogleKeyTesting(true);
        try {
            const valid = await testApiKey(settings.googleTtsApiKey);
            showMessage(valid ? '✅ API 金鑰有效' : '❌ API 金鑰無效');
        } catch {
            showMessage('❌ 測試失敗');
        } finally {
            setGoogleKeyTesting(false);
        }
    };

    const handleTestGeminiKey = async () => {
        if (!settings.geminiApiKey) {
            showMessage('請先輸入 Gemini API 金鑰');
            return;
        }
        setGeminiKeyTesting(true);
        try {
            const result = await testGeminiApiKey(settings.geminiApiKey);
            if (result.valid) {
                showMessage('✅ Gemini API 金鑰有效');
            } else {
                showMessage(`❌ 金鑰無效: ${result.error || '未知錯誤'}`);
            }
        } catch (err) {
            showMessage(`❌ 測試失敗: ${err.message}`);
        } finally {
            setGeminiKeyTesting(false);
        }
    };

    if (loading || !settings) {
        return (
            <div className="page">
                <div className="container text-center">
                    <div className="loading-spinner" style={{ margin: 'var(--space-2xl) auto' }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">⚙️ 設定</h1>
                </div>

                {/* TTS Mode Toggle */}
                <section className="card mb-md">
                    <h3 className="mb-md">🎙️ TTS 模式</h3>
                    <div className="flex flex-wrap gap-md mb-sm">
                        <button
                            className={`btn ${settings.ttsMode === 'offline' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleUpdate('ttsMode', 'offline')}
                            style={{ flex: '1 1 auto', minWidth: '140px' }}
                        >
                            📱 離線
                        </button>
                        <button
                            className={`btn ${settings.ttsMode === 'online' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleUpdate('ttsMode', 'online')}
                            style={{ flex: '1 1 auto', minWidth: '140px' }}
                        >
                            ☁️ 線上
                        </button>
                    </div>
                    <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {settings.ttsMode === 'offline'
                            ? '使用裝置內建語音，可離線使用'
                            : '使用 Google Cloud TTS，精準卡拉OK同步'
                        }
                    </p>
                </section>

                {/* Offline Mode Settings */}
                {settings.ttsMode === 'offline' && (
                    <>
                        <section className="card mb-md">
                            <h3 className="mb-md">📱 中文語音 (Offline)</h3>
                            <VoiceSelector
                                selectedVoiceUri={settings.voiceUri}
                                language={settings.language}
                                onChange={(uri) => handleUpdate('voiceUri', uri)}
                            />
                        </section>

                        <section className="card mb-md">
                            <h3 className="mb-md">📱 英文語音 (Offline)</h3>
                            <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
                                Auto-selected when text is primarily English
                            </p>
                            <VoiceSelector
                                selectedVoiceUri={settings.englishVoiceUri}
                                language="en-US"
                                onChange={(uri) => handleUpdate('englishVoiceUri', uri)}
                            />
                        </section>
                    </>
                )}

                {/* Online Mode Settings */}
                {settings.ttsMode === 'online' && (
                    <section className="card mb-md">
                        <h3 className="mb-md">☁️ Google Cloud TTS</h3>

                        {/* API Key */}
                        <div className="mb-md">
                            <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                                API 金鑰
                                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
                                    style={{ color: 'var(--color-primary)', marginLeft: '8px' }}>設定指南 →</a>
                            </label>
                            <div className="flex gap-sm">
                                <input
                                    type={showGoogleApiKey ? 'text' : 'password'}
                                    className="input"
                                    placeholder="輸入 Google Cloud API 金鑰..."
                                    value={settings.googleTtsApiKey || ''}
                                    onChange={(e) => handleUpdate('googleTtsApiKey', e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setShowGoogleApiKey(!showGoogleApiKey)}
                                >
                                    {showGoogleApiKey ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Voice Quality */}
                        <div className="mb-md">
                            <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                                語音品質
                            </label>
                            <div className="flex flex-wrap gap-sm">
                                {VOICE_TYPES.map(type => (
                                    <button
                                        key={type}
                                        className={`btn ${settings.googleVoiceType === type ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => handleUpdate('googleVoiceType', type)}
                                        style={{ flex: '1 1 auto', minWidth: '90px' }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                                配額用盡時自動降級
                            </p>
                        </div>

                        {/* Chinese Voice */}
                        <div className="mb-md">
                            <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                                中文語音
                            </label>
                            <select
                                className="input"
                                value={settings.googleChineseVoice || 'yue-HK-Standard-A'}
                                onChange={(e) => handleUpdate('googleChineseVoice', e.target.value)}
                            >
                                <optgroup label="粵語 Cantonese">
                                    <option value="yue-HK-Standard-A">yue-HK-Standard-A (Female)</option>
                                    <option value="yue-HK-Standard-B">yue-HK-Standard-B (Male)</option>
                                    <option value="yue-HK-Standard-C">yue-HK-Standard-C (Female)</option>
                                    <option value="yue-HK-Standard-D">yue-HK-Standard-D (Male)</option>
                                </optgroup>
                                <optgroup label="普通話 Mandarin">
                                    <option value="cmn-CN-Standard-A">cmn-CN-Standard-A (Female)</option>
                                    <option value="cmn-CN-Standard-B">cmn-CN-Standard-B (Male)</option>
                                    <option value="cmn-CN-Wavenet-A">cmn-CN-Wavenet-A (Female)</option>
                                    <option value="cmn-CN-Wavenet-B">cmn-CN-Wavenet-B (Male)</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* English Voice */}
                        <div className="mb-md">
                            <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                                英文語音
                            </label>
                            <select
                                className="input"
                                value={settings.googleEnglishVoice || 'en-US-Neural2-F'}
                                onChange={(e) => handleUpdate('googleEnglishVoice', e.target.value)}
                            >
                                <optgroup label="Neural2 (Best)">
                                    <option value="en-US-Neural2-A">en-US-Neural2-A (Male)</option>
                                    <option value="en-US-Neural2-C">en-US-Neural2-C (Female)</option>
                                    <option value="en-US-Neural2-D">en-US-Neural2-D (Male)</option>
                                    <option value="en-US-Neural2-F">en-US-Neural2-F (Female)</option>
                                </optgroup>
                                <optgroup label="WaveNet">
                                    <option value="en-US-Wavenet-A">en-US-Wavenet-A (Male)</option>
                                    <option value="en-US-Wavenet-C">en-US-Wavenet-C (Female)</option>
                                    <option value="en-US-Wavenet-D">en-US-Wavenet-D (Male)</option>
                                    <option value="en-US-Wavenet-F">en-US-Wavenet-F (Female)</option>
                                </optgroup>
                                <optgroup label="Standard">
                                    <option value="en-US-Standard-A">en-US-Standard-A (Male)</option>
                                    <option value="en-US-Standard-C">en-US-Standard-C (Female)</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Test Button */}
                        <button
                            className="btn btn-ghost"
                            onClick={handleTestGoogleKey}
                            disabled={googleKeyTesting || !settings.googleTtsApiKey}
                            style={{ width: '100%' }}
                        >
                            {googleKeyTesting ? '測試中...' : '🔍 測試 API 金鑰'}
                        </button>
                    </section>
                )}

                {/* Default Loop Config */}
                <section className="card mb-md">
                    <h3 className="mb-md">預設播放設定</h3>
                    <LoopMatrix
                        config={settings.loopConfig}
                        onChange={(config) => handleUpdate('loopConfig', config)}
                    />
                </section>

                {/* Flashcard Settings */}
                <section className="card mb-md">
                    <h3 className="mb-md">🗂️ 閃卡設定</h3>

                    {/* Font Selection */}
                    <div className="mb-md">
                        <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                            字體
                        </label>
                        <div className="flex gap-sm">
                            <button
                                className={`btn ${settings.flashFont === 'system' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleUpdate('flashFont', 'system')}
                                style={{ flex: 1 }}
                            >
                                系統字體
                            </button>
                            <button
                                className={`btn ${settings.flashFont === 'kai' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleUpdate('flashFont', 'kai')}
                                style={{ flex: 1, fontFamily: "'Free HK Kai', serif" }}
                            >
                                楷書
                            </button>
                        </div>
                    </div>

                    {/* Font Size Slider */}
                    <div className="mb-md">
                        <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                            字體大小: {settings.flashFontSize}px
                        </label>
                        <input
                            type="range"
                            min="24"
                            max="200"
                            step="4"
                            value={settings.flashFontSize}
                            onChange={(e) => handleUpdate('flashFontSize', parseInt(e.target.value))}
                            className="slider"
                            style={{ width: '100%' }}
                        />
                        <div className="flex" style={{ justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            <span>24px</span>
                            <span>200px</span>
                        </div>
                    </div>

                    {/* Loop Count */}
                    <div className="mb-md">
                        <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                            循環次數: {settings.flashLoops}次
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={settings.flashLoops}
                            onChange={(e) => handleUpdate('flashLoops', parseInt(e.target.value))}
                            className="slider"
                            style={{ width: '100%' }}
                        />
                        <div className="flex" style={{ justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            <span>1次</span>
                            <span>10次</span>
                        </div>
                    </div>

                    {/* TTS Speed */}
                    <div className="mb-md">
                        <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                            語音速度: {settings.flashTtsSpeed.toFixed(1)}x
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="8.0"
                            step="0.1"
                            value={settings.flashTtsSpeed}
                            onChange={(e) => handleUpdate('flashTtsSpeed', parseFloat(e.target.value))}
                            className="slider"
                            style={{ width: '100%' }}
                        />
                        <div className="flex" style={{ justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            <span>0.1x</span>
                            <span>8.0x</span>
                        </div>
                    </div>

                    {/* Auto-play Voice on Navigation */}
                    <div className="mb-md">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.flashAutoPlayVoice}
                                onChange={(e) => handleUpdate('flashAutoPlayVoice', e.target.checked)}
                            />
                            <span>手動切換時自動播放語音</span>
                        </label>
                        <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                            點擊「上一個」或「下一個」時自動播放該字詞的語音
                        </p>
                    </div>

                    {/* Enable Voice */}
                    <div className="mb-md">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.flashTtsEnabled}
                                onChange={(e) => handleUpdate('flashTtsEnabled', e.target.checked)}
                            />
                            <span>啟用語音</span>
                        </label>
                    </div>

                    {/* Display Mode */}
                    <div className="mb-md">
                        <label className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                            顯示模式
                        </label>
                        <div className="flex gap-sm">
                            <button
                                className={`btn ${settings.flashDisplayMode === 'flash' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleUpdate('flashDisplayMode', 'flash')}
                                style={{ flex: 1 }}
                            >
                                ⚡ 專注模式
                            </button>
                            <button
                                className={`btn ${settings.flashDisplayMode === 'sleep' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleUpdate('flashDisplayMode', 'sleep')}
                                style={{ flex: 1 }}
                            >
                                🌙 睡眠模式
                            </button>
                        </div>
                        <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                            專注模式：高對比度，適合主動學習<br />
                            睡眠模式：柔和色調，適合睡前聆聽
                        </p>
                    </div>

                    {/* Category Color Borders */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.flashShowCategoryColors}
                                onChange={(e) => handleUpdate('flashShowCategoryColors', e.target.checked)}
                            />
                            <span>顯示分類顏色邊框</span>
                        </label>
                        <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                            用顏色幫助大腦快速分類記憶
                        </p>
                    </div>
                </section>

                {/* Gemini API Key */}
                <section className="card mb-md">
                    <h3 className="mb-md">Gemini API 金鑰</h3>
                    <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                        用於線上 OCR 識別（可選）
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--color-primary)', marginLeft: '8px' }}>取得 API 金鑰 →</a>
                    </p>
                    <div className="flex gap-sm mb-md">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            className="input"
                            placeholder="輸入 Gemini API 金鑰..."
                            value={settings.geminiApiKey || ''}
                            onChange={(e) => handleUpdate('geminiApiKey', e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="btn btn-ghost"
                            onClick={() => setShowApiKey(!showApiKey)}
                        >
                            {showApiKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <button
                        className="btn btn-ghost"
                        onClick={handleTestGeminiKey}
                        disabled={geminiKeyTesting || !settings.geminiApiKey}
                        style={{ width: '100%' }}
                    >
                        {geminiKeyTesting ? '測試中...' : '🔍 測試 Gemini API 金鑰'}
                    </button>
                </section>

                {/* Data Management */}
                <section className="card mb-md">
                    <h3 className="mb-md">資料管理</h3>

                    <div className="flex gap-md mb-md">
                        <button
                            className="btn btn-ghost"
                            onClick={handleExport}
                            style={{ flex: 1 }}
                        >
                            📤 匯出資料
                        </button>
                        <label className="btn btn-ghost" style={{ flex: 1, cursor: 'pointer' }}>
                            📥 匯入資料
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    <button
                        className="btn btn-ghost"
                        onClick={handleClearData}
                        style={{
                            width: '100%',
                            color: 'var(--color-error)',
                            borderColor: 'var(--color-error)'
                        }}
                    >
                        🗑️ 清除所有資料
                    </button>
                </section>

                {/* About */}
                <section className="card">
                    <h3 className="mb-md">關於</h3>
                    <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        SpeedyRead v1.0.0<br />
                        高速聽力訓練應用程式
                    </p>
                </section>
            </div>

            {/* Toast Message */}
            {message && (
                <div className="toast">{message}</div>
            )}
        </div>
    );
}
