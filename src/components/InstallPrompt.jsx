/**
 * InstallPrompt Component
 * PWA install prompt for iOS and Android
 */
import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check for iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(ios);

        // For iOS, show if not in standalone mode
        if (ios) {
            const dismissed = localStorage.getItem('installPromptDismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        }

        // For Android/Chrome, listen for beforeinstallprompt
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            const dismissed = localStorage.getItem('installPromptDismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('installPromptDismissed', 'true');
    };

    if (!showPrompt || isInstalled) return null;

    return (
        <div className="install-prompt card" style={{
            position: 'fixed',
            bottom: '90px',
            left: 'var(--space-md)',
            right: 'var(--space-md)',
            zIndex: 200,
            animation: 'slideUp 0.3s ease'
        }}>
            <div className="flex items-center gap-md">
                <span style={{ fontSize: '32px' }}>📲</span>
                <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: 'var(--space-xs)' }}>安裝 SpeedyRead</h4>
                    {isIOS ? (
                        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
                            點擊 <strong>分享</strong> → <strong>加到主畫面</strong>
                        </p>
                    ) : (
                        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
                            安裝到主畫面，離線使用更方便
                        </p>
                    )}
                </div>
            </div>

            <div className="flex gap-sm mt-md">
                <button
                    className="btn btn-ghost"
                    onClick={handleDismiss}
                    style={{ flex: 1 }}
                >
                    稍後
                </button>
                {!isIOS && (
                    <button
                        className="btn btn-primary"
                        onClick={handleInstall}
                        style={{ flex: 1 }}
                    >
                        安裝
                    </button>
                )}
            </div>
        </div>
    );
}
