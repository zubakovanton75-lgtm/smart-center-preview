import { useRef } from 'react'
import type { ImageFile } from '../types'
import { MAX_FILES, MAX_FILE_SIZE_MB } from '../constants'

interface Props {
  images: ImageFile[]
  activeIdx: number
  onSelect: (idx: number) => void
  onFilesAdded: (files: FileList) => void
}

export function Sidebar({ images, activeIdx, onSelect, onFilesAdded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="w-56 min-w-[224px] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="text-[#FC3F1D] font-bold text-base leading-none">Smart Center</div>
        <div className="text-gray-400 text-[11px] mt-1">Предпросмотр · Яндекс Директ</div>
      </div>

      {/* Upload */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#FC3F1D] hover:bg-[#e03516] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Загрузить креативы
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-1.5">
          JPG, PNG · до {MAX_FILE_SIZE_MB} МБ · до {MAX_FILES} файлов
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={e => { if (e.target.files) { onFilesAdded(e.target.files); e.target.value = '' } }}
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2">
        {images.length === 0 ? (
          <p className="text-center text-[11px] text-gray-300 py-6">Файлы не загружены</p>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-300 px-2 py-1.5">
              Файлы ({images.length})
            </p>
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => onSelect(i)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 text-left transition-colors cursor-pointer border ${
                  i === activeIdx
                    ? 'bg-orange-50 border-[#FC3F1D]'
                    : 'bg-transparent border-transparent hover:bg-gray-50'
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-9 h-9 object-cover rounded flex-shrink-0 bg-gray-100"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium truncate max-w-[120px]" title={img.name}>
                    {img.name}
                  </div>
                  <div className="text-[10px] text-gray-400">{img.width} × {img.height} px</div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
