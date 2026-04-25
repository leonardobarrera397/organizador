import { useState, useEffect } from 'react';

export function navigate(path) {
  window.location.hash = '#' + path;
}

export function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/login');
  useEffect(() => {
    const h = () => setHash(window.location.hash || '#/login');
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return hash;
}
