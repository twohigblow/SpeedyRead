/**
 * Content Exporter Component
 * 
 * Allows users to export libraries/categories in various formats
 * (CSV, Excel, Text, JSON Package)
 */

import { useState } from 'react';
import {
    exportToCSV,
    exportToExcel,
    exportToText,
    exportAsPackage,
    downloadFile
} from '../services/content-manager.js';

export default function ContentExporter({ library, onClose }) {
    const [format, setFormat] = useState('json'); // 'csv' | 'xlsx' | 'txt' | 'json'
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const safeName = (library.name || 'library').replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
            const filename = `${safeName}_${timestamp}`;

            let blob;
            let ext;

            switch (format) {
                case 'csv':
                    blob = exportToCSV(library);
                    ext = 'csv';
                    break;
                case 'xlsx':
                    blob = exportToExcel(library);
                    ext = 'xlsx';
                    break;
                case 'txt':
                    const textContent = exportToText(library);
                    blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                    ext = 'txt';
                    break;
                case 'json':
                    const jsonContent = exportAsPackage(library);
                    blob = new Blob([jsonContent], { type: 'application/json' });
                    ext = 'json';
                    break;
                default:
                    throw new Error('Unsupported format');
            }

            downloadFile(blob, `${filename}.${ext}`);
            if (onClose) onClose();

        } catch (error) {
            console.error('Export failed:', error);
            alert('匯出失敗: ' + error.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="content-exporter card">
            <h3 className="mb-md">📤 匯出內容</h3>

            <div className="mb-md">
                <div className="info-item mb-sm">
                    <strong>名稱:</strong> {library.name}
                </div>
                <div className="info-item mb-md">
                    <strong>包含:</strong> {library.chapters?.length || 0} 個章節, {library.totalWords || 0} 個字詞
                </div>

                <label className="label mb-sm">選擇格式:</label>
                <div className="format-selector">
                    <label className={`format-option ${format === 'json' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="format"
                            value="json"
                            checked={format === 'json'}
                            onChange={(e) => setFormat(e.target.value)}
                        />
                        <span className="format-icon">📦</span>
                        <div className="format-details">
                            <span className="format-name">內容包 (JSON)</span>
                            <span className="format-desc">完整備份，包含所有元資料。適合分享給其他人匯入。</span>
                        </div>
                    </label>

                    <label className={`format-option ${format === 'csv' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="format"
                            value="csv"
                            checked={format === 'csv'}
                            onChange={(e) => setFormat(e.target.value)}
                        />
                        <span className="format-icon">📊</span>
                        <div className="format-details">
                            <span className="format-name">CSV 表格</span>
                            <span className="format-desc">通用表格格式，可用 Excel 或 Google Sheets 開啟。</span>
                        </div>
                    </label>

                    <label className={`format-option ${format === 'xlsx' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="format"
                            value="xlsx"
                            checked={format === 'xlsx'}
                            onChange={(e) => setFormat(e.target.value)}
                        />
                        <span className="format-icon">📗</span>
                        <div className="format-details">
                            <span className="format-name">Excel (.xlsx)</span>
                            <span className="format-desc">多工作表格式，每個章節一張表。</span>
                        </div>
                    </label>

                    <label className={`format-option ${format === 'txt' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="format"
                            value="txt"
                            checked={format === 'txt'}
                            onChange={(e) => setFormat(e.target.value)}
                        />
                        <span className="format-icon">📄</span>
                        <div className="format-details">
                            <span className="format-name">純文字 (.txt)</span>
                            <span className="format-desc">人類可讀的文字格式。</span>
                        </div>
                    </label>
                </div>
            </div>

            <div className="flex gap-md">
                <button
                    className="btn btn-ghost"
                    onClick={onClose}
                    style={{ flex: 1 }}
                >
                    取消
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleExport}
                    disabled={exporting}
                    style={{ flex: 2 }}
                >
                    {exporting ? '匯出中...' : '確認匯出'}
                </button>
            </div>

            <style jsx>{`
                .content-exporter {
                    width: 100%;
                }

                .format-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .format-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    border: 2px solid var(--border-color, #ddd);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .format-option:hover {
                    background: var(--bg-secondary, #f9f9f9);
                }

                .format-option.active {
                    border-color: var(--primary-color, #4CAF50);
                    background: rgba(76, 175, 80, 0.05);
                }

                .format-option input {
                    margin-top: 4px;
                }

                .format-icon {
                    font-size: 24px;
                }

                .format-details {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .format-name {
                    font-weight: 600;
                    font-size: 16px;
                }

                .format-desc {
                    font-size: 12px;
                    color: #666;
                }
            `}</style>
        </div>
    );
}
