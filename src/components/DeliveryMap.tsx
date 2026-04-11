import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
// Using CDN URLs to avoid build issues with image imports
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const courierIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Location {
  lat: number;
  lng: number;
  label?: string;
  type: 'store' | 'courier' | 'delivery';
  id?: string;
}

interface Route {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color?: string;
}

interface DeliveryMapProps {
  locations: Location[];
  routes?: Route[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

// Component to update map view when center changes
function MapUpdater({ center, zoom }: { center: { lat: number; lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

export default function DeliveryMap({ locations, routes = [], center = { lat: -23.550520, lng: -46.633308 }, zoom = 13 }: DeliveryMapProps) {
  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={zoom} />

        {locations.map((loc, idx) => (
          <Marker 
            key={idx} 
            position={[loc.lat, loc.lng]}
            icon={loc.type === 'store' ? storeIcon : loc.type === 'courier' ? courierIcon : deliveryIcon}
          >
            {loc.label && <Popup>{loc.label}</Popup>}
          </Marker>
        ))}

        {routes.map((route, idx) => (
          <Polyline 
            key={idx} 
            positions={[
              [route.from.lat, route.from.lng],
              [route.to.lat, route.to.lng]
            ]}
            pathOptions={{ color: route.color || 'blue', dashArray: '10, 10', weight: 3, opacity: 0.6 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
