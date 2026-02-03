/**
 * OCRCapture Component
 * Capture images and extract text via OCR
 */
import { useState, useRef, useEffect } from 'react';
import { performOCR } from '../services/ocr';

export default function OCRCapture({
    apiKey = '',
    onTextExtracted,
    onCancel
}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [ocrMethod, setOcrMethod] = useState(null); // 'gemini' | 'local'

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Cleanup preview URL on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Fix image orientation from camera
        const correctedFile = await fixImageOrientation(file);
        await processImage(correctedFile);
    };

    // Fix image orientation based on EXIF data
    const fixImageOrientation = async (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas size to match image
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw the image (this automatically corrects orientation in modern browsers)
                    ctx.drawImage(img, 0, 0);

                    // Convert back to blob
                    canvas.toBlob((blob) => {
                        const correctedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        resolve(correctedFile);
                    }, file.type);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const processImage = async (file) => {
        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setOcrMethod(null);

        // Show preview
        setPreviewUrl(URL.createObjectURL(file));

        try {
            const result = await performOCR(file, {
                apiKey,
                preferOnline: !!apiKey,
                onProgress: setProgress
            });

            setExtractedText(result.text);
            setOcrMethod(result.method);
            setProgress(100);
        } catch (err) {
            setError(err.message);
            setOcrMethod(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        // Pass text to parent - this will switch mode and unmount this component
        if (extractedText.trim()) {
            onTextExtracted?.(extractedText);
        }
    };

    const handleRetry = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setExtractedText('');
        setError(null);
        setPreviewUrl(null);
        setProgress(0);
        setOcrMethod(null);
    };

    const cleanup = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setExtractedText('');
        setError(null);
    };

    const handleCancel = () => {
        cleanup();
        onCancel?.();
    };

    return (
        <div className="ocr-capture">
            {!previewUrl ? (
                // Capture UI
                <div className="ocr-capture-options">
                    <div className="grid grid-2 gap-md">
                        <button
                            className="btn btn-primary btn-large"
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            📷 拍照
                        </button>

                        <button
                            className="btn btn-secondary btn-large"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            🖼️ 相簿
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    <p className="text-center text-muted mt-lg">
                        {apiKey ? '使用 Gemini AI 識別' : '使用離線 OCR 識別'}
                    </p>

                    <button
                        className="btn btn-ghost mt-md"
                        onClick={handleCancel}
                        style={{ width: '100%' }}
                    >
                        取消
                    </button>
                </div>
            ) : (
                // Processing / Result UI
                <div className="ocr-result">
                    {/* Image Preview */}
                    <div className="ocr-preview card mb-md">
                        <img
                            src={previewUrl}
                            alt="OCR Preview"
                            style={{
                                width: '100%',
                                maxHeight: '200px',
                                objectFit: 'contain',
                                borderRadius: 'var(--radius-md)'
                            }}
                        />
                    </div>

                    {isProcessing ? (
                        // Processing state
                        <div className="text-center">
                            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                            <p className="mt-md">正在識別文字... {Math.round(progress)}%</p>
                        </div>
                    ) : error ? (
                        // Error state
                        <div className="text-center">
                            <p className="text-muted" style={{ color: 'var(--color-error)' }}>
                                識別失敗: {error}
                            </p>
                            <button className="btn btn-primary mt-md" onClick={handleRetry}>
                                重試
                            </button>
                        </div>
                    ) : (
                        // Success - Edit extracted text
                        <div className="ocr-editor">
                            <label className="label">識別結果（可編輯）</label>
                            {ocrMethod && (
                                <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                                    ✅ 使用 {
                                        ocrMethod === 'gemini' ? 'Gemini AI' :
                                            ocrMethod === 'local-fallback' ? '離線 OCR（Gemini 失敗後備用）' :
                                                '離線 OCR'
                                    } 識別成功
                                </p>
                            )}
                            <textarea
                                className="textarea"
                                value={extractedText}
                                onChange={(e) => setExtractedText(e.target.value)}
                                placeholder="識別到的文字會顯示在這裡..."
                                rows={8}
                            />

                            <div className="flex gap-md mt-md">
                                <button
                                    className="btn btn-ghost"
                                    onClick={handleRetry}
                                    style={{ flex: 1 }}
                                >
                                    重新選擇
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleConfirm}
                                    disabled={!extractedText.trim()}
                                    style={{ flex: 1 }}
                                >
                                    確認使用
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
