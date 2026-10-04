'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDistanceToNow } from 'date-fns'
import type { Vehicle } from '@/types/api'
import { getVehicleMapStatus, type MarkerStatus } from '@/features/fleet-map/utils'

// ─── Marker colors ────────────────────────────────────────────────────────────

const MARKER_COLOR: Record<MarkerStatus, string> = {
  moving:  '#10b981',
  idle:    '#f59e0b',
  offline: '#94a3b8',
}

function createMarkerIcon(status: MarkerStatus, isSelected: boolean) {
  const color  = MARKER_COLOR[status]
  const size   = isSelected ? 36 : 28
  const tipH   = isSelected ? 10 : 8
  const border = isSelected ? '3px solid white' : '2px solid white'
  const shadow = isSelected
    ? '0 0 0 3px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.35)'
    : '0 2px 8px rgba(0,0,0,0.25)'

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size + tipH}px;">
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:${border};
          border-radius:50%;
          box-shadow:${shadow};
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13 8 13.67 8 14.5 7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:${tipH - 2}px solid transparent;
          border-right:${tipH - 2}px solid transparent;
          border-top:${tipH}px solid ${color};
        "></div>
      </div>`,
    iconSize:    [size, size + tipH],
    iconAnchor:  [size / 2, size + tipH],
    popupAnchor: [0, -(size + tipH + 4)],
  })
}

// ─── Fly-to helper ────────────────────────────────────────────────────────────

function FlyToVehicle({ vehicle }: { vehicle: Vehicle | null }) {
  const map = useMap()
  useEffect(() => {
    if (vehicle?.current_location) {
      map.flyTo(
        [vehicle.current_location.latitude, vehicle.current_location.longitude],
        15,
        { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 1.2 },
      )
    }
  }, [vehicle, map])
  return null
}

// ─── Map ──────────────────────────────────────────────────────────────────────

interface VehicleMapProps {
  fitRequest?: number
  vehicles:        Vehicle[]
  selectedVehicle: Vehicle | null
  onVehicleClick:  (v: Vehicle) => void
}

// Lagos as a sensible default center
const DEFAULT_CENTER: [number, number] = [6.5244, 3.3792]

function FitFleet({ vehicles, request }: { vehicles: Vehicle[]; request: number }) {
  const map = useMap()
  const fitted = useRef(false)
  const previousRequest = useRef(request)
  useEffect(() => {
    const requested = previousRequest.current !== request
    previousRequest.current = request
    if (!vehicles.length || (fitted.current && !requested)) return
    const points = vehicles.map(v => [v.current_location!.latitude, v.current_location!.longitude] as [number, number])
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14, animate: false })
    fitted.current = true
  }, [vehicles, request, map])
  return null
}

export function VehicleMap({ vehicles, selectedVehicle, onVehicleClick, fitRequest = 0 }: VehicleMapProps) {
  const mapped = vehicles.filter((v) => v.current_location != null)

  const initialCenter: [number, number] = mapped[0]?.current_location
    ? [mapped[0].current_location.latitude, mapped[0].current_location.longitude]
    : DEFAULT_CENTER

  return (
    <MapContainer
      center={initialCenter}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToVehicle vehicle={selectedVehicle} />
      <FitFleet vehicles={mapped} request={fitRequest} />

      {mapped.map((vehicle) => {
        const loc      = vehicle.current_location!
        const status   = getVehicleMapStatus(vehicle)
        const selected = selectedVehicle?.id === vehicle.id

        return (
          <Marker
            key={vehicle.id}
            position={[loc.latitude, loc.longitude]}
            icon={createMarkerIcon(status, selected)}
            eventHandlers={{ click: () => onVehicleClick(vehicle) }}
            zIndexOffset={selected ? 1000 : 0}
          >
            <Popup minWidth={200}>
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2px 0' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px' }}>
                    {vehicle.plate_number}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: '99px',
                    background: status === 'moving' ? '#d1fae5' : status === 'idle' ? '#fef3c7' : '#f1f5f9',
                    color: status === 'moving' ? '#059669' : status === 'idle' ? '#d97706' : '#64748b',
                  }}>
                    {status}
                  </span>
                </div>

                {/* Make / model */}
                {(vehicle.make || vehicle.model) && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    {[vehicle.make, vehicle.model, vehicle.year ? `(${vehicle.year})` : ''].filter(Boolean).join(' ')}
                  </div>
                )}

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '6px 8px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Speed</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {loc.speed != null ? `${loc.speed} km/h` : '—'}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '6px 8px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Heading</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {loc.heading != null ? `${loc.heading}°` : '—'}
                    </div>
                  </div>
                </div>

                {/* Driver */}
                {vehicle.driver && (
                  <div style={{ fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginBottom: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Driver — </span>
                    <strong>{vehicle.driver.name}</strong>
                  </div>
                )}

                {/* Org */}
                {vehicle.organization && (
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {vehicle.organization.name}
                  </div>
                )}

                {/* Timestamp */}
                {loc.timestamp && (
                  <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '6px' }}>
                    {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true })}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
