/**
 * VoiceSelector Component
 * Select and preview TTS voices for Chinese or English
 */
import { useState, useEffect } from 'react';
import { getChineseVoices, getEnglishVoices, previewVoice } from '../services/tts';

export default function VoiceSelector({
    selectedVoiceUri,
    language = 'zh-HK',
    onChange
}) {
    const [voices, setVoices] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingVoice, setPlayingVoice] = useState(null);

    useEffect(() => {
        // Voices may load asynchronously
        const loadVoices = () => {
            if (language.startsWith('en')) {
                // English voices
                setVoices(getEnglishVoices());
            } else {
                // Chinese voices
                const chineseVoices = getChineseVoices();
                if (language === 'zh-HK') {
                    setVoices(chineseVoices.cantonese);
                } else {
                    setVoices(chineseVoices.mandarin);
                }
            }
        };

        loadVoices();

        // Some browsers fire voiceschanged event
        if (typeof speechSynthesis !== 'undefined') {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [language]);

    const handlePreview = async (voiceUri, lang) => {
        if (isPlaying) return;

        setIsPlaying(true);
        setPlayingVoice(voiceUri);

        try {
            // Use appropriate sample text based on language
            const previewLang = lang.startsWith('en') ? 'en' : lang;
            await previewVoice(voiceUri, previewLang);
        } catch (err) {
            console.error('Preview failed:', err);
        } finally {
            setIsPlaying(false);
            setPlayingVoice(null);
        }
    };

    const handleSelect = (voiceUri) => {
        onChange?.(voiceUri);
    };

    const isEnglish = language.startsWith('en');
    const noVoicesMessage = isEnglish
        ? 'No English voices found'
        : (language === 'zh-HK' ? '沒有找到粵語語音' : '沒有找到普通話語音');

    return (
        <div className="voice-selector">
            <div className="voice-list">
                {voices.length === 0 ? (
                    <p className="text-muted text-center">
                        {noVoicesMessage}
                    </p>
                ) : (
                    voices.map((voice) => (
                        <div
                            key={voice.voiceURI}
                            className={`voice-item card card-interactive flex items-center gap-md ${selectedVoiceUri === voice.voiceURI ? 'active' : ''
                                }`}
                            style={{
                                marginBottom: 'var(--space-sm)',
                                borderColor: selectedVoiceUri === voice.voiceURI ? 'var(--color-primary)' : undefined,
                                background: selectedVoiceUri === voice.voiceURI ? 'rgba(99, 102, 241, 0.1)' : undefined
                            }}
                            onClick={() => handleSelect(voice.voiceURI)}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{voice.name}</div>
                                <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                    {voice.lang} {voice.localService ? '(Local)' : '(Network)'}
                                </div>
                            </div>

                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreview(voice.voiceURI, language);
                                }}
                                disabled={isPlaying}
                                style={{
                                    fontSize: '20px',
                                    opacity: playingVoice === voice.voiceURI ? 0.5 : 1
                                }}
                            >
                                {playingVoice === voice.voiceURI ? '🔊' : '▶️'}
                            </button>
                        </div>
                    ))
                )}
            </div>

            <p className="text-muted mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                {isEnglish ? 'Click ▶️ to preview, click item to select' : '點擊 ▶️ 試聽語音，點擊項目選擇'}
            </p>
        </div>
    );
}
