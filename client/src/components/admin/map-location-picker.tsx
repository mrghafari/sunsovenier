import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}

function MapClickHandler({ onChange }: Pick<MapLocationPickerProps, 'onChange'>) {
  useMapEvents({
    click(event) {
      onChange(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      );
    },
  });

  return null;
}

function MapCenter({ position }: { position: LatLngTuple }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);

  return null;
}

export function MapLocationPicker({
  latitude,
  longitude,
  onChange,
}: MapLocationPickerProps) {
  const position: LatLngTuple = [latitude, longitude];

  return (
    <div className="h-80 overflow-hidden rounded-lg border" dir="ltr">
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter position={position} />
        <MapClickHandler onChange={onChange} />
        <CircleMarker
          center={position}
          radius={10}
          pathOptions={{ color: '#ffffff', fillColor: '#dc2626', fillOpacity: 1, weight: 3 }}
        />
      </MapContainer>
    </div>
  );
}