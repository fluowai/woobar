import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { User } from '../data/users';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem'
};

const center = {
  lat: -23.550520,
  lng: -46.633308
};

interface Location {
  lat: number;
  lng: number;
  type: 'store' | 'courier' | 'delivery';
  label?: string;
  id?: string;
}

interface Route {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

interface GoogleDeliveryMapProps {
  locations: Location[];
  routes: Route[];
  apiKey: string;
}

export default function GoogleDeliveryMap({ locations, routes, apiKey }: GoogleDeliveryMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult[]>([]);

  // Fetch directions when routes change
  useEffect(() => {
    if (!isLoaded || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    const fetchDirections = async () => {
      const results: google.maps.DirectionsResult[] = [];
      
      for (const route of routes) {
        try {
          const result = await directionsService.route({
            origin: route.from,
            destination: route.to,
            travelMode: window.google.maps.TravelMode.DRIVING,
          });
          results.push(result);
        } catch (error) {
          console.error("Error fetching directions:", error);
        }
      }
      setDirections(results);
    };

    fetchDirections();
  }, [routes, isLoaded]);

  const [map, setMap] = React.useState(null);

  const onLoad = useCallback(function callback(map: any) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: any) {
    setMap(null);
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-100 rounded-2xl text-stone-400">
        Carregando Google Maps...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={13}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      }}
    >
      {/* Markers */}
      {locations.map((loc, idx) => (
        <Marker
          key={`${loc.type}-${idx}`}
          position={{ lat: loc.lat, lng: loc.lng }}
          label={loc.label ? { text: loc.label, color: "black", fontSize: "12px", fontWeight: "bold", className: "bg-white px-1 rounded" } : undefined}
          icon={
            loc.type === 'store' 
              ? { url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png" }
              : loc.type === 'courier'
                ? { url: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png" }
                : { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }
          }
        />
      ))}

      {/* Routes */}
      {directions.map((dir, idx) => (
        <DirectionsRenderer
          key={idx}
          directions={dir}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#9333ea", // Purple-600
              strokeOpacity: 0.6,
              strokeWeight: 4,
            },
          }}
        />
      ))}
    </GoogleMap>
  );
}
