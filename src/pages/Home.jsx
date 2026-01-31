/**
 * Home Page
 * Dashboard with quick access and recent texts
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecentTexts, getCategories } from '../services/db';
import InstallPrompt from '../components/InstallPrompt';

export default function Home() {
    const [recentTexts, setRecentTexts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [texts, cats] = await Promise.all([
                getRecentTexts(5),
                getCategories()
            ]);
            setRecentTexts(texts);
            setCategories(cats);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div className="page-header" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: 'var(--space-2xl)' }}>
                    <h1 className="page-title" style={{
                        fontSize: 'var(--font-size-3xl)',
                        textAlign: 'center'
                    }}>
                        ⚡ SpeedyRead
                    </h1>
                    <p className="text-muted text-center">
                        高速聽力訓練
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-2 gap-md mb-lg mt-lg">
                    <Link to="/add" className="btn btn-primary btn-large">
                        ➕ 新增文字
                    </Link>
                    <Link to="/library" className="btn btn-secondary btn-large">
                        📚 我的書庫
                    </Link>
                </div>

                {/* Recent Texts */}
                <div className="mt-xl">
                    <h3 className="mb-md">最近練習</h3>

                    {loading ? (
                        <div className="text-center">
                            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                        </div>
                    ) : recentTexts.length === 0 ? (
                        <div className="card text-center">
                            <p className="text-muted">還沒有任何文字</p>
                            <Link to="/add" className="btn btn-primary mt-md">
                                開始新增
                            </Link>
                        </div>
                    ) : (
                        <div className="recent-list">
                            {recentTexts.map(text => (
                                <Link
                                    key={text.id}
                                    to={`/reader/${text.id}`}
                                    className="card card-interactive mb-sm"
                                    style={{ display: 'block', textDecoration: 'none' }}
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
                                        {text.content.substring(0, 50)}...
                                    </p>
                                    {text.tags?.length > 0 && (
                                        <div className="flex gap-sm mt-sm">
                                            {text.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Categories Quick Access */}
                {categories.length > 0 && (
                    <div className="mt-xl">
                        <h3 className="mb-md">分類</h3>
                        <div className="grid grid-2 gap-sm">
                            {categories.slice(0, 4).map(cat => (
                                <Link
                                    key={cat.id}
                                    to={`/library?category=${cat.id}`}
                                    className="card card-interactive text-center"
                                >
                                    <span style={{ fontSize: '24px' }}>📁</span>
                                    <div className="mt-sm">{cat.name}</div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <InstallPrompt />
        </div>
    );
}
