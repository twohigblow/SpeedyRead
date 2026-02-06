/**
 * Add Page - Enhanced
 * Add content via manual entry, bulk import (CSV/Excel), or OCR
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createText, getCategories, createCategory, getSettings } from '../services/db';
import OCRCapture from '../components/OCRCapture';
import ContentImporter from '../components/ContentImporter';
import MetadataEditor from '../components/MetadataEditor';

export default function Add() {
    const navigate = useNavigate();

    const [mode, setMode] = useState('text'); // 'text' | 'bulk' | 'ocr'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [tags, setTags] = useState('');
    const [categories, setCategories] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);

    // Bulk import states
    const [bulkMetadata, setBulkMetadata] = useState({
        name: '',
        description: '',
        category: '',
        tags: [],
        language: 'zh-HK',
        level: 'beginner',
        author: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [cats, settings] = await Promise.all([
            getCategories(),
            getSettings()
        ]);
        setCategories(cats);
        setApiKey(settings.geminiApiKey || '');
    };

    const handleSave = async () => {
        if (!content.trim()) return;

        setSaving(true);
        try {
            const tagsArray = tags
                .split(/[,，、]/)
                .map(t => t.trim())
                .filter(t => t);

            const newText = await createText({
                title: title.trim() || '未命名',
                content: content.trim(),
                categoryId,
                tags: tagsArray
            });

            navigate(`/reader/${newText.id}`);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('儲存失敗: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBulkImport = async (importData) => {
        try {
            setSaving(true);

            // Create category with metadata
            const categoryData = {
                name: bulkMetadata.name || importData.metadata?.name || '匯入的內容',
                description: bulkMetadata.description || importData.metadata?.description || '',
                tags: bulkMetadata.tags.length > 0 ? bulkMetadata.tags : (importData.metadata?.tags || []),
                language: bulkMetadata.language || importData.metadata?.language || 'zh-HK',
                level: bulkMetadata.level || importData.metadata?.level || 'beginner',
                author: bulkMetadata.author || importData.metadata?.author || '',
                isPublic: false,
                downloads: 0,
                rating: 0
            };

            const newCategory = await createCategory(categoryData);

            // Create texts for each chapter
            let totalCreated = 0;

            for (const chapter of importData.chapters) {
                for (const word of chapter.words) {
                    await createText({
                        title: `${chapter.name} - ${word.front}`,
                        content: word.front,
                        back: word.back || '',
                        pronunciation: word.pronunciation || '',
                        type: word.type || 'word',
                        categoryId: newCategory.id,
                        tags: [...(word.tags || []), chapter.name]
                    });
                    totalCreated++;
                }
            }

            alert(`✓ 成功匯入 ${totalCreated} 個字詞!`);
            navigate(`/library?category=${newCategory.id}`);
        } catch (err) {
            console.error('Bulk import failed:', err);
            alert('匯入失敗: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleOCRComplete = (text) => {
        setContent(text);
        setMode('text');
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">➕ 新增內容</h1>
                </div>

                {/* Mode Toggle */}
                <div className="mode-selector mb-lg">
                    <button
                        className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
                        onClick={() => setMode('text')}
                    >
                        <span className="mode-icon">✍️</span>
                        <span className="mode-label">手動輸入</span>
                    </button>
                    <button
                        className={`mode-btn ${mode === 'bulk' ? 'active' : ''}`}
                        onClick={() => setMode('bulk')}
                    >
                        <span className="mode-icon">📥</span>
                        <span className="mode-label">批量匯入</span>
                    </button>
                    <button
                        className={`mode-btn ${mode === 'ocr' ? 'active' : ''}`}
                        onClick={() => setMode('ocr')}
                    >
                        <span className="mode-icon">📷</span>
                        <span className="mode-label">OCR 掃描</span>
                    </button>
                </div>

                {/* OCR Mode */}
                {mode === 'ocr' && (
                    <OCRCapture
                        apiKey={apiKey}
                        onTextExtracted={handleOCRComplete}
                        onCancel={() => setMode('text')}
                    />
                )}

                {/* Manual Entry Mode */}
                {mode === 'text' && (
                    <div className="add-form">
                        {/* Title */}
                        <div className="mb-md">
                            <label className="label">標題</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="輸入標題..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Content */}
                        <div className="mb-md">
                            <label className="label">文字內容</label>
                            <textarea
                                className="textarea"
                                placeholder="輸入或貼上文字..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={10}
                            />
                        </div>

                        {/* Category */}
                        <div className="mb-md">
                            <label className="label">分類</label>
                            <select
                                className="input"
                                value={categoryId || ''}
                                onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">選擇分類...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tags */}
                        <div className="mb-lg">
                            <label className="label">標籤（用逗號分隔）</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="例如: 聽寫, 考試, 第一課"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>

                        {/* Save Button */}
                        <button
                            className="btn btn-primary btn-large"
                            onClick={handleSave}
                            disabled={!content.trim() || saving}
                            style={{ width: '100%' }}
                        >
                            {saving ? '儲存中...' : '💾 儲存'}
                        </button>
                    </div>
                )}

                {/* Bulk Import Mode */}
                {mode === 'bulk' && (
                    <div className="bulk-import-section">
                        <div className="card mb-md">
                            <h3 className="mb-md">📋 內容資訊</h3>
                            <MetadataEditor
                                metadata={bulkMetadata}
                                onChange={setBulkMetadata}
                                showAdvanced={true}
                            />
                        </div>

                        <ContentImporter
                            onImport={handleBulkImport}
                            onCancel={() => setMode('text')}
                        />

                        {/* Format Examples */}
                        <div className="card mt-md">
                            <h4 className="mb-sm">📝 檔案格式範例</h4>
                            <div className="format-examples">
                                <div className="format-example">
                                    <h5>CSV 格式:</h5>
                                    <pre className="code-block">
                                        Chapter,Front,Back,Pronunciation,Type,Tags
                                        第一課,Shirt,襯衫,sam3 saam1,word,衣服
                                        第一課,Pants,褲子,fu3 zi2,word,衣服
                                        第二課,Hello,你好,nei5 hou2,phrase,問候
                                    </pre>
                                </div>

                                <div className="format-example">
                                    <h5>文字格式:</h5>
                                    <pre className="code-block">
                                        ===CHAPTER: 第一課===
                                        Shirt | 襯衫 | sam3 saam1 | word | 衣服
                                        Pants | 褲子 | fu3 zi2 | word | 衣服

                                        ===CHAPTER: 第二課===
                                        Hello | 你好 | nei5 hou2 | phrase | 問候
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .mode-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                }

                .mode-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 16px 12px;
                    border: 2px solid var(--border-color, #ddd);
                    border-radius: 8px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .mode-btn:hover {
                    border-color: var(--primary-color, #4CAF50);
                    background: rgba(76, 175, 80, 0.05);
                }

                .mode-btn.active {
                    border-color: var(--primary-color, #4CAF50);
                    background: var(--primary-color, #4CAF50);
                    color: white;
                }

                .mode-icon {
                    font-size: 32px;
                }

                .mode-label {
                    font-size: 14px;
                    font-weight: 600;
                }

                .format-examples {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .format-example h5 {
                    margin: 0 0 8px 0;
                }

                .code-block {
                    background: #f5f5f5;
                    padding: 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    overflow-x: auto;
                    margin: 0;
                }

                @media (max-width: 768px) {
                    .mode-selector {
                        grid-template-columns: 1fr;
                    }

                    .mode-btn {
                        flex-direction: row;
                        justify-content: center;
                        padding: 12px;
                    }

                    .mode-icon {
                        font-size: 24px;
                    }
                }
            `}</style>
        </div>
    );
}

