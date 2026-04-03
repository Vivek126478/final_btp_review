import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">${label}</span>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });
};

const startIcon = createIcon('#22c55e', 'A');
const endIcon = createIcon('#ef4444', 'B');

// Component to handle map bounds/center updates
const MapUpdater = ({ start, end }) => {
  const map = useMap();

  useEffect(() => {
    const hasStart = start && typeof start.lat === 'number' && typeof start.lng === 'number';
    const hasEnd = end && typeof end.lat === 'number' && typeof end.lng === 'number';

    if (hasStart && hasEnd) {
      const bounds = L.latLngBounds(
        [start.lat, start.lng],
        [end.lat, end.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (hasStart) {
      map.setView([start.lat, start.lng], 14);
    } else if (hasEnd) {
      map.setView([end.lat, end.lng], 14);
    }
  }, [map, start, end]);

  return null;
};

/**
 * OpenStreetMap Preview Component using Leaflet
 * Free, no API key required!
 */
const OpenStreetMapPreview = ({
  start,
  end,
  heightClassName = 'h-64',
  showRoute = false
}) => {
  const hasStart = start && typeof start.lat === 'number' && typeof start.lng === 'number';
  const hasEnd = end && typeof end.lat === 'number' && typeof end.lng === 'number';

  // Default center (IIIT Kottayam, India)
  const defaultCenter = [9.5791, 76.6229];
  const center = hasStart 
    ? [start.lat, start.lng] 
    : hasEnd 
      ? [end.lat, end.lng] 
      : defaultCenter;

  if (!hasStart && !hasEnd) {
    return (
      <div className={`${heightClassName} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm">Select locations to see map preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${heightClassName} rounded-lg overflow-hidden border border-gray-200`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater start={start} end={end} />

        {hasStart && (
          <Marker position={[start.lat, start.lng]} icon={startIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-green-600">📍 Pickup</strong>
                <p className="text-gray-600 mt-1">{start.address || 'Start Location'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {hasEnd && (
          <Marker position={[end.lat, end.lng]} icon={endIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-red-600">🏁 Drop-off</strong>
                <p className="text-gray-600 mt-1">{end.address || 'End Location'}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default OpenStreetMapPreview;
