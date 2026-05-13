import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { FormatCard } from './components/FormatCard'
import { FORMATS, MAX_FILES, MAX_FILE_SIZE_MB } from './constants'
import { getDefaultPos, getMaxCropSize } from './utils/crop'
import type { ImageFile } from './types'

const SESSION_KEY = 'scp_session_v1'

interface StoredImage { id: string; name: string; dataUrl: string; width: number; height: number }

type Pos = { x: number; y: number }
type Rect = { x: number; y: number; w: number; h: number }

async function toDataUrl(objectUrl: string): Promise<string> {
  const blob = await fetch(objectUrl).then(r => r.blob())
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(blob)
  })
}

function fromDataUrl(dataUrl: string): string {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)![1]
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

function loadSession(): { images: ImageFile[]; activeIdx: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const { images, activeIdx } = JSON.parse(raw) as { images: StoredImage[]; activeIdx: number }
    return {
      images: images.map(s => ({ id: s.id, name: s.name, url: fromDataUrl(s.dataUrl), width: s.width, height: s.height })),
      activeIdx,
    }
  } catch { return null }
}

function loadImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () =>
      resolve({ id: `${Date.now()}_${Math.random()}`, name: file.name, url, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

const _initialSession = loadSession() ?? { images: [] as ImageFile[], activeIdx: -1 }

export default function App() {
  const [images, setImages] = useState<ImageFile[]>(_initialSession.images)
  const [activeIdx, setActiveIdx] = useState<number>(_initialSession.activeIdx)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  // Positions per format (in image coords), reset when active image changes
  const [positions, setPositions] = useState<Record<string, Pos>>({})
  const [showSafeZone, setShowSafeZone] = useState(true)
  const [markMode, setMarkMode] = useState(false)
  const [markRect, setMarkRect] = useState<Rect | null>(null)

  const activeImage = activeIdx >= 0 ? images[activeIdx] : null

  useEffect(() => {
    setPositions({})
    setMarkRect(null)
  }, [activeImage?.id])

  const handlePosChange = useCallback((formatId: string, pos: Pos) => {
    setPositions(prev => ({ ...prev, [formatId]: pos }))
  }, [])

  const handleMarkRect = useCallback((rect: Rect | null) => {
    setMarkRect(rect)
  }, [])

  const handleToggleMarkMode = () => {
    setMarkMode(prev => {
      if (prev) setMarkRect(null)
      return !prev
    })
  }

  // Intersection of all format crop rects = guaranteed-visible area across all formats
  const safeZone = useMemo((): Rect | null => {
    if (!activeImage) return null
    let x1 = 0, y1 = 0
    let x2 = activeImage.width, y2 = activeImage.height
    for (const fmt of FORMATS) {
      const { w, h } = getMaxCropSize(activeImage.width, activeImage.height, fmt.ratio)
      const pos = positions[fmt.id] ?? getDefaultPos(activeImage.width, activeImage.height, fmt.ratio)
      x1 = Math.max(x1, pos.x)
      y1 = Math.max(y1, pos.y)
      x2 = Math.min(x2, pos.x + w)
      y2 = Math.min(y2, pos.y + h)
    }
    if (x2 <= x1 || y2 <= y1) return null
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
  }, [activeImage, positions])

  const markInSafe = useMemo((): boolean | null => {
    if (!markRect || !safeZone || markRect.w < 5 || markRect.h < 5) return null
    return (
      markRect.x >= safeZone.x &&
      markRect.y >= safeZone.y &&
      markRect.x + markRect.w <= safeZone.x + safeZone.w &&
      markRect.y + markRect.h <= safeZone.y + safeZone.h
    )
  }, [markRect, safeZone])

  const handleFilesAdded = useCallback(async (fileList: FileList) => {
    const remaining = MAX_FILES - images.length
    const files = Array.from(fileList)
      .filter(f => f.type.match(/image\/(jpeg|png)/))
      .slice(0, remaining)

    if (fileList.length > remaining) {
      alert(`Можно загрузить не более ${MAX_FILES} файлов. Будет добавлено ${remaining}.`)
    }

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    if (oversized.length) {
      alert(`Пропущено ${oversized.length} файл(ов) больше ${MAX_FILE_SIZE_MB} МБ.`)
    }

    const valid = files.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024)
    const loaded = await Promise.all(valid.map(loadImageFile))

    setImages(prev => {
      const next = [...prev, ...loaded]
      if (prev.length === 0 && loaded.length > 0) setActiveIdx(0)
      return next
    })
  }, [images.length])

  useEffect(() => {
    const onDragEnter = () => { dragCounter.current++; setIsDragging(true) }
    const onDragLeave = () => { dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)
      if (e.dataTransfer?.files) handleFilesAdded(e.dataTransfer.files)
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [handleFilesAdded])

  useEffect(() => {
    if (images.length === 0) {
      sessionStorage.removeItem(SESSION_KEY)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const stored: StoredImage[] = await Promise.all(
          images.map(async img => ({
            id: img.id, name: img.name, width: img.width, height: img.height,
            dataUrl: await toDataUrl(img.url),
          }))
        )
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ images: stored, activeIdx }))
      } catch {
        // QuotaExceededError — молча пропускаем
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [images, activeIdx])

  const handleDelete = useCallback((idx: number) => {
    URL.revokeObjectURL(images[idx].url)
    const next = images.filter((_, i) => i !== idx)
    setImages(next)
    if (next.length === 0) {
      setActiveIdx(-1)
    } else if (activeIdx >= next.length) {
      setActiveIdx(next.length - 1)
    } else if (activeIdx === idx) {
      setActiveIdx(Math.max(0, idx - 1))
    }
  }, [images, activeIdx])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        images={images}
        activeIdx={activeIdx}
        onSelect={setActiveIdx}
        onFilesAdded={handleFilesAdded}
        onDelete={handleDelete}
      />

      <main className="flex-1 overflow-y-auto bg-[#f2f2f2]">
        {isDragging && (
          <div className="fixed inset-0 z-50 bg-orange-50/90 border-4 border-dashed border-[#FC3F1D] flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-5xl mb-3">📂</div>
              <div className="text-[#FC3F1D] text-xl font-semibold">Отпустите файлы для загрузки</div>
            </div>
          </div>
        )}

        {!activeImage ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
            <div className="text-6xl opacity-20">🖼️</div>
            <h2 className="text-2xl font-bold text-gray-300">Загрузите креативы</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Загрузите JPG или PNG — и сразу увидите все варианты кадрирования в форматах РСЯ Яндекс Директ
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4">
              <h1 className="text-xl font-bold truncate">{activeImage.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {activeImage.width} × {activeImage.height} px&nbsp;&nbsp;·&nbsp;&nbsp;{FORMATS.length} форматов РСЯ
              </p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="relative group/safe">
                <button
                  onClick={() => setShowSafeZone(v => !v)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showSafeZone
                      ? 'bg-teal-50 border-teal-400 text-teal-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {showSafeZone ? '✓ ' : ''}Безопасная зона
                </button>
                <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover/safe:block w-64 bg-gray-900 text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                  Бирюзовый прямоугольник — область, которая гарантированно видна во всех 5 форматах РСЯ одновременно. Размещайте ключевые элементы внутри.
                </div>
              </div>

              <div className="relative group/mark">
                <button
                  onClick={handleToggleMarkMode}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    markMode
                      ? 'bg-orange-50 border-[#FC3F1D] text-[#FC3F1D]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {markMode ? '✏ Разметка: вкл' : '✏ Режим разметки'}
                </button>
                <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover/mark:block w-64 bg-gray-900 text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                  Нарисуйте область на изображении — и сразу узнаете, попадёт ли она в безопасную зону всех 5 форматов РСЯ. Удобно, чтобы проверить логотип, текст или лицо.
                </div>
              </div>

              {markMode && markRect && markInSafe !== null && (
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                  markInSafe
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-red-50 border-red-300 text-red-600'
                }`}>
                  {markInSafe ? '✓ Область в безопасной зоне' : '✗ Выходит за пределы'}
                </span>
              )}

              {markMode && (!markRect || (markRect.w < 5 && markRect.h < 5)) && (
                <span className="text-xs text-gray-400 italic">Нарисуйте область на любом формате</span>
              )}

            </div>

            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {FORMATS.map(fmt => {
                const pos = positions[fmt.id] ?? getDefaultPos(activeImage.width, activeImage.height, fmt.ratio)
                return (
                  <FormatCard
                    key={`${activeImage.id}_${fmt.id}`}
                    image={activeImage}
                    format={fmt}
                    pos={pos}
                    onPosChange={(newPos) => handlePosChange(fmt.id, newPos)}
                    safeZone={showSafeZone ? safeZone : null}
                    markMode={markMode}
                    markRect={markMode ? markRect : null}
                    onMarkRect={handleMarkRect}
                  />
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
