/**
 * Edit Page
 * Edit existing text entry
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getText, updateText, getCategories } from '../services/db';

export default function Edit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [tags, setTags] = useState('');
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [textData, cats] = await Promise.all([
                getText(parseInt(id)),
                getCategories()
            ]);

            if (!textData) {
                navigate('/library');
                return;
            }

            setTitle(textData.title || '');
            setContent(textData.content || '');
            setCategoryId(textData.categoryId);
            setTags(textData.tags?.join(', ') || '');
            setCategories(cats);
        } catch (err) {
            console.error('Failed to load text:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!content.trim()) return;

        setSaving(true);
        try {
            const tagsArray = tags
                .split(/[,，、]/)
                .map(t => t.trim())
                .filter(t => t);

            await updateText(parseInt(id), {
                title: title.trim() || '未命名',
                content: content.trim(),
                categoryId,
                tags: tagsArray
            });

            navigate(`/reader/${id}`);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('儲存失敗: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
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
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => navigate(-1)}
                    >
                        ←
                    </button>
                    <h1 className="page-title">✏️ 編輯</h1>
                </div>

                <div className="edit-form">
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
                            placeholder="輸入文字..."
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
                        {saving ? '儲存中...' : '💾 儲存變更'}
                    </button>
                </div>
            </div>
        </div>
    );
}
