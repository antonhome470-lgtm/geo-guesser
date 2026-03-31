import React, { useEffect, useRef } from 'react';
import { formatDistance } from '../../utils/distance';

const RoundResults = ({
  results,
  scores,
  userId,
  isHost,
  onNextRound,
  isLastRound,
  mapProvider,
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      renderResultsMap();
    }
  }, [results]);

  const renderResultsMap = () => {
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: results.location.lat, lng: results.location.lng },
      zoom: 4,
      streetViewControl: false,
    });

    // Маркер правильного ответа
    const correctMarker = new window.google.maps.Marker({
      position: { lat: results.location.lat, lng: results.location.lng },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: '#fff',
        scale: 14,
      },
      title: `✅ ${results.location.name}`,
    });

    // Метки всех игроков
    const colors = ['#667eea', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: results.location.lat, lng: results.location.lng });

    results.guesses.forEach((guess, idx) => {
      if (guess.distance < 0) return; // Не ответил

      const marker = new window.google.maps.Marker({
        position: { lat: guess.lat, lng: guess.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: colors[idx % colors.length],
          fillOpacity: 0.8,
          strokeWeight: 2,
          strokeColor: '#fff',
          scale: 8,
        },
        title: `${guess.playerName}: ${formatDistance(guess.distance)}`,
      });

      // Линия от предположения к правильному ответу
      new window.google.maps.Polyline({
        path: [
          { lat: guess.lat, lng: guess.lng },
          { lat: results.location.lat, lng: results.location.lng },
        ],
        map,
        strokeColor: colors[idx % colors.length],
        strokeOpacity: 0.5,
        strokeWeight: 2,
        geodesic: true,
      });

      bounds.extend({ lat: guess.lat, lng: guess.lng });
    });

    map.fitBounds(bounds, 50);
  };

  const sortedGuesses = [...results.guesses].sort((a, b) => b.score - a.score);
  const myGuess = results.guesses.find(g => g.playerId === userId);

  return (
    <div className="round-results">
      <div className="results-header">
        <h2>📍 Раунд {results.roundNumber} — Результаты</h2>
        <div className="location-reveal">
          <h3>{results.location.name}</h3>
          <p>{results.location.country}</p>
        </div>
      </div>

      <div className="results-content">
        <div className="results-map" ref={mapRef} style={{ height: '400px' }} />

        <div className="results-table">
          <h3>🏅 Результаты раунда</h3>
          {sortedGuesses.map((guess, idx) => (
            <div
              key={guess.playerId}
              className={`result-row ${guess.playerId === userId ? 'my-result' : ''}`}
            >
              <span className="result-rank">#{idx + 1}</span>
              <span className="result-name">{guess.playerName}</span>
              <span className="result-distance">
                {formatDistance(guess.distance)}
              </span>
              <span className="result-score">+{guess.score}</span>
            </div>
          ))}
        </div>

        {myGuess && (
          <div className="my-round-result">
            <p>Ваш результат: <strong>{formatDistance(myGuess.distance)}</strong></p>
            <p>Очков: <strong>+{myGuess.score}</strong></p>
          </div>
        )}
      </div>

      <div className="results-actions">
        {isHost && (
          <button className="btn btn-primary btn-lg" onClick={onNextRound}>
            {isLastRound ? '🏆 Завершить игру' : '▶️ Следующий раунд'}
          </button>
        )}
        {!isHost && (
          <p className="waiting-host">⏳ Ожидаем хоста...</p>
        )}
      </div>
    </div>
  );
};

export default RoundResults;
