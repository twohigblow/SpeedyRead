/**
 * Add Page
 * Add new text via manual entry, paste, or OCR
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createText, getCategories, getSettings } from '../services/db';
import OCRCapture from '../components/OCRCapture';

export default function Add() {
    const navigate = useNavigate();

    const [mode, setMode] = useState('text'); // 'text' | 'ocr'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [tags, setTags] = useState('');
    const [categories, setCategories] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);

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

    const handleOCRComplete = (text) => {
        setContent(text);
        setMode('text');
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">➕ 新增文字</h1>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-sm mb-lg">
                    <button
                        className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setMode('text')}
                        style={{ flex: 1 }}
                    >
                        ✍️ 手動輸入
                    </button>
                    <button
                        className={`btn ${mode === 'ocr' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setMode('ocr')}
                        style={{ flex: 1 }}
                    >
                        📷 OCR 掃描
                    </button>
                </div>

                {mode === 'ocr' ? (
                    <OCRCapture
                        apiKey={apiKey}
                        onTextExtracted={handleOCRComplete}
                        onCancel={() => setMode('text')}
                    />
                ) : (
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
            </div>
        </div>
    );
}
