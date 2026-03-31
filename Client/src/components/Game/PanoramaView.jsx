import React, { useEffect, useRef, useState } from 'react';

const PanoramaView = ({ lat, lng, mapProvider, movementAllowed }) => {
  const panoramaRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mapProvider === 'google') {
      initGooglePanorama();
    } else if (mapProvider === 'yandex') {
      initYandexPanorama();
    }
  }, [lat, lng, mapProvider]);

  const initGooglePanorama = () => {
    if (!window.google || !window.google.maps) {
      // Если Google Maps не загружен, показываем fallback
      setError('Google Maps не загружен. Добавьте API ключ.');
      return;
    }

    try {
      const panorama = new window.google.maps.StreetViewPanorama(
        panoramaRef.current,
        {
          position: { lat, lng },
          pov: { heading: Math.random() * 360, pitch: 0 },
          zoom: 1,
          addressControl: false,
          showRoadLabels: false,
          enableCloseButton: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          linksControl: movementAllowed,
          panControl: true,
          zoomControl: true,
        }
      );

      // Проверяем наличие панорамы
      const sv = new window.google.maps.StreetViewService();
      sv.getPanorama(
        { location: { lat, lng }, radius: 5000 },
        (data, status) => {
          if (status !== 'OK') {
            setError('Панорама недоступна для этой локации');
          }
        }
      );
    } catch (e) {
      setError('Ошибка загрузки панорамы');
    }
  };

  const initYandexPanorama = () => {
    if (!window.ymaps) {
      setError('Yandex Maps не загружен');
      return;
    }

    window.ymaps.ready(() => {
      try {
        window.ymaps.panorama.locate([lat, lng]).done(
          (panoramas) => {
            if (panoramas.length > 0) {
              const player = new window.ymaps.panorama.Player(
                panoramaRef.current,
                panoramas[0],
                {
                  direction: [Math.random() * 360, 0],
                  controls: ['zoomControl'],
                  suppressMapOpenBlock: true,
                }
              );
            } else {
              setError('Панорама Яндекс недоступна');
            }
          },
          (err) => {
            setError('Ошибка загрузки панорамы Яндекс');
          }
        );
      } catch (e) {
        setError('Ошибка Yandex Maps');
      }
    });
  };

  if (error) {
    return (
      <div className="panorama-fallback">
        <div className="panorama-static">
          <img
            src={`https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${lat},${lng}&fov=90&heading=${Math.random() * 360}&pitch=0&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}`}
            alt="Street View"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="panorama-error">
            <p>🌍 {error}</p>
            <p className="hint">Координаты: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panoramaRef}
      className="panorama-container"
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  );
};

export default PanoramaView;
