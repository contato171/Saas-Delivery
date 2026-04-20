// @ts-nocheck
"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Pino Azul (Loja Principal)
const iconStore = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Pinos Roxos (Zonas Específicas)
const iconZone = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Componente invisível para capturar cliques e mover a câmera
function MapController({ center, onMapClick }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
    }
  });

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
    }
  }, [center, map]);

  return null;
}

export default function MapaRaio({ 
  center, 
  radiusKm, 
  onCenterChange,
  zonas = [],
  onAddZonaClick,
  onZonaDragEnd,
  modoAdicaoZona
}: any) {
  const radiusMeters = (radiusKm || 0) * 1000;

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', zIndex: 10, borderRadius: '0.75rem', cursor: modoAdicaoZona ? 'crosshair' : 'grab' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* LOJA PRINCIPAL (Pino Azul Arrastável) */}
      <Marker 
        position={center} 
        icon={iconStore} 
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const position = e.target.getLatLng();
            if (onCenterChange) onCenterChange([position.lat, position.lng]);
          },
        }}
      />
      {radiusMeters > 0 && (
        <Circle 
          center={center} 
          radius={radiusMeters} 
          pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.15, weight: 2, dashArray: '5, 5' }} 
        />
      )}

      {/* ZONAS CUSTOMIZADAS (Pinos Roxos Arrastáveis) */}
      {zonas.map((zona: any, index: number) => (
        <div key={zona.id || index}>
          <Marker 
            position={[zona.lat, zona.lng]} 
            icon={iconZone}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const position = e.target.getLatLng();
                if (onZonaDragEnd) onZonaDragEnd(index, position.lat, position.lng);
              },
            }}
          />
          {zona.raio > 0 && (
            <Circle 
              center={[zona.lat, zona.lng]} 
              radius={zona.raio * 1000} 
              pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.25, weight: 2 }} 
            />
          )}
        </div>
      ))}

      <MapController center={center} onMapClick={onAddZonaClick} />
    </MapContainer>
  );
}