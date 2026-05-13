import { useCallback, useEffect, useRef, useState } from 'react'
import type { Format, ImageFile } from '../types'
import { clampPos, getDefaultPos, getMaxCropSize } from '../utils/crop'

type Pos = { x: number; y: number }
type Rect = { x: number; y: number; w: number; h: number }

interface Props {
  image: ImageFile
  format: Format
  pos: Pos
  onPosChange: (pos: Pos) => void
  safeZone: Rect | null
  markMode: boolean
  markRect: Rect | null
  onMarkRect: (rect: Rect | null) => void
}

function useCopyCoords() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

interface CornerDotProps {
  coords: string
  posClass: string
  tooltipClass: string
}

function CornerDot({ coords, posClass, tooltipClass }: CornerDotProps) {
  return (
    <div className={`absolute group z-20 ${posClass}`}>
      <div className="w-3 h-3 bg-[#FC3F1D] border-2 border-white rounded-full" />
      <div className={`absolute ${tooltipClass} hidden group-hover:block bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded-md whitespace-nowrap z-30 pointer-events-none`}>
        {coords}
      </div>
    </div>
  )
}

export function FormatCard({ image, format, pos, onPosChange, safeZone, markMode, markRect, onMarkRect }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(0)

  const { w: fw, h: fh } = getMaxCropSize(image.width, image.height, format.ratio)

  const updateScale = useCallback(() => {
    if (imgRef.current && imgRef.current.offsetWidth > 0) {
      setScale(imgRef.current.offsetWidth / image.width)
    }
  }, [image.width])

  useEffect(() => {
    setScale(0)
  }, [image, format])

  useEffect(() => {
    if (!imgRef.current) return
    const obs = new ResizeObserver(updateScale)
    obs.observe(imgRef.current)
    return () => obs.disconnect()
  }, [updateScale])

  // Use refs for callbacks to keep useEffect deps stable
  const onPosChangeRef = useRef(onPosChange)
  onPosChangeRef.current = onPosChange
  const onMarkRectRef = useRef(onMarkRect)
  onMarkRectRef.current = onMarkRect
  const markModeRef = useRef(markMode)
  markModeRef.current = markMode

  // Keep pos in a ref so startDrag reads latest value without being a dep
  const posRef = useRef(pos)
  posRef.current = pos

  const dragRef = useRef<{ sx: number; sy: number; spx: number; spy: number } | null>(null)
  const markDragRef = useRef<{ sx: number; sy: number } | null>(null)

  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragRef.current = { sx: clientX, sy: clientY, spx: posRef.current.x, spy: posRef.current.y }
  }, [])

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!imgRef.current) return

      // Markup drag takes priority
      if (markDragRef.current) {
        const currentScale = imgRef.current.offsetWidth / image.width
        const bb = imgRef.current.getBoundingClientRect()
        const ix = Math.max(0, Math.min((clientX - bb.left) / currentScale, image.width))
        const iy = Math.max(0, Math.min((clientY - bb.top) / currentScale, image.height))
        const { sx, sy } = markDragRef.current
        onMarkRectRef.current({
          x: Math.round(Math.min(sx, ix)),
          y: Math.round(Math.min(sy, iy)),
          w: Math.round(Math.abs(ix - sx)),
          h: Math.round(Math.abs(iy - sy)),
        })
        return
      }

      if (!dragRef.current) return
      const currentScale = imgRef.current.offsetWidth / image.width
      const dx = (clientX - dragRef.current.sx) / currentScale
      const dy = (clientY - dragRef.current.sy) / currentScale
      onPosChangeRef.current(clampPos(dragRef.current.spx + dx, dragRef.current.spy + dy, image.width, image.height, fw, fh))
    }

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      onMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onEnd = () => {
      dragRef.current = null
      markDragRef.current = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [image.width, image.height, fw, fh])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    startDrag(e.touches[0].clientX, e.touches[0].clientY)
  }

  const handleMarkMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return
    e.preventDefault()
    const bb = imgRef.current.getBoundingClientRect()
    const currentScale = imgRef.current.offsetWidth / image.width
    const ix = Math.max(0, Math.min((e.clientX - bb.left) / currentScale, image.width))
    const iy = Math.max(0, Math.min((e.clientY - bb.top) / currentScale, image.height))
    markDragRef.current = { sx: ix, sy: iy }
    onMarkRectRef.current(null)
  }

  const handleReset = () => onPosChange(getDefaultPos(image.width, image.height, format.ratio))

  const { copied, copy } = useCopyCoords()

  const x1 = Math.round(pos.x)
  const y1 = Math.round(pos.y)
  const x2 = Math.round(pos.x + fw)
  const y2 = Math.round(pos.y + fh)

  const frameLeft = pos.x * scale
  const frameTop = pos.y * scale
  const frameW = fw * scale
  const frameH = fh * scale

  // Safe zone in display coords
  const szStyle = safeZone && scale > 0 ? {
    left: safeZone.x * scale,
    top: safeZone.y * scale,
    width: safeZone.w * scale,
    height: safeZone.h * scale,
  } : null

  // Mark rect in display coords
  const mrStyle = markRect && scale > 0 && markRect.w > 2 && markRect.h > 2 ? {
    left: markRect.x * scale,
    top: markRect.y * scale,
    width: markRect.w * scale,
    height: markRect.h * scale,
  } : null

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-sm font-bold mb-0.5">{format.dims} — {format.label}</div>
      <div className="text-xs text-gray-400 mb-3">
        Кроп: {Math.round(fw)} × {Math.round(fh)} px&nbsp;&nbsp;·&nbsp;&nbsp;из {image.width} × {image.height} px
      </div>

      {/* Image + overlay */}
      <div className="relative" style={{ lineHeight: 0 }}>
        <img
          ref={imgRef}
          src={image.url}
          draggable={false}
          alt={format.dims}
          className="w-full block rounded"
          onLoad={updateScale}
        />

        {scale > 0 && (
          <>
            {/* Darkened areas outside crop frame */}
            {frameTop > 0 && (
              <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: frameTop, background: 'rgba(0,0,0,0.45)' }} />
            )}
            {frameTop + frameH < (image.height * scale - 0.5) && (
              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: frameTop + frameH, background: 'rgba(0,0,0,0.45)' }} />
            )}
            {frameLeft > 0 && (
              <div className="absolute pointer-events-none" style={{ top: frameTop, left: 0, width: frameLeft, height: frameH, background: 'rgba(0,0,0,0.45)' }} />
            )}
            {frameLeft + frameW < (image.width * scale - 0.5) && (
              <div className="absolute pointer-events-none" style={{ top: frameTop, left: frameLeft + frameW, right: 0, height: frameH, background: 'rgba(0,0,0,0.45)' }} />
            )}

            {/* Safe zone overlay */}
            {szStyle && (
              <div
                className="absolute pointer-events-none z-[5] overflow-hidden"
                style={{
                  ...szStyle,
                  background: 'rgba(20, 184, 166, 0.22)',
                  border: '2px solid rgba(20, 184, 166, 0.75)',
                  boxSizing: 'border-box',
                }}
              >
                <span className="absolute top-1 left-1 text-[9px] font-semibold text-teal-700 bg-white/70 px-1 rounded leading-tight whitespace-nowrap">
                  Безопасная зона
                </span>
              </div>
            )}

            {/* Crop frame (draggable) */}
            <div
              className="absolute border-2 border-[#FC3F1D] z-10"
              style={{
                left: frameLeft,
                top: frameTop,
                width: frameW,
                height: frameH,
                cursor: markMode ? 'default' : 'move',
              }}
              onMouseDown={markMode ? undefined : handleMouseDown}
              onTouchStart={markMode ? undefined : handleTouchStart}
            >
              <CornerDot coords={`x: ${x1}, y: ${y1}`} posClass="top-0.5 left-0.5" tooltipClass="top-5 left-0" />
              <CornerDot coords={`x: ${x2}, y: ${y1}`} posClass="top-0.5 right-0.5" tooltipClass="top-5 right-0" />
              <CornerDot coords={`x: ${x1}, y: ${y2}`} posClass="bottom-0.5 left-0.5" tooltipClass="bottom-5 left-0" />
              <CornerDot coords={`x: ${x2}, y: ${y2}`} posClass="bottom-0.5 right-0.5" tooltipClass="bottom-5 right-0" />
            </div>

            {/* Markup rect display */}
            {mrStyle && (
              <div
                className="absolute pointer-events-none z-[25]"
                style={{
                  ...mrStyle,
                  border: '2px dashed #10b981',
                  background: 'rgba(16, 185, 129, 0.08)',
                  boxSizing: 'border-box',
                }}
              />
            )}

            {/* Transparent capture overlay for markup mode */}
            {markMode && (
              <div
                className="absolute inset-0 z-[30] cursor-crosshair"
                onMouseDown={handleMarkMouseDown}
              />
            )}
          </>
        )}
      </div>

      {/* Coordinates */}
      <div className="mt-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Координаты смарт-центра
          </div>
          <button
            onClick={() => copy(`${format.dims} — ${format.label}\nX: ${x1}–${x2}  Y: ${y1}–${y2}  (${Math.round(fw)}×${Math.round(fh)} px)`)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
              copied
                ? 'bg-green-50 border-green-200 text-green-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-[#FC3F1D] hover:text-[#FC3F1D]'
            }`}
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-xs font-semibold text-[#FC3F1D]">
          <span>X: {x1} – {x2}</span>
          <span>Y: {y1} – {y2}</span>
          <span>{Math.round(fw)} × {Math.round(fh)} px</span>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="mt-2 text-[11px] text-gray-400 hover:text-[#FC3F1D] underline underline-offset-2 cursor-pointer bg-transparent border-none p-0"
      >
        Сбросить по центру
      </button>
    </div>
  )
}
