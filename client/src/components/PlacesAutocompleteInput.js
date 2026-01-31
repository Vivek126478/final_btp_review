import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { loadGoogleMaps } from '../utils/googleMaps';

const PlacesAutocompleteInput = ({
  label,
  value,
  onChange,
  onPlaceSelected,
  required = false,
  placeholder = '',
  disabled = false
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);

  const inputId = useMemo(() => {
    const safe = (label || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `places-${safe}`;
  }, [label]);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted) return;
        if (!inputRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
          types: ['geocode']
        });

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();

          const formatted = place.formatted_address || place.name || '';
          if (formatted) {
            onChange(formatted);
          }

          const location = place.geometry?.location;
          const lat = typeof location?.lat === 'function' ? location.lat() : null;
          const lng = typeof location?.lng === 'function' ? location.lng() : null;

          if (typeof onPlaceSelected === 'function') {
            onPlaceSelected({
              address: formatted,
              lat,
              lng,
              place
            });
          }
        });

        autocompleteRef.current = ac;
        setMapsReady(true);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Google Maps load error:', error);
        toast.error(error.message || 'Failed to load Google Maps');
      });

    return () => {
      isMounted = false;
      autocompleteRef.current = null;
    };
  }, [onChange, onPlaceSelected]);

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        required={required}
        placeholder={placeholder}
        disabled={disabled}
      />
      <p className="mt-1 text-xs text-gray-500">
        {mapsReady ? 'Autocomplete enabled' : 'Type manually (Google autocomplete loading...)'}
      </p>
    </div>
  );
};

export default PlacesAutocompleteInput;
