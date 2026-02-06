/**
 * Metadata Editor Component
 * 
 * Edit library metadata: name, description, category, tags, language, level
 */

import { useState, useEffect } from 'react';

const CATEGORIES = [
    '詞彙 (Vocabulary)',
    '句子 (Sentences)',
    '對話 (Conversations)',
    '故事 (Stories)',
    '詩歌 (Poetry)',
    '學科 (Academic)',
    '商業 (Business)',
    '旅遊 (Travel)',
    '其他 (Other)'
];

const LANGUAGES = [
    { code: 'zh-HK', name: '粵語 (Cantonese)' },
    { code: 'zh-CN', name: '普通話 (Mandarin)' },
    { code: 'en-US', name: 'English' },
    { code: 'ja-JP', name: '日本語 (Japanese)' },
    { code: 'ko-KR', name: '한국어 (Korean)' }
];

const LEVELS = [
    { value: 'beginner', label: '初級 (Beginner)' },
    { value: 'intermediate', label: '中級 (Intermediate)' },
    { value: 'advanced', label: '高級 (Advanced)' }
];

const COMMON_TAGS = [
    '考試', '小學', '中學', '拼音', '聽寫',
    '日常', '基礎', '進階', '口語', '書面'
];

export default function MetadataEditor({
    metadata = {},
    onChange,
    showAdvanced = true
}) {
    const [name, setName] = useState(metadata.name || '');
    const [description, setDescription] = useState(metadata.description || '');
    const [category, setCategory] = useState(metadata.category || '');
    const [customCategory, setCustomCategory] = useState('');
    const [tags, setTags] = useState(metadata.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [language, setLanguage] = useState(metadata.language || 'zh-HK');
    const [level, setLevel] = useState(metadata.level || 'beginner');
    const [author, setAuthor] = useState(metadata.author || '');

    useEffect(() => {
        onChange({
            name,
            description,
            category: category === '自訂...' ? customCategory : category,
            tags,
            language,
            level,
            author
        });
    }, [name, description, category, customCategory, tags, language, level, author]);

    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
        }
        setTagInput('');
    };

    const removeTag = (tag) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        }
    };

    return (
        <div className="metadata-editor">
            {/* Name */}
            <div className="form-group mb-md">
                <label className="label">
                    名稱 <span className="required">*</span>
                </label>
                <input
                    type="text"
                    className="input"
                    placeholder="例如: 小學二年級詞彙"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            {/* Description */}
            <div className="form-group mb-md">
                <label className="label">描述</label>
                <textarea
                    className="textarea"
                    placeholder="簡單描述這個內容的用途和特點..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                />
                <div className="text-muted text-right" style={{ fontSize: '12px' }}>
                    {description.length}/500
                </div>
            </div>

            {/* Category */}
            <div className="form-group mb-md">
                <label className="label">
                    分類 <span className="required">*</span>
                </label>
                <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                >
                    <option value="">選擇分類...</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="自訂...">自訂...</option>
                </select>

                {category === '自訂...' && (
                    <input
                        type="text"
                        className="input mt-sm"
                        placeholder="輸入自訂分類名稱"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                    />
                )}
            </div>

            {/* Tags */}
            <div className="form-group mb-md">
                <label className="label">標籤</label>

                {/* Selected Tags */}
                {tags.length > 0 && (
                    <div className="tag-list mb-sm">
                        {tags.map(tag => (
                            <span key={tag} className="tag tag-removable">
                                {tag}
                                <button
                                    type="button"
                                    className="tag-remove"
                                    onClick={() => removeTag(tag)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Tag Input */}
                <input
                    type="text"
                    className="input"
                    placeholder="輸入標籤，按 Enter 或逗號新增"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => tagInput && addTag(tagInput)}
                />

                {/* Common Tags */}
                <div className="common-tags mt-sm">
                    <div className="text-muted mb-xs" style={{ fontSize: '12px' }}>
                        常用標籤 (點擊新增):
                    </div>
                    <div className="tag-list">
                        {COMMON_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                className="tag tag-clickable"
                                onClick={() => addTag(tag)}
                                disabled={tags.includes(tag)}
                            >
                                + {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {showAdvanced && (
                <>
                    {/* Language */}
                    <div className="form-group mb-md">
                        <label className="label">語言</label>
                        <select
                            className="input"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Level */}
                    <div className="form-group mb-md">
                        <label className="label">難度</label>
                        <select
                            className="input"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                        >
                            {LEVELS.map(lvl => (
                                <option key={lvl.value} value={lvl.value}>
                                    {lvl.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Author */}
                    <div className="form-group mb-md">
                        <label className="label">作者</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="您的名字或機構名稱"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                        />
                    </div>
                </>
            )}

            <style jsx>{`
                .metadata-editor {
                    width: 100%;
                }

                .form-group {
                    width: 100%;
                }

                .label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    font-size: 14px;
                }

                .required {
                    color: #f44336;
                }

                .tag-list {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .tag {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    border: 1px solid var(--border-color, #ddd);
                    background: var(--bg-secondary, #f5f5f5);
                }

                .tag-removable {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding-right: 4px;
                }

                .tag-remove {
                    border: none;
                    background: none;
                    font-size: 16px;
                    line-height: 1;
                    cursor: pointer;
                    padding: 0 2px;
                    color: #666;
                }

                .tag-remove:hover {
                    color: #f44336;
                }

                .tag-clickable {
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tag-clickable:not([disabled]):hover {
                    background: var(--primary-color, #4CAF50);
                    color: white;
                    border-color: var(--primary-color, #4CAF50);
                }

                .tag-clickable[disabled] {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .common-tags {
                    padding: 12px;
                    background: var(--bg-secondary, #f9f9f9);
                    border-radius: 6px;
                }

                @media (max-width: 768px) {
                    .tag-list {
                        gap: 4px;
                    }

                    .tag {
                        font-size: 11px;
                        padding: 3px 6px;
                    }
                }
            `}</style>
        </div>
    );
}
