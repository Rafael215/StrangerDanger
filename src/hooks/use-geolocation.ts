import { useState, useEffect, useCallback } from "react";

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: true,
    error: null,
  });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lng: null, loading: false, error: "Geolocation not supported" });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({ lat: null, lng: null, loading: false, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { ...state, retry: request };
}
