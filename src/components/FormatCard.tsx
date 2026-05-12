import { useCallback, useEffect, useRef, useState } from 'react'
import type { Format, ImageFile } from '../types'
import { clampPos, getDefaultPos, getMaxCropSize } from '../utils/crop'

interface Props {
  image: ImageFile
  format: Format
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

export function FormatCard({ image, format }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(0)
  const [pos, setPos] = useState(() => getDefaultPos(image.width, image.height, format.ratio))

  const { w: fw, h: fh } = getMaxCropSize(image.width, image.height, format.ratio)

  const updateScale = useCallback(() => {
    if (imgRef.current && imgRef.current.offsetWidth > 0) {
      setScale(imgRef.current.offsetWidth / image.width)
    }
  }, [image.width])

  useEffect(() => {
    setPos(getDefaultPos(image.width, image.height, format.ratio))
    setScale(0)
  }, [image, format])

  useEffect(() => {
    if (!imgRef.current) return
    const obs = new ResizeObserver(updateScale)
    obs.observe(imgRef.current)
    return () => obs.disconnect()
  }, [updateScale])

  const dragRef = useRef<{ sx: number; sy: number; spx: number; spy: number } | null>(null)

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setPos(current => {
      dragRef.current = { sx: clientX, sy: clientY, spx: current.x, spy: current.y }
      return current
    })
  }, [])

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!dragRef.current || !imgRef.current) return
      const currentScale = imgRef.current.offsetWidth / image.width
      const dx = (clientX - dragRef.current.sx) / currentScale
      const dy = (clientY - dragRef.current.sy) / currentScale
      setPos(clampPos(dragRef.current.spx + dx, dragRef.current.spy + dy, image.width, image.height, fw, fh))
    }

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      onMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onEnd = () => { dragRef.current = null }

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

  const handleReset = () => setPos(getDefaultPos(image.width, image.height, format.ratio))

  const x1 = Math.round(pos.x)
  const y1 = Math.round(pos.y)
  const x2 = Math.round(pos.x + fw)
  const y2 = Math.round(pos.y + fh)

  const frameLeft = pos.x * scale
  const frameTop = pos.y * scale
  const frameW = fw * scale
  const frameH = fh * scale

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
            {/* 4 darkened overlay pieces */}
            {frameTop > 0 && (
              <div
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{ height: frameTop, background: 'rgba(0,0,0,0.45)' }}
              />
            )}
            {frameTop + frameH < (image.height * scale - 0.5) && (
              <div
                className="absolute inset-x-0 bottom-0 pointer-events-none"
                style={{ top: frameTop + frameH, background: 'rgba(0,0,0,0.45)' }}
              />
            )}
            {frameLeft > 0 && (
              <div
                className="absolute pointer-events-none"
                style={{ top: frameTop, left: 0, width: frameLeft, height: frameH, background: 'rgba(0,0,0,0.45)' }}
              />
            )}
            {frameLeft + frameW < (image.width * scale - 0.5) && (
              <div
                className="absolute pointer-events-none"
                style={{ top: frameTop, left: frameLeft + frameW, right: 0, height: frameH, background: 'rgba(0,0,0,0.45)' }}
              />
            )}

            {/* Crop frame */}
            <div
              className="absolute border-2 border-[#FC3F1D] cursor-move z-10"
              style={{ left: frameLeft, top: frameTop, width: frameW, height: frameH }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Corner dots with coordinate tooltips */}
              <CornerDot
                coords={`x: ${x1}, y: ${y1}`}
                posClass="top-0.5 left-0.5"
                tooltipClass="top-5 left-0"
              />
              <CornerDot
                coords={`x: ${x2}, y: ${y1}`}
                posClass="top-0.5 right-0.5"
                tooltipClass="top-5 right-0"
              />
              <CornerDot
                coords={`x: ${x1}, y: ${y2}`}
                posClass="bottom-0.5 left-0.5"
                tooltipClass="bottom-5 left-0"
              />
              <CornerDot
                coords={`x: ${x2}, y: ${y2}`}
                posClass="bottom-0.5 right-0.5"
                tooltipClass="bottom-5 right-0"
              />
            </div>
          </>
        )}
      </div>

      {/* Coordinates */}
      <div className="mt-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
          Зона безопасности — пиксели оригинала
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
