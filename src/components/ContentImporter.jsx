/**
 * Content Importer Component
 * 
 * Allows users to bulk import content from CSV, Excel, or text files
 */

import { useState } from 'react';
import {
    importFromFile,
    validateImportData,
    getFileExtension
} from '../services/content-manager.js';

export default function ContentImporter({ onImport, onCancel }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = async (selectedFile) => {
        setFile(selectedFile);
        setError(null);
        setPreview(null);

        // Validate file type
        const ext = getFileExtension(selectedFile.name);
        const allowedTypes = ['csv', 'xlsx', 'xls', 'txt', 'json'];

        if (!allowedTypes.includes(ext)) {
            setError(`不支援的檔案格式: .${ext}`);
            return;
        }

        // Generate preview
        try {
            const data = await importFromFile(selectedFile);
            const validation = validateImportData(data);

            if (!validation.valid) {
                setError(validation.errors.join('\n'));
                return;
            }

            setPreview({
                ...data,
                filename: selectedFile.name,
                filesize: (selectedFile.size / 1024).toFixed(1) + ' KB'
            });
        } catch (err) {
            setError(`讀取檔案失敗: ${err.message}`);
        }
    };

    const handleImport = async () => {
        if (!preview) return;

        setImporting(true);
        try {
            await onImport(preview);
        } catch (err) {
            setError(`匯入失敗: ${err.message}`);
        } finally {
            setImporting(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    return (
        <div className="content-importer">
            <h3 className="mb-md">📥 批量匯入內容</h3>

            {/* File Upload Area */}
            {!preview && (
                <div
                    className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="upload-icon">📁</div>
                    <p className="upload-text">
                        拖放檔案到這裡，或點擊選擇
                    </p>
                    <input
                        type="file"
                        id="file-upload"
                        className="file-input"
                        accept=".csv,.xlsx,.xls,.txt,.json"
                        onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                    />
                    <label htmlFor="file-upload" className="btn btn-primary">
                        選擇檔案
                    </label>
                    <p className="text-muted mt-sm">
                        支援格式: CSV, Excel (.xlsx), 文字檔 (.txt), JSON
                    </p>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="alert alert-error mb-md">
                    <span className="alert-icon">⚠️</span>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
                </div>
            )}

            {/* Preview */}
            {preview && !error && (
                <div className="preview-section">
                    <div className="card mb-md">
                        <h4 className="mb-sm">檔案資訊</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">檔案名稱:</span>
                                <span className="info-value">{preview.filename}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">檔案大小:</span>
                                <span className="info-value">{preview.filesize}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">章節數量:</span>
                                <span className="info-value">{preview.chapters.length}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">總字詞數:</span>
                                <span className="info-value">{preview.totalWords}</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata (if available) */}
                    {preview.metadata && Object.keys(preview.metadata).length > 0 && (
                        <div className="card mb-md">
                            <h4 className="mb-sm">元資料</h4>
                            <div className="metadata-grid">
                                {preview.metadata.name && (
                                    <div className="metadata-item">
                                        <span className="metadata-label">名稱:</span>
                                        <span className="metadata-value">{preview.metadata.name}</span>
                                    </div>
                                )}
                                {preview.metadata.description && (
                                    <div className="metadata-item">
                                        <span className="metadata-label">描述:</span>
                                        <span className="metadata-value">{preview.metadata.description}</span>
                                    </div>
                                )}
                                {preview.metadata.category && (
                                    <div className="metadata-item">
                                        <span className="metadata-label">分類:</span>
                                        <span className="metadata-value">{preview.metadata.category}</span>
                                    </div>
                                )}
                                {preview.metadata.tags?.length > 0 && (
                                    <div className="metadata-item">
                                        <span className="metadata-label">標籤:</span>
                                        <div className="tag-list">
                                            {preview.metadata.tags.map((tag, i) => (
                                                <span key={i} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chapter Preview */}
                    <div className="card mb-md">
                        <h4 className="mb-sm">章節預覽</h4>
                        <div className="chapter-preview">
                            {preview.chapters.slice(0, 3).map((chapter, idx) => (
                                <div key={idx} className="chapter-item">
                                    <h5>{chapter.name}</h5>
                                    <p className="text-muted">
                                        {chapter.words.length} 個字詞
                                    </p>
                                    <div className="word-samples">
                                        {chapter.words.slice(0, 5).map((word, wordIdx) => (
                                            <div key={wordIdx} className="word-sample">
                                                <span className="word-front">{word.front}</span>
                                                {word.back && (
                                                    <span className="word-back"> → {word.back}</span>
                                                )}
                                            </div>
                                        ))}
                                        {chapter.words.length > 5 && (
                                            <div className="text-muted">
                                                還有 {chapter.words.length - 5} 個字詞...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {preview.chapters.length > 3 && (
                                <div className="text-muted text-center">
                                    還有 {preview.chapters.length - 3} 個章節...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-md">
                        <button
                            className="btn btn-ghost"
                            onClick={() => {
                                setFile(null);
                                setPreview(null);
                                setError(null);
                            }}
                            style={{ flex: 1 }}
                        >
                            重新選擇
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleImport}
                            disabled={importing}
                            style={{ flex: 2 }}
                        >
                            {importing ? '匯入中...' : `✓ 確認匯入 (${preview.totalWords} 個字詞)`}
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Button */}
            {!preview && onCancel && (
                <div className="text-center mt-md">
                    <button className="btn btn-ghost" onClick={onCancel}>
                        取消
                    </button>
                </div>
            )}

            <style jsx>{`
                .content-importer {
                    padding: 20px;
                }

                .upload-area {
                    border: 2px dashed var(--border-color, #ddd);
                    border-radius: 12px;
                    padding: 40px 20px;
                    text-align: center;
                    background: var(--bg-secondary, #f9f9f9);
                    transition: all 0.2s;
                    position: relative;
                }

                .upload-area.drag-active {
                    border-color: var(--primary-color, #4CAF50);
                    background: rgba(76, 175, 80, 0.1);
                    transform: scale(1.02);
                }

                .upload-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }

                .upload-text {
                    margin: 0 0 16px 0;
                    font-size: 16px;
                }

                .file-input {
                    display: none;
                }

                .alert {
                    display: flex;
                    gap: 12px;
                    padding: 16px;
                    border-radius: 8px;
                    align-items: flex-start;
                }

                .alert-error {
                    background: #FFEBEE;
                    border: 1px solid #EF5350;
                    color: #C62828;
                }

                .alert-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .info-grid,
                .metadata-grid {
                    display: grid;
                    gap: 12px;
                }

                .info-item,
                .metadata-item {
                    display: flex;
                    gap: 8px;
                    align-items: baseline;
                }

                .info-label,
                .metadata-label {
                    font-weight: 600;
                    min-width: 100px;
                    color: #666;
                }

                .info-value,
                .metadata-value {
                    flex: 1;
                }

                .tag-list {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .chapter-preview {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .chapter-item {
                    padding: 12px;
                    background: var(--bg-secondary, #f9f9f9);
                    border-radius: 8px;
                }

                .chapter-item h5 {
                    margin: 0 0 4px 0;
                }

                .word-samples {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 8px;
                }

                .word-sample {
                    font-size: 14px;
                }

                .word-front {
                    font-weight: 600;
                }

                .word-back {
                    color: #666;
                }

                @media (max-width: 768px) {
                    .content-importer {
                        padding: 12px;
                    }

                    .upload-area {
                        padding: 30px 15px;
                    }
                }
            `}</style>
        </div>
    );
}
