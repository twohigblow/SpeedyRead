/**
 * Settings Page
 * User preferences, voice selection, API key, and data management
 */
import { useState, useEffect } from 'react';
import { getSettings, updateSettings, exportData, importData, clearAllData } from '../services/db';
import VoiceSelector from '../components/VoiceSelector';
import LoopMatrix from '../components/LoopMatrix';

export default function Settings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);
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

                {/* Language Selection */}
                <section className="card mb-md">
                    <h3 className="mb-md">語言</h3>
                    <div className="flex gap-md">
                        <button
                            className={`btn ${settings.language === 'zh-HK' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleUpdate('language', 'zh-HK')}
                            style={{ flex: 1 }}
                        >
                            粵語
                        </button>
                        <button
                            className={`btn ${settings.language === 'zh-CN' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleUpdate('language', 'zh-CN')}
                            style={{ flex: 1 }}
                        >
                            普通話
                        </button>
                    </div>
                </section>

                {/* Chinese Voice Selection */}
                <section className="card mb-md">
                    <h3 className="mb-md">中文語音 (Chinese Voice)</h3>
                    <VoiceSelector
                        selectedVoiceUri={settings.voiceUri}
                        language={settings.language}
                        onChange={(uri) => handleUpdate('voiceUri', uri)}
                    />
                </section>

                {/* English Voice Selection */}
                <section className="card mb-md">
                    <h3 className="mb-md">英文語音 (English Voice)</h3>
                    <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
                        Auto-selected when text is primarily English
                    </p>
                    <VoiceSelector
                        selectedVoiceUri={settings.englishVoiceUri}
                        language="en-US"
                        onChange={(uri) => handleUpdate('englishVoiceUri', uri)}
                    />
                </section>

                {/* Default Loop Config */}
                <section className="card mb-md">
                    <h3 className="mb-md">預設播放設定</h3>
                    <LoopMatrix
                        config={settings.loopConfig}
                        onChange={(config) => handleUpdate('loopConfig', config)}
                    />
                </section>

                {/* Gemini API Key */}
                <section className="card mb-md">
                    <h3 className="mb-md">Gemini API 金鑰</h3>
                    <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                        用於線上 OCR 識別（可選）
                    </p>
                    <div className="flex gap-sm">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            className="input"
                            placeholder="輸入 API 金鑰..."
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
