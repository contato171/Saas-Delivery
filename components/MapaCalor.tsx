"use client";

import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Sub-componente mágico para controlar a câmera do satélite internamente
function ControleCamera({ centro }: { centro: [number, number] }) {
  const map = useMap();
  
  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // A função flyTo cria uma animação cinematográfica de volta ao centro
        map.flyTo(centro, 14, { animate: true, duration: 1.5 });
      }}
      className="absolute top-4 right-4 z-[400] bg-white text-zinc-700 p-2.5 rounded-lg shadow-md border border-zinc-200 hover:bg-zinc-50 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-bold"
      title="Recentralizar na Loja"
    >
      <LocateFixed size={18} />
      <span className="hidden sm:inline">Recentralizar</span>
    </button>
  );
}

export default function MapaCalor({ centro, bairros }: { centro: [number, number], bairros: any[] }) {
  return (
    <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden shadow-inner border border-zinc-200 relative z-0">
      <MapContainer 
        center={centro} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true} // <-- Scroll do mouse liberado aqui!
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* O nosso novo botão de controle de câmera */}
        <ControleCamera centro={centro} />
        
        {bairros.map((b, i) => (
          <div key={i}>
            {/* AURA DE CALOR: O raio cresce em metros conforme o volume de pedidos */}
            <Circle 
              center={[b.lat, b.lng]} 
              radius={Math.min(b.count * 120, 800)} 
              pathOptions={{ 
                color: 'transparent', 
                fillColor: b.colorHex, 
                fillOpacity: 0.15 
              }} 
            />
            
            {/* PONTO CENTRAL: O epicentro dos pedidos */}
            <CircleMarker
              center={[b.lat, b.lng]}
              radius={8}
              pathOptions={{ 
                fillColor: b.colorHex, 
                color: '#ffffff', 
                weight: 2,
                fillOpacity: 1
              }}
            >
              <Popup>
                <div className="text-center font-sans">
                  <strong className="block text-zinc-900 text-sm">{b.name}</strong>
                  <span className="text-xs font-bold" style={{ color: b.colorHex }}>{b.nivel}</span>
                  <span className="block text-xs text-zinc-500 mt-1">{b.count} pedidos recentes</span>
                </div>
              </Popup>
            </CircleMarker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}