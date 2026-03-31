import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import './Profile.css';

const HeatMap = () => {
  const mapRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGuesses: 0,
    avgDistance: 0,
    bestRegion: '',
    worstRegion: '',
  });
  const [filter, setFilter] = useState('all'); // all, good, bad
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadHeatmapData();
  }, []);

  useEffect(() => {
    if (data.length > 0 && mapRef.current) {
      renderMap();
    }
  }, [data, filter, mapReady]);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/me/heatmap');

      if (res.data.success) {
        setData(res.data.data);
        calculateStats(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load heatmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (heatData) => {
    if (heatData.length === 0) return;

    const totalDistance = heatData.reduce((sum, d) => sum + (d.distance > 0 ? d.distance : 0), 0);
    const validGuesses = heatData.filter(d => d.distance >= 0);

    // Определяем регионы (грубо по координатам)
    const regions = {};
    heatData.forEach(d => {
      const region = getRegionName(d.actual.lat, d.actual.lng);
      if (!regions[region]) {
        regions[region] = { total: 0, distances: [] };
      }
      regions[region].total++;
      if (d.distance >= 0) {
        regions[region].distances.push(d.distance);
      }
    });

    let bestRegion = '';
    let worstRegion = '';
    let bestAvg = Infinity;
    let worstAvg = 0;

    Object.entries(regions).forEach(([name, data]) => {
      if (data.distances.length === 0) return;
      const avg = data.distances.reduce((a, b) => a + b, 0) / data.distances.length;
      if (avg < bestAvg) { bestAvg = avg; bestRegion = name; }
      if (avg > worstAvg) { worstAvg = avg; worstRegion = name; }
    });

    setStats({
      totalGuesses: heatData.length,
      avgDistance: validGuesses.length > 0
        ? Math.round(totalDistance / validGuesses.length)
        : 0,
      bestRegion,
      worstRegion,
    });
  };

  const getRegionName = (lat, lng) => {
    if (lat > 35 && lat < 70 && lng > -10 && lng < 40) return 'Европа';
    if (lat > 35 && lat < 70 && lng > 40 && lng < 180) return 'Азия (Север)';
    if (lat > -10 && lat < 35 && lng > 60 && lng < 150) return 'Азия (Юг)';
    if (lat > 25 && lat < 50 && lng > -130 && lng < -60) return 'Северная Америка';
    if (lat > -60 && lat < 15 && lng > -80 && lng < -35) return 'Южная Америка';
    if (lat > -35 && lat < 35 && lng > -20 && lng < 55) return 'Африка';
    if (lat > -50 && lat < -10 && lng > 110 && lng < 180) return 'Океания';
    if (lat > 50 && lat < 75 && lng > 20 && lng < 180) return 'Россия';
    return 'Другое';
  };

  const renderMap = () => {
    if (!window.google || !window.google.maps) {
      renderCanvasMap();
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2b' }] },
      ],
      streetViewControl: false,
      mapTypeControl: false,
    });

    const filteredData = getFilteredData();

    filteredData.forEach((item) => {
      const isGood = item.distance >= 0 && item.distance < 500;
      const isMedium = item.distance >= 500 && item.distance < 2000;

      // Маркер фактической позиции
      const color = item.distance < 0 ? '#888'
        : isGood ? '#10b981'
        : isMedium ? '#f59e0b'
        : '#ef4444';

      const opacity = item.distance < 0 ? 0.2
        : isGood ? 0.8
        : isMedium ? 0.6
        : 0.4;

      // Точка предположения
      new window.google.maps.Circle({
        center: { lat: item.guess.lat, lng: item.guess.lng },
        radius: Math.max(50000, item.distance * 500),
        map,
        fillColor: color,
        fillOpacity: opacity * 0.3,
        strokeColor: color,
        strokeOpacity: opacity,
        strokeWeight: 1,
      });

      // Маленький маркер
      new window.google.maps.Marker({
        position: { lat: item.guess.lat, lng: item.guess.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: opacity,
          strokeWeight: 1,
          strokeColor: '#fff',
          scale: 4,
        },
        title: `Дистанция: ${item.distance >= 0 ? Math.round(item.distance) + ' км' : 'нет ответа'}\nОчки: ${item.score}`,
      });

      // Линия к правильному ответу
      if (item.distance >= 0) {
        new window.google.maps.Polyline({
          path: [
            { lat: item.guess.lat, lng: item.guess.lng },
            { lat: item.actual.lat, lng: item.actual.lng },
          ],
          map,
          strokeColor: color,
          strokeOpacity: 0.15,
          strokeWeight: 1,
        });
      }
    });

    setMapReady(true);
  };

  const renderCanvasMap = () => {
    // Canvas fallback если Google Maps не загружен
    const canvas = document.createElement('canvas');
    canvas.width = mapRef.current.clientWidth;
    canvas.height = mapRef.current.clientHeight;
    mapRef.current.innerHTML = '';
    mapRef.current.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const filteredData = getFilteredData();

    filteredData.forEach((item) => {
      // Простая проекция Меркатора
      const x = ((item.guess.lng + 180) / 360) * canvas.width;
      const latRad = (item.guess.lat * Math.PI) / 180;
      const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * canvas.height;

      const isGood = item.distance >= 0 && item.distance < 500;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = isGood ? '#10b981' : item.distance < 2000 ? '#f59e0b' : '#ef4444';
      ctx.globalAlpha = 0.6;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px Inter';
    ctx.fillText(`${filteredData.length} предположений`, 10, canvas.height - 10);
  };

  const getFilteredData = () => {
    switch (filter) {
      case 'good':
        return data.filter(d => d.distance >= 0 && d.distance < 500);
      case 'bad':
        return data.filter(d => d.distance >= 2000);
      case 'medium':
        return data.filter(d => d.distance >= 500 && d.distance < 2000);
      default:
        return data;
    }
  };

  if (loading) {
    return (
      <div className="heatmap-loading">
        <div className="spinner" />
        <p>Загрузка тепловой карты...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="heatmap-empty">
        <h3>🗺️ Тепловая карта</h3>
        <p>Сыграйте несколько игр, чтобы увидеть свою тепловую карту!</p>
      </div>
    );
  }

  return (
    <div className="heatmap">
      <div className="heatmap-header">
        <h3>🗺️ Тепловая карта ваших предположений</h3>
        <p className="heatmap-subtitle">
          Визуализация {data.length} предположений
        </p>
      </div>

      {/* Фильтры */}
      <div className="heatmap-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все ({data.length})
        </button>
        <button
          className={`filter-btn good ${filter === 'good' ? 'active' : ''}`}
          onClick={() => setFilter('good')}
        >
          🟢 Точные ({data.filter(d => d.distance >= 0 && d.distance < 500).length})
        </button>
        <button
          className={`filter-btn medium ${filter === 'medium' ? 'active' : ''}`}
          onClick={() => setFilter('medium')}
        >
          🟡 Средние ({data.filter(d => d.distance >= 500 && d.distance < 2000).length})
        </button>
        <button
          className={`filter-btn bad ${filter === 'bad' ? 'active' : ''}`}
          onClick={() => setFilter('bad')}
        >
          🔴 Далёкие ({data.filter(d => d.distance >= 2000).length})
        </button>
      </div>

      {/* Карта */}
      <div
        ref={mapRef}
        className="heatmap-map"
        style={{ width: '100%', height: '500px', borderRadius: '16px' }}
      />

      {/* Легенда */}
      <div className="heatmap-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#10b981' }} />
          <span>&lt; 500 км — Отлично</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }} />
          <span>500–2000 км — Средне</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ef4444' }} />
          <span>&gt; 2000 км — Далеко</span>
        </div>
      </div>

      {/* Статистика по регионам */}
      <div className="heatmap-stats">
        <div className="heatmap-stat">
          <span className="heatmap-stat-label">📍 Всего предположений</span>
          <span className="heatmap-stat-value">{stats.totalGuesses}</span>
        </div>
        <div className="heatmap-stat">
          <span className="heatmap-stat-label">📏 Средняя дистанция</span>
          <span className="heatmap-stat-value">{stats.avgDistance} км</span>
        </div>
        <div className="heatmap-stat">
          <span className="heatmap-stat-label">🟢 Лучший регион</span>
          <span className="heatmap-stat-value">{stats.bestRegion || '—'}</span>
        </div>
        <div className="heatmap-stat">
          <span className="heatmap-stat-label">🔴 Слабый регион</span>
          <span className="heatmap-stat-value">{stats.worstRegion || '—'}</span>
        </div>
      </div>
    </div>
  );
};

export default HeatMap;
