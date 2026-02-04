/**
 * Library Page
 * Browse and manage texts by category and tags
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTexts, getCategories, deleteText, createCategory } from '../services/db';

export default function Library() {
    const [searchParams] = useSearchParams();
    const categoryIdParam = searchParams.get('category');

    const [texts, setTexts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(categoryIdParam ? parseInt(categoryIdParam) : null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        loadData();
    }, [selectedCategory]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [textsData, catsData] = await Promise.all([
                getTexts(selectedCategory),
                getCategories()
            ]);
            setTexts(textsData);
            setCategories(catsData);
        } catch (err) {
            console.error('Failed to load library:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('確定要刪除這個文字嗎？')) {
            await deleteText(id);
            loadData();
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        await createCategory({ name: newCategoryName.trim() });
        setNewCategoryName('');
        setShowNewCategory(false);
        loadData();
    };

    // Filter texts by search query
    const filteredTexts = texts.filter(t => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            t.title?.toLowerCase().includes(query) ||
            t.content.toLowerCase().includes(query) ||
            t.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    });

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">📚 書庫</h1>
                </div>

                {/* Search */}
                <div className="mb-md">
                    <input
                        type="text"
                        className="input"
                        placeholder="🔍 搜尋文字或標籤..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Categories */}
                <div className="mb-lg">
                    <div className="flex items-center justify-between mb-sm">
                        <h4>分類</h4>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setShowNewCategory(!showNewCategory)}
                            style={{ padding: 'var(--space-sm)' }}
                        >
                            ➕
                        </button>
                    </div>

                    {showNewCategory && (
                        <div className="flex gap-sm mb-md">
                            <input
                                type="text"
                                className="input"
                                placeholder="新分類名稱..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                            />
                            <button className="btn btn-primary" onClick={handleCreateCategory}>
                                新增
                            </button>
                        </div>
                    )}

                    <div className="flex gap-sm flex-wrap">
                        <button
                            className={`tag ${selectedCategory === null ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(null)}
                            style={{
                                background: selectedCategory === null ? 'var(--color-primary)' : undefined,
                                color: selectedCategory === null ? 'white' : undefined
                            }}
                        >
                            全部
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`tag ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    background: selectedCategory === cat.id ? 'var(--color-primary)' : undefined,
                                    color: selectedCategory === cat.id ? 'white' : undefined
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text List */}
                {loading ? (
                    <div className="text-center">
                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : filteredTexts.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">
                            {searchQuery ? '找不到符合的結果' : '此分類沒有文字'}
                        </p>
                        <Link to="/add" className="btn btn-primary mt-md">
                            新增文字
                        </Link>
                    </div>
                ) : (
                    <div className="text-list">
                        {filteredTexts.map(text => (
                            <div key={text.id} className="card mb-sm">
                                <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
                                    <Link
                                        to={`/reader/${text.id}`}
                                        style={{ flex: '1 1 200px', textDecoration: 'none', color: 'inherit', minWidth: 0 }}
                                    >
                                        <h4 style={{ marginBottom: 'var(--space-xs)' }}>
                                            {text.title || '未命名'}
                                        </h4>
                                        <p className="text-muted" style={{
                                            margin: 0,
                                            fontSize: 'var(--font-size-sm)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {text.content.substring(0, 30)}...
                                        </p>
                                    </Link>

                                    <div className="flex gap-sm" style={{ flexShrink: 0 }}>
                                        <Link
                                            to={`/edit/${text.id}`}
                                            className="btn btn-ghost btn-icon"
                                            style={{ fontSize: '16px', padding: '8px', minWidth: '36px' }}
                                        >
                                            ✏️
                                        </Link>
                                        <button
                                            className="btn btn-ghost btn-icon"
                                            onClick={() => handleDelete(text.id)}
                                            style={{ fontSize: '16px', padding: '8px', minWidth: '36px' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {text.tags?.length > 0 && (
                                    <div className="flex gap-sm mt-sm">
                                        {text.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="tag"
                                                onClick={() => setSearchQuery(tag)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
