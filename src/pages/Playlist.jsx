/**
 * Playlist Manager Page
 * 
 * Manage dynamic playlists with multi-library queue,
 * per-repeat speed control, and sleep mode optimization.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    loadPlaylist,
    savePlaylist,
    createPlaylistItem,
    removeFromPlaylist,
    updatePlaylistItem,
    reorderPlaylist,
    estimatePlaylistDuration,
    formatDuration
} from '../services/playlist.js';
import { getAllLibraries } from '../services/db.js';
import LoopConfigurator from '../components/LoopConfigurator.jsx';

export default function Playlist() {
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState([]);
    const [libraries, setLibraries] = useState([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedLibrary, setSelectedLibrary] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const storedPlaylist = loadPlaylist();
        setPlaylist(storedPlaylist);

        const allLibraries = await getAllLibraries();
        setLibraries(allLibraries);
    };

    const handleAddLibrary = () => {
        if (!selectedLibrary) return;

        const library = libraries.find(lib => lib.id === selectedLibrary);
        const newItem = createPlaylistItem(library.id, library.name, {
            loops: [{ speed: 1.0, volume: 80, pitch: 0 }],
            gapBetweenLoops: 2000,
            sleepMode: false
        });

        const updated = [...playlist, newItem];
        setPlaylist(updated);
        savePlaylist(updated);

        setShowAddDialog(false);
        setSelectedLibrary(null);

        // Auto-open editing for the new item
        setEditingItem(newItem.id);
    };

    const handleRemove = (itemId) => {
        const updated = removeFromPlaylist(itemId);
        setPlaylist(updated);
        if (editingItem === itemId) {
            setEditingItem(null);
        }
    };

    const handleUpdateLoops = (itemId, loops) => {
        const updated = updatePlaylistItem(itemId, { loops });
        setPlaylist(updated);
    };

    const handleUpdateGap = (itemId, gap) => {
        const updated = updatePlaylistItem(itemId, { gapBetweenLoops: parseInt(gap) });
        setPlaylist(updated);
    };

    const handleToggleSleepMode = (itemId, sleepMode) => {
        const updated = updatePlaylistItem(itemId, { sleepMode });
        setPlaylist(updated);
    };

    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === index) return;

        const updated = reorderPlaylist(draggedIndex, index);
        setPlaylist(updated);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handlePlay = () => {
        if (playlist.length === 0) {
            alert('Please add libraries to playlist first');
            return;
        }
        navigate('/playlist-player');
    };

    const totalDuration = estimatePlaylistDuration(playlist);

    return (
        <div className="page playlist-page">
            {/* Header */}
            <header className="page-header">
                <div className="header-content">
                    <h1>🎵 Dynamic Playlist</h1>
                    <p>Create multi-library sequences with custom loop speeds</p>
                </div>

                <div className="header-actions">
                    {playlist.length > 0 && (
                        <button className="btn btn-primary" onClick={handlePlay}>
                            ▶️ Play Playlist
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Bar */}
            {playlist.length > 0 && (
                <div className="stats-bar">
                    <div className="stat">
                        <span className="stat-label">Libraries:</span>
                        <span className="stat-value">{playlist.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Total Loops:</span>
                        <span className="stat-value">
                            {playlist.reduce((sum, item) => sum + item.loops.length, 0)}
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Est. Duration:</span>
                        <span className="stat-value">{formatDuration(totalDuration)}</span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="content">
                {/* Empty State */}
                {playlist.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">🎵</div>
                        <h3>No Libraries in Playlist</h3>
                        <p>Add libraries to create your custom learning sequence</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowAddDialog(true)}
                        >
                            ➕ Add First Library
                        </button>
                    </div>
                )}

                {/* Playlist Items */}
                {playlist.length > 0 && (
                    <div className="playlist-items">
                        {playlist.map((item, index) => (
                            <div
                                key={item.id}
                                className={`playlist-item card ${draggedIndex === index ? 'dragging' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                {/* Item Header */}
                                <div className="item-header">
                                    <div className="drag-handle">
                                        <span>⋮⋮</span>
                                    </div>

                                    <div className="item-info">
                                        <div className="item-number">#{index + 1}</div>
                                        <div className="item-name">
                                            <h3>{item.name}</h3>
                                            <div className="item-meta">
                                                {item.loops.length} loop{item.loops.length !== 1 ? 's' : ''} •
                                                Gap: {item.gapBetweenLoops}ms
                                                {item.sleepMode && <span className="sleep-badge">🌙 Sleep</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="item-actions">
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                                        >
                                            {editingItem === item.id ? '▼' : '✏️'}
                                        </button>
                                        <button
                                            className="btn btn-icon btn-danger"
                                            onClick={() => handleRemove(item.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Item Editor (Expanded) */}
                                {editingItem === item.id && (
                                    <div className="item-editor">
                                        {/* Sleep Mode Toggle */}
                                        <div className="setting-row">
                                            <label className="toggle-label">
                                                <input
                                                    type="checkbox"
                                                    checked={item.sleepMode}
                                                    onChange={(e) => handleToggleSleepMode(item.id, e.target.checked)}
                                                    className="toggle"
                                                />
                                                <span>🌙 Sleep Mode</span>
                                            </label>
                                            <small>Auto-apply warmth filter, pitch shift, and volume decay</small>
                                        </div>

                                        {/* Gap Control */}
                                        <div className="setting-row">
                                            <label>
                                                Gap Between Loops: {item.gapBetweenLoops}ms
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10000"
                                                step="500"
                                                value={item.gapBetweenLoops}
                                                onChange={(e) => handleUpdateGap(item.id, e.target.value)}
                                                className="slider"
                                            />
                                        </div>

                                        {/* Loop Configurator */}
                                        <LoopConfigurator
                                            loops={item.loops}
                                            onChange={(loops) => handleUpdateLoops(item.id, loops)}
                                            sleepMode={item.sleepMode}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add Button */}
                        <button
                            className="add-item-btn"
                            onClick={() => setShowAddDialog(true)}
                        >
                            ➕ Add Library
                        </button>
                    </div>
                )}
            </div>

            {/* Add Library Dialog */}
            {showAddDialog && (
                <div className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>Add Library to Playlist</h3>
                            <button
                                className="btn btn-icon"
                                onClick={() => setShowAddDialog(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="dialog-content">
                            {libraries.length === 0 ? (
                                <div className="empty-message">
                                    <p>No libraries available. Create a library first!</p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => navigate('/library')}
                                    >
                                        Go to Library
                                    </button>
                                </div>
                            ) : (
                                <div className="library-list">
                                    {libraries.map(lib => (
                                        <div
                                            key={lib.id}
                                            className={`library-option ${selectedLibrary === lib.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedLibrary(lib.id)}
                                        >
                                            <div className="library-icon">📚</div>
                                            <div className="library-info">
                                                <div className="library-name">{lib.name}</div>
                                                <div className="library-meta">
                                                    {lib.wordCount || 0} words
                                                </div>
                                            </div>
                                            {selectedLibrary === lib.id && (
                                                <div className="check-icon">✓</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="dialog-footer">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowAddDialog(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddLibrary}
                                disabled={!selectedLibrary}
                            >
                                Add to Playlist
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .playlist-page {
                    padding-bottom: 80px;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 2px solid var(--border-color, #eee);
                }

                .header-content h1 {
                    margin: 0 0 4px 0;
                }

                .header-content p {
                    margin: 0;
                    color: #666;
                }

                .stats-bar {
                    display: flex;
                    gap: 24px;
                    padding: 16px 20px;
                    background: var(--bg-secondary, #f9f9f9);
                    border-bottom: 1px solid var(--border-color, #eee);
                }

                .stat {
                    display: flex;
                    gap: 8px;
                    align-items: baseline;
                }

                .stat-label {
                    font-size: 14px;
                    color: #666;
                }

                .stat-value {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--primary-color, #4CAF50);
                }

                .content {
                    padding: 20px;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                }

                .empty-icon {
                    font-size: 64px;
                    margin-bottom: 16px;
                }

                .empty-state h3 {
                    margin: 0 0 8px 0;
                }

                .empty-state p {
                    color: #666;
                    margin: 0 0 24px 0;
                }

                .playlist-items {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .playlist-item {
                    transition: all 0.2s;
                    cursor: move;
                }

                .playlist-item.dragging {
                    opacity: 0.5;
                    transform: scale(0.98);
                }

                .item-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                }

                .drag-handle {
                    cursor: grab;
                    color: #999;
                    font-size: 20px;
                    user-select: none;
                }

                .drag-handle:active {
                    cursor: grabbing;
                }

                .item-info {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .item-number {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--primary-color, #4CAF50);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 14px;
                }

                .item-name h3 {
                    margin: 0 0 4px 0;
                    font-size: 16px;
                }

                .item-meta {
                    font-size: 13px;
                    color: #666;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .sleep-badge {
                    background: #673AB7;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                }

                .item-actions {
                    display: flex;
                    gap: 4px;
                }

                .item-editor {
                    padding: 16px;
                    border-top: 1px solid var(--border-color, #ddd);
                    background: rgba(0,0,0,0.02);
                }

                .setting-row {
                    margin-bottom: 16px;
                }

                .setting-row label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    font-size: 14px;
                }

                .setting-row small {
                    display: block;
                    margin-top: 4px;
                    color: #666;
                    font-size: 12px;
                }

                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .slider {
                    width: 100%;
                }

                .add-item-btn {
                    width: 100%;
                    padding: 16px;
                    border: 2px dashed var(--border-color, #ddd);
                    background: transparent;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s;
                }

                .add-item-btn:hover {
                    border-color: var(--primary-color, #4CAF50);
                    background: rgba(76, 175, 80, 0.05);
                }

                .dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .dialog {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
                }

                .dialog-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid var(--border-color, #eee);
                }

                .dialog-header h3 {
                    margin: 0;
                }

                .dialog-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }

                .library-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .library-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border: 2px solid var(--border-color, #ddd);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .library-option:hover {
                    border-color: var(--primary-color, #4CAF50);
                    background: rgba(76, 175, 80, 0.05);
                }

                .library-option.selected {
                    border-color: var(--primary-color, #4CAF50);
                    background: rgba(76, 175, 80, 0.1);
                }

                .library-icon {
                    font-size: 24px;
                }

                .library-info {
                    flex: 1;
                }

                .library-name {
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .library-meta {
                    font-size: 13px;
                    color: #666;
                }

                .check-icon {
                    color: var(--primary-color, #4CAF50);
                    font-size: 24px;
                    font-weight: bold;
                }

                .dialog-footer {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                    padding: 20px;
                    border-top: 1px solid var(--border-color, #eee);
                }

                .empty-message {
                    text-align: center;
                    padding: 40px 20px;
                }

                @media (max-width: 768px) {
                    .stats-bar {
                        flex-wrap: wrap;
                        gap: 12px;
                    }

                    .item-header {
                        flex-wrap: wrap;
                    }

                    .item-info {
                        flex-basis: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
