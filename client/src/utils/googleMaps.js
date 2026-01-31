let loadingPromise = null;

export const loadGoogleMaps = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser'));
  }

  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(
      new Error('Missing REACT_APP_GOOGLE_MAPS_API_KEY. Add it to client/.env and restart the client.')
    );
  }

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';

    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve(window.google);
      } else {
        reject(new Error('Google Maps loaded but Places library is unavailable'));
      }
    };

    script.onerror = () => reject(new Error('Failed to load Google Maps script'));

    document.head.appendChild(script);
  });

  return loadingPromise;
};
