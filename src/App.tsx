import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { FormatCard } from './components/FormatCard'
import { FORMATS, MAX_FILES, MAX_FILE_SIZE_MB } from './constants'
import type { ImageFile } from './types'

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

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

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

  // Global drag-and-drop
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

  const activeImage = activeIdx >= 0 ? images[activeIdx] : null

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
        {/* Drop overlay */}
        {isDragging && (
          <div className="fixed inset-0 z-50 bg-orange-50/90 border-4 border-dashed border-[#FC3F1D] flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-5xl mb-3">📂</div>
              <div className="text-[#FC3F1D] text-xl font-semibold">Отпустите файлы для загрузки</div>
            </div>
          </div>
        )}

        {!activeImage ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
            <div className="text-6xl opacity-20">🖼️</div>
            <h2 className="text-2xl font-bold text-gray-300">Загрузите креативы</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Загрузите JPG или PNG — и сразу увидите все варианты кадрирования в форматах РСЯ Яндекс Директ
            </p>
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-xl font-bold truncate">{activeImage.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {activeImage.width} × {activeImage.height} px&nbsp;&nbsp;·&nbsp;&nbsp;{FORMATS.length} форматов РСЯ
              </p>
            </div>

            {/* Format grid */}
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {FORMATS.map(fmt => (
                <FormatCard
                  key={`${activeImage.id}_${fmt.id}`}
                  image={activeImage}
                  format={fmt}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
