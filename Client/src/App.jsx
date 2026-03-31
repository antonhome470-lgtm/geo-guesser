import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Header from './components/Layout/Header';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CreateRoom from './components/Lobby/CreateRoom';
import RoomList from './components/Lobby/RoomList';
import GameRoom from './components/Game/GameRoom';
import UserProfile from './components/Profile/UserProfile';
import './App.css';

// Защищённый маршрут
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  return children;
};

// Главная страница (Лобби)
const LobbyPage = () => {
  const [activeTab, setActiveTab] = React.useState('rooms');

  return (
    <div className="lobby-container">
      <h1 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2.5rem' }}>
        🌍 GeoGuesser
      </h1>
      <p style={{ textAlign: 'center', marginBottom: '32px', color: 'rgba(255,255,255,0.5)' }}>
        Угадай место на карте!
      </p>

      <div className="lobby-tabs">
        <button
          className={`lobby-tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          🏠 Комнаты
        </button>
        <button
          className={`lobby-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Создать
        </button>
      </div>

      {activeTab === 'rooms' && <RoomList />}
      {activeTab === 'create' && <CreateRoom />}
    </div>
  );
};

// Страница рейтинга
const LeaderboardPage = () => {
  const [users, setUsers] = React.useState([]);

  React.useEffect(() => {
    fetch('/api/users/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data.success) setUsers(data.data);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>🏆 Рейтинг игроков</h2>
      <div>
        {users.map((u, idx) => (
          <div key={u._id} className="final-score-item" style={{
            background: idx === 0 ? 'rgba(245,158,11,0.15)' :
              idx === 1 ? 'rgba(156,163,175,0.15)' :
                idx === 2 ? 'rgba(180,83,9,0.15)' : 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 24px', borderRadius: 12, marginBottom: 8,
          }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', minWidth: 40 }}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
            </span>
            <span style={{ flex: 1, fontWeight: 500 }}>{u.username}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
              {u.stats?.gamesWon || 0} побед
            </span>
            <span style={{ fontWeight: 700, color: '#667eea' }}>
              {u.stats?.totalScore || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />

      {user && <Header />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <ProtectedRoute><LobbyPage /></ProtectedRoute>
        } />
        <Route path="/room/:code" element={
          <ProtectedRoute><GameRoom /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><UserProfile /></ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
