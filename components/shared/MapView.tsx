'use client'

import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MapMarker {
  id: string | number
  lat: number
  lng: number
  label?: string
  status?: 'moving' | 'idle' | 'offline'
}

interface MapViewProps {
  markers?: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  className?: string
  onMarkerClick?: (marker: MapMarker) => void
}

const STATUS_COLORS: Record<string, string> = {
  moving:  'bg-emerald-500',
  idle:    'bg-amber-400',
  offline: 'bg-gray-400',
}

/**
 * MapView — placeholder shell ready to be wired to Mapbox GL JS or Leaflet.
 *
 * To integrate Mapbox:
 *   1. npm install mapbox-gl @types/mapbox-gl
 *   2. Replace the placeholder div with a mapboxgl.Map mounted into `containerRef`
 *   3. Use `markers` prop to add/remove mapboxgl.Marker instances
 *
 * To integrate Leaflet:
 *   1. npm install leaflet react-leaflet @types/leaflet
 *   2. Replace the placeholder div with <MapContainer> from react-leaflet
 */
export function MapView({ markers = [], center, zoom = 10, className, onMarkerClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Placeholder: logs intent so the integration point is clear
  useEffect(() => {
    if (!containerRef.current) return
    // Future: initialize map SDK here using containerRef.current, center, zoom
  }, [center, zoom])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden',
        className
      )}
    >
      {/* Grid overlay for visual depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Placeholder marker dots */}
      {markers.slice(0, 12).map((m, i) => (
        <button
          key={m.id}
          onClick={() => onMarkerClick?.(m)}
          style={{
            position: 'absolute',
            left: `${15 + (i % 6) * 14}%`,
            top: `${20 + Math.floor(i / 6) * 40}%`,
          }}
          className="group flex flex-col items-center gap-0.5 hover:z-10"
          aria-label={m.label ?? `Marker ${m.id}`}
          title={m.label}
        >
          <div className={cn(
            'h-3 w-3 rounded-full ring-2 ring-white shadow-md transition-transform group-hover:scale-150',
            STATUS_COLORS[m.status ?? 'offline']
          )} />
        </button>
      ))}

      {/* Center placeholder */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MapPin className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Map Render Area</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Integrate Mapbox GL JS or Leaflet via <code className="font-mono">containerRef</code>.
            {markers.length > 0 && (
              <span className="ml-1 text-primary font-medium">{markers.length} marker{markers.length !== 1 ? 's' : ''} ready.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
