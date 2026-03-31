import React from 'react';
import './Layout.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <span className="footer-logo">🌍 GeoGuesser</span>
          <span className="footer-copy">
            © {currentYear} GeoGuesser. Все права защищены.
          </span>
        </div>

        <div className="footer-center">
          <div className="footer-links">
            <a href="https://github.com/your-username/geo-guesser"
               target="_blank"
               rel="noopener noreferrer"
               className="footer-link"
            >
              ⭐ GitHub
            </a>
            <span className="footer-divider">•</span>
            <a href="/leaderboard" className="footer-link">
              🏆 Рейтинг
            </a>
            <span className="footer-divider">•</span>
            <span className="footer-link footer-version">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="footer-right">
          <div className="footer-tech">
            <span title="React">⚛️</span>
            <span title="Node.js">🟢</span>
            <span title="Socket.IO">🔌</span>
            <span title="MongoDB">🍃</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
