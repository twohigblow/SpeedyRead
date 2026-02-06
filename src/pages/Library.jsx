/**
 * Library Page
 * Browse and manage texts by category and tags
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTexts, getCategories, deleteText, createCategory, getCategory, getWordsFromLibrary } from '../services/db';
import ContentExporter from '../components/ContentExporter';

export default function Library() {
    const [searchParams] = useSearchParams();
    const categoryIdParam = searchParams.get('category');

    const [texts, setTexts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(categoryIdParam ? parseInt(categoryIdParam) : null);
    const [currentCategoryData, setCurrentCategoryData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [exportLibrary, setExportLibrary] = useState(null);

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

            if (selectedCategory) {
                const catData = await getCategory(selectedCategory);
                setCurrentCategoryData(catData);
            } else {
                setCurrentCategoryData(null);
            }
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

    const handleExportClick = async () => {
        if (!selectedCategory || !currentCategoryData) return;

        try {
            // Fetch words for the library to create full export object
            const words = await getWordsFromLibrary(selectedCategory);

            // Structure expected by ContentExporter/manager
            const libraryToExport = {
                ...currentCategoryData,
                chapters: [{
                    name: 'Default',
                    words: words
                }],
                totalWords: words.length
            };

            setExportLibrary(libraryToExport);
            setShowExport(true);
        } catch (err) {
            console.error('Failed to prepare export:', err);
            alert('準備匯出失敗');
        }
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

                {/* Category Metadata & Actions */}
                {selectedCategory && currentCategoryData && (
                    <div className="card mb-lg" style={{ background: 'var(--bg-secondary, #f9f9f9)' }}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="mb-xs">{currentCategoryData.name}</h3>
                                {currentCategoryData.description && (
                                    <p className="text-muted mb-sm">{currentCategoryData.description}</p>
                                )}

                                <div className="flex gap-sm flex-wrap mb-sm">
                                    {currentCategoryData.level && (
                                        <span className="tag" style={{ background: '#e0e0e0', color: '#333' }}>
                                            📊 {currentCategoryData.level}
                                        </span>
                                    )}
                                    {currentCategoryData.language && (
                                        <span className="tag" style={{ background: '#e0e0e0', color: '#333' }}>
                                            🌐 {currentCategoryData.language}
                                        </span>
                                    )}
                                    {currentCategoryData.tags?.map(tag => (
                                        <span key={tag} className="tag text-muted">#{tag}</span>
                                    ))}
                                </div>
                                <div className="text-muted" style={{ fontSize: '12px' }}>
                                    {filteredTexts.length} 個字詞
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleExportClick}
                            >
                                📤 匯出 / 分享
                            </button>
                        </div>
                    </div>
                )}

                {/* Export Modal */}
                {showExport && exportLibrary && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <ContentExporter
                                library={exportLibrary}
                                onClose={() => {
                                    setShowExport(false);
                                    setExportLibrary(null);
                                }}
                            />
                        </div>
                    </div>
                )}

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

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                }
            `}</style>
        </div>
    );
}

