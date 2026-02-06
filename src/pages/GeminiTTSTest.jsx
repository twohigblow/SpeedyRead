/**
 * Gemini TTS Test Page
 * Quick testing interface for iOS audio fix
 */

import { useState } from 'react';
import GeminiTTSPlayer from '../components/GeminiTTSPlayer';

export default function GeminiTTSTest() {
    const [testText, setTestText] = useState('你好，歡迎使用高速聽力訓練。Hello, welcome to SpeedyRead.');
    const [sampleRate, setSampleRate] = useState(24000);

    const samples = [
        {
            id: 'sample1',
            label: 'Cantonese Sample',
            text: '你好，歡迎使用高速聽力訓練。今日天氣好好，希望你有愉快既一日。'
        },
        {
            id: 'sample2',
            label: 'English Sample',
            text: 'Hello, welcome to SpeedyRead. This is a test of the Gemini text-to-speech service with iOS audio fix.'
        },
        {
            id: 'sample3',
            label: 'Mixed Sample',
            text: '這個 application 可以 help 你 improve your listening skills. 加油！'
        },
        {
            id: 'sample4',
            label: 'Long Chinese',
            text: '學習語言最重要的是持之以恆，每天堅持練習，就能夠看到進步。高速聽力訓練可以幫助你快速提升聽力水平。'
        }
    ];

    const SAMPLE_RATES = [
        { value: 24000, label: '24,000 Hz (Default - Gemini 2.0 Flash)' },
        { value: 22050, label: '22,050 Hz' },
        { value: 16000, label: '16,000 Hz' },
        { value: 32000, label: '32,000 Hz' },
        { value: 44100, label: '44,100 Hz' },
        { value: 48000, label: '48,000 Hz' }
    ];

    return (
        <div className="page gemini-tts-test">
            <header className="page-header">
                <h1>🎙️ Gemini TTS - iOS Audio Fix Test</h1>
                <p>Test the iOS-compatible Gemini text-to-speech implementation</p>
            </header>

            <div className="content">
                {/* Text Input */}
                <section className="section">
                    <h2>Test Text</h2>
                    <textarea
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        rows={4}
                        placeholder="Enter text to synthesize..."
                    />

                    {/* Sample Rate Selector */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Source Sample Rate (Fix Pitch Issues):
                        </label>
                        <select
                            value={sampleRate}
                            onChange={(e) => setSampleRate(parseInt(e.target.value))}
                            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            {SAMPLE_RATES.map(rate => (
                                <option key={rate.value} value={rate.value}>
                                    {rate.label}
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                            If audio sounds like chipmunk (too fast), try a LOWER rate.<br />
                            If audio sounds slow/deep, try a HIGHER rate.
                        </p>
                    </div>

                    {/* Sample Buttons */}
                    <div className="samples">
                        <label>Quick Samples:</label>
                        <div className="sample-buttons">
                            {samples.map(sample => (
                                <button
                                    key={sample.id}
                                    onClick={() => setTestText(sample.text)}
                                    className="btn-sample"
                                >
                                    {sample.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* TTS Player */}
                <section className="section">
                    <h2>TTS Player</h2>
                    <GeminiTTSPlayer
                        text={testText}
                        textId={`test-${testText.substring(0, 10)}`}
                        sourceSampleRate={sampleRate}
                    />
                </section>

                {/* How It Works */}
                <section className="section info-section">
                    <h2>📱 iOS Audio Fix</h2>
                    <div className="info-grid">
                        <div className="info-card">
                            <h3>1️⃣ Unlock AudioContext</h3>
                            <p>
                                Calls <code>ctx.resume()</code> synchronously at the top of
                                click handler, before any async operations.
                            </p>
                            <div className="code-snippet">
                                <code>await unlockAudioForIOS();</code>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3>2️⃣ Manual PCM Decode</h3>
                            <p>
                                Converts Gemini's raw 16-bit PCM to Float32Array,
                                bypassing Safari's audio decoder.
                            </p>
                            <div className="code-snippet">
                                <code>manualDecodeInt16ToFloat32(pcm)</code>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3>3️⃣ Resample to Native Rate</h3>
                            <p>
                                Resamples from source rate ({sampleRate}Hz) to device rate
                                using linear interpolation.
                            </p>
                            <div className="code-snippet">
                                <code>resample({sampleRate}, deviceRate)</code>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testing Checklist */}
                <section className="section checklist-section">
                    <h2>✅ Testing Checklist</h2>
                    <ul className="checklist">
                        <li>
                            <input type="checkbox" id="check1" />
                            <label htmlFor="check1">Audio plays on iOS Safari</label>
                        </li>
                        <li>
                            <input type="checkbox" id="check2" />
                            <label htmlFor="check2">Audio plays on iOS Chrome</label>
                        </li>
                        <li>
                            <input type="checkbox" id="check3" />
                            <label htmlFor="check3">Correct pitch (not chipmunk)</label>
                        </li>
                        <li>
                            <input type="checkbox" id="check4" />
                            <label htmlFor="check4">Correct speed (matches slider)</label>
                        </li>
                        <li>
                            <input type="checkbox" id="check5" />
                            <label htmlFor="check5">Works after first tap (gate unlocked)</label>
                        </li>
                        <li>
                            <input type="checkbox" id="check6" />
                            <label htmlFor="check6">Cached audio plays instantly on 2nd play</label>
                        </li>
                    </ul>
                </section>

                {/* Documentation Link */}
                <section className="section">
                    <div className="doc-link">
                        <h3>📚 Full Documentation</h3>
                        <p>
                            For detailed technical explanation, see{' '}
                            <a href="/docs/iOS-TTS-Fix.md" target="_blank">
                                iOS-TTS-Fix.md
                            </a>
                        </p>
                    </div>
                </section>
            </div>

            <style jsx>{`
                .gemini-tts-test {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 32px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #eee;
                }

                .page-header h1 {
                    margin: 0 0 8px 0;
                    font-size: 2rem;
                }

                .page-header p {
                    margin: 0;
                    color: #666;
                    font-size: 1.1rem;
                }

                .content {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .section {
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .section h2 {
                    margin: 0 0 16px 0;
                    font-size: 1.5rem;
                }

                textarea {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #ddd;
                    border-radius: 6px;
                    font-size: 16px;
                    font-family: inherit;
                    resize: vertical;
                }

                textarea:focus {
                    outline: none;
                    border-color: #4CAF50;
                }

                .samples {
                    margin-top: 16px;
                }

                .samples label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    font-size: 14px;
                }

                .sample-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .btn-sample {
                    padding: 8px 16px;
                    background: #f0f0f0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-sample:hover {
                    background: #e0e0e0;
                    border-color: #bbb;
                }

                .info-section {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .info-section h2 {
                    color: white;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 16px;
                }

                .info-card {
                    background: rgba(255,255,255,0.1);
                    padding: 16px;
                    border-radius: 6px;
                    backdrop-filter: blur(10px);
                }

                .info-card h3 {
                    margin: 0 0 8px 0;
                    font-size: 1.1rem;
                }

                .info-card p {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .code-snippet {
                    background: rgba(0,0,0,0.3);
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-family: 'Monaco', 'Courier New', monospace;
                }

                .code-snippet code {
                    color: #ffd700;
                    font-size: 13px;
                }

                .checklist-section {
                    background: #f9f9f9;
                }

                .checklist {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .checklist li {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    margin-bottom: 8px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #eee;
                }

                .checklist input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    margin-right: 12px;
                    cursor: pointer;
                }

                .checklist label {
                    flex: 1;
                    cursor: pointer;
                    font-size: 15px;
                }

                .doc-link {
                    text-align: center;
                    padding: 20px;
                    background: #e3f2fd;
                    border-radius: 6px;
                    border-left: 4px solid #2196F3;
                }

                .doc-link h3 {
                    margin: 0 0 8px 0;
                    color: #1976D2;
                }

                .doc-link p {
                    margin: 0;
                }

                .doc-link a {
                    color: #1976D2;
                    text-decoration: none;
                    font-weight: 600;
                    border-bottom: 2px solid #2196F3;
                }

                .doc-link a:hover {
                    color: #0D47A1;
                    border-bottom-color: #0D47A1;
                }

                @media (max-width: 768px) {
                    .info-grid {
                        grid-template-columns: 1fr;
                    }

                    .sample-buttons {
                        flex-direction: column;
                    }

                    .btn-sample {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
