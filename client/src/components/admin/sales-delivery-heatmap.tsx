import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface SalesDeliveryHeatPoint {
  lat: number;
  lng: number;
  weight: number;
  timestamp?: string;
}

function FitDeliveryPoints({ points }: { points: SalesDeliveryHeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = points.filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );
    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lng], 13);
    } else {
      map.fitBounds(
        validPoints.map((point) => [point.lat, point.lng]) as LatLngBoundsExpression,
        { padding: [32, 32], maxZoom: 14 },
      );
    }

    window.setTimeout(() => map.invalidateSize(), 0);
  }, [map, points]);

  return null;
}

export function SalesDeliveryHeatmap({
  points,
  heightClass = "h-[460px]",
}: {
  points: SalesDeliveryHeatPoint[];
  heightClass?: string;
}) {
  const validPoints = points.filter(
    (point) =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180,
  );
  const center: LatLngTuple = validPoints.length
    ? [validPoints[0].lat, validPoints[0].lng]
    : [33.3128, 44.3661];

  return (
    <div className={`${heightClass} overflow-hidden rounded-lg border`} dir="ltr">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitDeliveryPoints points={validPoints} />
        {validPoints.map((point, index) => (
          <CircleMarker
            key={`${point.lat}-${point.lng}-${point.timestamp || index}`}
            center={[point.lat, point.lng]}
            radius={Math.min(34, 10 + Math.sqrt(Math.max(1, point.weight)) * 6)}
            pathOptions={{
              color: point.weight >= 5 ? "#b91c1c" : point.weight >= 2 ? "#ea580c" : "#f59e0b",
              fillColor: point.weight >= 5 ? "#dc2626" : point.weight >= 2 ? "#f97316" : "#fbbf24",
              fillOpacity: 0.34,
              opacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <strong>Delivered sale</strong>
                <div>{point.weight} deliveries in this area</div>
                {point.timestamp && <div>{new Date(point.timestamp).toLocaleString()}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}