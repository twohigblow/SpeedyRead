/**
 * BottomNav Component
 * Fixed bottom navigation for child-friendly access
 */
import { NavLink } from 'react-router-dom';

export default function BottomNav() {
    const navItems = [
        { to: '/', icon: '🏠', label: '首頁' },
        { to: '/library', icon: '📚', label: '書庫' },
        { to: '/playlist', icon: '🎵', label: '播放列表' },
        { to: '/add', icon: '➕', label: '新增' },
        { to: '/settings', icon: '⚙️', label: '設定' },
    ];

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
