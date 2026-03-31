import React, { useState, useCallback, useRef, useEffect } from 'react';

const MapPicker = ({ onLocationSelect, selectedLocation, disabled }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    initMap();
  }, []);

  const initMap = () => {
    // Используем Google Maps для выбора
    if (window.google && window.google.maps) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        minZoom: 2,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'all',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
        ],
      });

      mapInstanceRef.current = map;

      map.addListener('click', (e) => {
        if (disabled) return;

        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };

        // Обновляем или создаём маркер
        if (markerRef.current) {
          markerRef.current.setPosition(location);
        } else {
          markerRef.current = new window.google.maps.Marker({
            position: location,
            map: map,
            draggable: !disabled,
            animation: window.google.maps.Animation.DROP,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#667eea',
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: '#fff',
              scale: 10,
            },
          });

          markerRef.current.addListener('dragend', (e) => {
            onLocationSelect({
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            });
          });
        }

        onLocationSelect(location);
      });
    } else {
      // Fallback: простая карта без Google Maps
      renderFallbackMap();
    }
  };

  const renderFallbackMap = () => {
    // Если Google Maps недоступен, используем OpenStreetMap через iframe
  };

  return (
    <div className="map-picker-container">
      <div
        ref={mapRef}
        className="map-picker"
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
      />

      {!window.google && (
        <div className="map-fallback">
          <p>Загрузка карты...</p>
          {/* Fallback с вводом координат вручную */}
          <div className="manual-coords">
            <input
              type="number"
              step="0.0001"
              placeholder="Широта"
              onChange={(e) => {
                const lat = parseFloat(e.target.value);
                if (selectedLocation) {
                  onLocationSelect({ ...selectedLocation, lat });
                } else {
                  onLocationSelect({ lat, lng: 0 });
                }
              }}
            />
            <input
              type="number"
              step="0.0001"
              placeholder="Долгота"
              onChange={(e) => {
                const lng = parseFloat(e.target.value);
                if (selectedLocation) {
                  onLocationSelect({ ...selectedLocation, lng });
                } else {
                  onLocationSelect({ lat: 0, lng });
                }
              }}
            />
          </div>
        </div>
      )}

      {selectedLocation && (
        <div className="selected-coords">
          📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default MapPicker;
