import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../utils/googleMaps';

const MapPreview = ({
  start,
  end,
  heightClassName = 'h-64'
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted) return;
        if (!mapRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: 12.9716, lng: 77.5946 },
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        }

        setMapsReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setMapsReady(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady) return;
    if (!mapInstanceRef.current) return;

    const google = window.google;
    if (!google || !google.maps) return;

    const map = mapInstanceRef.current;

    const hasStart = start && typeof start.lat === 'number' && typeof start.lng === 'number';
    const hasEnd = end && typeof end.lat === 'number' && typeof end.lng === 'number';

    if (!hasStart && startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (!hasEnd && endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }

    if (hasStart) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = new google.maps.Marker({
          map,
          label: 'A'
        });
      }
      startMarkerRef.current.setPosition({ lat: start.lat, lng: start.lng });
    }

    if (hasEnd) {
      if (!endMarkerRef.current) {
        endMarkerRef.current = new google.maps.Marker({
          map,
          label: 'B'
        });
      }
      endMarkerRef.current.setPosition({ lat: end.lat, lng: end.lng });
    }

    if (hasStart && hasEnd) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: start.lat, lng: start.lng });
      bounds.extend({ lat: end.lat, lng: end.lng });
      map.fitBounds(bounds, 60);
    } else if (hasStart) {
      map.setCenter({ lat: start.lat, lng: start.lng });
      map.setZoom(14);
    } else if (hasEnd) {
      map.setCenter({ lat: end.lat, lng: end.lng });
      map.setZoom(14);
    }
  }, [mapsReady, start, end]);

  return (
    <div className={`w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-50 ${heightClassName}`}>
      {mapsReady ? (
        <div ref={mapRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
          Map preview unavailable (check API key and enable Maps JavaScript + Places)
        </div>
      )}
    </div>
  );
};

export default MapPreview;
