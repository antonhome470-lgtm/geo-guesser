/**
 * Сервис для работы с картами (Google Maps, Yandex Maps)
 * Абстракция над провайдерами карт
 */

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const YANDEX_MAPS_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY || '';

// Статусы загрузки
let googleMapsLoaded = false;
let yandexMapsLoaded = false;
let googleMapsLoading = false;
let yandexMapsLoading = false;

/**
 * Загрузка Google Maps API
 */
export function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (googleMapsLoaded && window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    if (googleMapsLoading) {
      // Ждём загрузки
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          googleMapsLoaded = true;
          resolve(window.google.maps);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout loading Google Maps'));
      }, 15000);
      return;
    }

    if (!GOOGLE_MAPS_KEY) {
      reject(new Error('Google Maps API key not provided'));
      return;
    }

    googleMapsLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;

    window.__googleMapsCallback = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      delete window.__googleMapsCallback;
      resolve(window.google.maps);
    };

    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Загрузка Yandex Maps API
 */
export function loadYandexMaps() {
  return new Promise((resolve, reject) => {
    if (yandexMapsLoaded && window.ymaps) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }

    if (yandexMapsLoading) {
      const checkInterval = setInterval(() => {
        if (window.ymaps) {
          clearInterval(checkInterval);
          yandexMapsLoaded = true;
          window.ymaps.ready(() => resolve(window.ymaps));
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout loading Yandex Maps'));
      }, 15000);
      return;
    }

    if (!YANDEX_MAPS_KEY) {
      reject(new Error('Yandex Maps API key not provided'));
      return;
    }

    yandexMapsLoading = true;

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_KEY}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      yandexMapsLoaded = true;
      yandexMapsLoading = false;
      window.ymaps.ready(() => resolve(window.ymaps));
    };

    script.onerror = () => {
      yandexMapsLoading = false;
      reject(new Error('Failed to load Yandex Maps'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Загрузка нужного провайдера карт
 */
export async function loadMapProvider(provider) {
  switch (provider) {
    case 'google':
      return loadGoogleMaps();
    case 'yandex':
      return loadYandexMaps();
    default:
      return loadGoogleMaps();
  }
}

/**
 * Создание панорамы (Street View)
 */
export async function createPanorama(container, lat, lng, provider, options = {}) {
  const {
    movementAllowed = true,
    zoomAllowed = true,
    compassAllowed = true,
  } = options;

  if (provider === 'yandex') {
    return createYandexPanorama(container, lat, lng, options);
  }
  return createGooglePanorama(container, lat, lng, options);
}

/**
 * Google Street View панорама
 */
async function createGooglePanorama(container, lat, lng, options) {
  const maps = await loadGoogleMaps();

  return new Promise((resolve, reject) => {
    // Сначала проверяем доступность панорамы
    const sv = new maps.StreetViewService();

    sv.getPanorama(
      {
        location: { lat, lng },
        radius: 5000, // Ищем панораму в радиусе 5 км
        preference: maps.StreetViewPreference.NEAREST,
        source: maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (status !== 'OK') {
          reject(new Error(`Street View unavailable: ${status}`));
          return;
        }

        const panorama = new maps.StreetViewPanorama(container, {
          position: data.location.latLng,
          pov: {
            heading: Math.random() * 360,
            pitch: 0,
          },
          zoom: 1,
          // Управление
          addressControl: false,
          showRoadLabels: false,
          enableCloseButton: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          // Настраиваемые опции
          linksControl: options.movementAllowed !== false,
          panControl: true,
          zoomControl: options.zoomAllowed !== false,
          // Скрываем подсказки о местоположении
          addressControlOptions: { position: maps.ControlPosition.BOTTOM_CENTER },
        });

        // Запрещаем перемещение если нужно
        if (options.movementAllowed === false) {
          panorama.setOptions({
            clickToGo: false,
            linksControl: false,
          });
        }

        resolve({
          panorama,
          actualPosition: {
            lat: data.location.latLng.lat(),
            lng: data.location.latLng.lng(),
          },
          provider: 'google',
        });
      }
    );
  });
}

/**
 * Yandex Panorama
 */
async function createYandexPanorama(container, lat, lng, options) {
  const ymaps = await loadYandexMaps();

  return new Promise((resolve, reject) => {
    ymaps.panorama.locate([lat, lng], { layer: 'yandex#panorama' }).done(
      (panoramas) => {
        if (panoramas.length === 0) {
          reject(new Error('Yandex Panorama unavailable'));
          return;
        }

        const player = new ymaps.panorama.Player(
          container,
          panoramas[0],
          {
            direction: [Math.random() * 360, 0],
            controls: options.zoomAllowed !== false ? ['zoomControl'] : [],
            suppressMapOpenBlock: true,
          }
        );

        const pos = panoramas[0].getPosition();

        resolve({
          panorama: player,
          actualPosition: {
            lat: pos[0],
            lng: pos[1],
          },
          provider: 'yandex',
        });
      },
      (err) => {
        reject(new Error('Yandex Panorama error: ' + err.message));
      }
    );
  });
}

/**
 * Создание карты для выбора ответа
 */
export async function createPickerMap(container, options = {}) {
  try {
    const maps = await loadGoogleMaps();

    const map = new maps.Map(container, {
      center: options.center || { lat: 20, lng: 0 },
      zoom: options.zoom || 2,
      minZoom: 2,
      maxZoom: 18,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      mapTypeControlOptions: {
        style: maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: maps.ControlPosition.TOP_LEFT,
      },
      styles: options.darkMode !== false ? getDarkMapStyles() : [],
    });

    return { map, maps, provider: 'google' };
  } catch (e) {
    console.warn('Google Maps unavailable, using fallback');
    return { map: null, maps: null, provider: 'fallback' };
  }
}

/**
 * Создание карты для результатов
 */
export async function createResultsMap(container, actualLocation, guesses) {
  try {
    const maps = await loadGoogleMaps();

    const map = new maps.Map(container, {
      center: actualLocation,
      zoom: 4,
      streetViewControl: false,
      mapTypeControl: false,
    });

    const bounds = new maps.LatLngBounds();
    bounds.extend(actualLocation);

    // Маркер правильного ответа
    new maps.Marker({
      position: actualLocation,
      map,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: '#fff',
        scale: 14,
      },
      zIndex: 100,
      title: '✅ Правильный ответ',
    });

    // Маркеры игроков
    const colors = ['#667eea', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

    guesses.forEach((guess, idx) => {
      if (guess.distance < 0) return;

      const color = colors[idx % colors.length];
      const position = { lat: guess.lat, lng: guess.lng };

      // Маркер
      new maps.Marker({
        position,
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.85,
          strokeWeight: 2,
          strokeColor: '#fff',
          scale: 8,
        },
        title: `${guess.playerName}: ${Math.round(guess.distance)} км`,
        zIndex: 50 - idx,
      });

      // Линия к правильному ответу
      new maps.Polyline({
        path: [position, actualLocation],
        map,
        strokeColor: color,
        strokeOpacity: 0.4,
        strokeWeight: 2,
        geodesic: true,
      });

      bounds.extend(position);
    });

    map.fitBounds(bounds, 60);

    return { map, maps };
  } catch (e) {
    console.error('Results map error:', e);
    return { map: null, maps: null };
  }
}

/**
 * URL статического изображения карты
 */
export function getStaticMapUrl(lat, lng, zoom = 10, size = '600x300') {
  if (!GOOGLE_MAPS_KEY) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=terrain&markers=color:red|${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
}

/**
 * URL Street View изображения
 */
export function getStreetViewUrl(lat, lng, size = '600x400', heading = 0) {
  if (!GOOGLE_MAPS_KEY) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&fov=90&heading=${heading}&pitch=0&key=${GOOGLE_MAPS_KEY}`;
}

/**
 * Проверка доступности провайдера
 */
export function isProviderAvailable(provider) {
  switch (provider) {
    case 'google':
      return !!GOOGLE_MAPS_KEY;
    case 'yandex':
      return !!YANDEX_MAPS_KEY;
    default:
      return false;
  }
}

/**
 * Тёмные стили карты
 */
function getDarkMapStyles() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
  ];
}
