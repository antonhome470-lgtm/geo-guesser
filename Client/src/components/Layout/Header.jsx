import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import './Layout.css';

const Header = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <Link to="/" className="logo">
        🌍 GeoGuesser
      </Link>

      {user && (
        <nav className="nav">
          <Link to="/" className="nav-link">🏠 Лобби</Link>
          <Link to="/profile" className="nav-link">👤 Профиль</Link>
          <Link to="/leaderboard" className="nav-link">🏆 Рейтинг</Link>

          <div className="nav-user">
            <span className={`connection-status ${connected ? 'online' : 'offline'}`}>
              {connected ? '🟢' : '🔴'}
            </span>
            <span className="username">{user.username}</span>
            <button className="btn btn-sm btn-danger" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
