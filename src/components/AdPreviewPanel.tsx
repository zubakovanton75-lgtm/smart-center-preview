import { useState } from 'react'
import type { ReactNode, ChangeEvent } from 'react'
import { getDefaultPos, getMaxCropSize } from '../utils/crop'
import type { ImageFile } from '../types'

type Pos = { x: number; y: number }

// ── Ad data ────────────────────────────────────────────────────
interface AdData {
  title: string
  description: string
  domain: string
  buttonText: string
  promoText: string
  sitelinks: string[]
}

const DEFAULT_AD: AdData = {
  title: 'Твой лучший заголовок объявления',
  description: 'Самое конверсионное описание, которое убеждает кликнуть',
  domain: 'example.ru',
  buttonText: 'Выбрать',
  promoText: 'Скидка 20%',
  sitelinks: ['Доп ссылка 1', 'Доп ссылка 2', 'Доп ссылка 3', 'Доп ссылка 4', 'Доп ссылка 5'],
}

// ── Formats ────────────────────────────────────────────────────
const FMT = {
  sq:   { id: 'yd_sq',   ratio: 1 },
  h43:  { id: 'yd_h43',  ratio: 4 / 3 },
  v34:  { id: 'yd_v34',  ratio: 3 / 4 },
  w169: { id: 'yd_w169', ratio: 16 / 9 },
}

function getCrop(image: ImageFile, positions: Record<string, Pos>, fmt: { id: string; ratio: number }) {
  const pos = positions[fmt.id] ?? getDefaultPos(image.width, image.height, fmt.ratio)
  const { w: cropW, h: cropH } = getMaxCropSize(image.width, image.height, fmt.ratio)
  return { pos, cropW, cropH }
}

// ── CroppedImage ───────────────────────────────────────────────
// Uses object-fit:cover + object-position to show the smart-center crop region
function CroppedImage({
  image, pos, cropW, cropH, className = '',
}: {
  image: ImageFile; pos: Pos; cropW: number; cropH: number; className?: string
}) {
  const xPct = image.width > cropW ? (pos.x / (image.width - cropW)) * 100 : 50
  const yPct = image.height > cropH ? (pos.y / (image.height - cropH)) * 100 : 50
  return (
    <div className={`overflow-hidden w-full ${className}`} style={{ aspectRatio: `${cropW} / ${cropH}` }}>
      <img
        src={image.url}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${xPct}% ${yPct}%`,
          display: 'block',
        }}
      />
    </div>
  )
}

// ── Shared UI atoms ────────────────────────────────────────────
function ReclamaBadge({ overlay = false }: { overlay?: boolean }) {
  if (overlay) {
    return (
      <span className="absolute top-2 left-2 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded z-10">
        РЕКЛАМА
      </span>
    )
  }
  return <span className="text-[10px] text-gray-400 flex-shrink-0">РЕКЛАМА</span>
}

function ReклямаPill() {
  return (
    <span className="text-[10px] text-gray-500 border border-gray-300 rounded px-1 py-0.5 flex-shrink-0 leading-none">
      Реклама
    </span>
  )
}

function DomainLogo() {
  return <div className="w-4 h-4 rounded-full bg-orange-400 flex-shrink-0" />
}

function DotsMenu() {
  return <span className="text-gray-300 text-[13px] ml-auto cursor-default select-none flex-shrink-0">···</span>
}

// Domain row — various badge combinations
function DomainRow({
  domain,
  badge,
  dots = true,
}: {
  domain: string
  badge?: 'none' | 'inline' | 'pill'
  dots?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <DomainLogo />
      <span className="text-[12px] text-gray-700 truncate">{domain}</span>
      {badge === 'inline' && <ReclamaBadge />}
      {badge === 'pill' && <ReклямаPill />}
      {dots && <DotsMenu />}
    </div>
  )
}

function CtaButton({ text }: { text: string }) {
  return (
    <div className="w-full bg-[#4F82E8] text-white text-[13px] font-medium py-2 rounded-lg text-center mt-3 select-none">
      {text}
    </div>
  )
}

function CtaButtonInline({ text }: { text: string }) {
  return (
    <div className="inline-block bg-[#4F82E8] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg mt-1.5 select-none">
      {text}
    </div>
  )
}

function SitelinkList({ links }: { links: string[] }) {
  return (
    <div className="border-t border-gray-100 mt-2">
      {links.map((l, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
          <span className="text-[13px] text-gray-700">{l}</span>
          <span className="text-gray-400 text-xs ml-2 flex-shrink-0">›</span>
        </div>
      ))}
    </div>
  )
}

function AdWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1.5 px-0.5">{label}</div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── Ad card props ──────────────────────────────────────────────
interface AdProps { image: ImageFile; positions: Record<string, Pos>; ad: AdData }

// ── VERTICAL ──────────────────────────────────────────────────

// V1: image (full) → РЕКЛАМА overlay → domain + title + desc + sitelinks + CTA button
function VerticalV1({ image, positions, ad }: AdProps) {
  const { pos, cropW, cropH } = getCrop(image, positions, FMT.v34)
  return (
    <AdWrap label="Вертикальные — вариант 1">
      <div className="relative">
        <CroppedImage image={image} pos={pos} cropW={cropW} cropH={cropH} />
        <ReclamaBadge overlay />
        <span className="absolute top-2 right-2 text-white/60 text-xs z-10 select-none">···</span>
      </div>
      <div className="px-3 pt-3 pb-4">
        <DomainRow domain={ad.domain} badge="none" dots={false} />
        <div className="text-[16px] font-bold text-gray-900 mt-1.5 leading-snug">{ad.title}</div>
        <div className="text-[12px] text-gray-500 mt-1 leading-snug">{ad.description}</div>
        <SitelinkList links={ad.sitelinks} />
        <CtaButton text={ad.buttonText} />
      </div>
    </AdWrap>
  )
}

// V2: domain header → image → title as blue hyperlink
function VerticalV2({ image, positions, ad }: AdProps) {
  const { pos, cropW, cropH } = getCrop(image, positions, FMT.v34)
  return (
    <AdWrap label="Вертикальные — вариант 2">
      <div className="px-3 pt-3 pb-2">
        <DomainRow domain={ad.domain} badge="inline" />
      </div>
      <CroppedImage image={image} pos={pos} cropW={cropW} cropH={cropH} />
      <div className="px-3 pt-2 pb-3">
        <div className="text-[14px] text-[#0A5AE7] leading-snug font-medium">{ad.title}</div>
      </div>
    </AdWrap>
  )
}

// V3: domain + pill badge → title + first sitelink (blue) + desc → image
function VerticalV3({ image, positions, ad }: AdProps) {
  const { pos, cropW, cropH } = getCrop(image, positions, FMT.v34)
  return (
    <AdWrap label="Вертикальные — вариант 3">
      <div className="px-3 pt-3 pb-0">
        <DomainRow domain={ad.domain} badge="pill" />
        <div className="text-[16px] font-bold text-gray-900 mt-2 leading-snug">{ad.title}</div>
        <div className="text-[13px] text-[#0A5AE7] mt-1">{ad.sitelinks[0]}</div>
        <div className="text-[12px] text-gray-500 mt-1 leading-snug mb-2">{ad.description}</div>
      </div>
      <CroppedImage image={image} pos={pos} cropW={cropW} cropH={cropH} />
    </AdWrap>
  )
}

// ── HORIZONTAL ────────────────────────────────────────────────

// H1: thumbnail left (4:3) + domain + title + CTA button right
function HorizontalV1({ image, positions, ad }: AdProps) {
  const { pos, cropW, cropH } = getCrop(image, positions, FMT.h43)
  return (
    <AdWrap label="Горизонтальные — вариант 1">
      <div className="flex gap-3 p-3">
        <div className="w-[112px] flex-shrink-0">
          <CroppedImage image={image} pos={pos} cropW={cropW} cropH={cropH} className="rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <DomainRow domain={ad.domain} badge="inline" />
          <div className="text-[14px] font-bold text-gray-900 mt-1.5 leading-snug">{ad.title}</div>
          <CtaButtonInline text={ad.buttonText} />
        </div>
      </div>
    </AdWrap>
  )
}

// H2: compact — smaller thumbnail + domain + title only, no button
function HorizontalV2({ image, positions, ad }: AdProps) {
  const { pos, cropW, cropH } = getCrop(image, positions, FMT.h43)
  return (
    <AdWrap label="Горизонтальные — вариант 2">
      <div className="flex gap-3 p-3">
        <div className="w-[88px] flex-shrink-0">
          <CroppedImage image={image} pos={pos} cropW={cropW} cropH={cropH} className="rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <DomainRow domain={ad.domain} badge="inline" />
          <div className="text-[13px] font-bold text-gray-900 mt-1.5 leading-snug">{ad.title}</div>
        </div>
      </div>
    </AdWrap>
  )
}

// ── SQUARE ────────────────────────────────────────────────────

// Sq1: 1:1 image + РЕКЛАМА overlay + domain badge bottom-right + title + arrow
function SquareV1({ image, positions, ad }: AdProps) {
  const { pos, cropW, cropH } = getCrop(image, positions, FMT.sq)
  return (
    <AdWrap label="Квадратные — вариант 1">
      <div className="relative">
        <CroppedImage image={image} pos={pos} cropW={cropW} cropH={cropH} />
        <ReclamaBadge overlay />
        <span className="absolute top-2 right-2 text-white/60 text-xs z-10 select-none">···</span>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded px-1.5 py-0.5 z-10">
          <DomainLogo />
          <span className="text-[10px] text-gray-700">{ad.domain}</span>
        </div>
      </div>
      <div className="px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="text-[15px] font-bold text-gray-900 leading-snug">{ad.title}</div>
        <span className="text-[#0A5AE7] text-lg mt-0.5 flex-shrink-0">→</span>
      </div>
    </AdWrap>
  )
}

// ── MAIN PANEL ─────────────────────────────────────────────────

interface AdPreviewPanelProps {
  image: ImageFile
  positions: Record<string, Pos>
  onClose: () => void
}

export function AdPreviewPanel({ image, positions, onClose }: AdPreviewPanelProps) {
  const [ad, setAd] = useState<AdData>(DEFAULT_AD)

  const field = (key: keyof Omit<AdData, 'sitelinks'>) =>
    (e: ChangeEvent<HTMLInputElement>) => setAd(prev => ({ ...prev, [key]: e.target.value }))

  const sitelink = (i: number) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setAd(prev => {
        const sl = [...prev.sitelinks]
        sl[i] = e.target.value
        return { ...prev, sitelinks: sl }
      })

  const inputCls = 'w-full text-[13px] border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#4F82E8] bg-gray-50 transition-colors'

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-[#F4F5F7] z-40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="text-[15px] font-semibold text-gray-900">Предпросмотр объявления</div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4">

          {/* ── Fields ─────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Текст объявления</div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-gray-500 mb-0.5 block">Заголовок <span className="text-gray-300">(до 56 символов)</span></label>
                <input value={ad.title} onChange={field('title')} maxLength={56} className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-0.5 block">Описание <span className="text-gray-300">(до 81 символа)</span></label>
                <input value={ad.description} onChange={field('description')} maxLength={81} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500 mb-0.5 block">Домен</label>
                  <input value={ad.domain} onChange={field('domain')} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-0.5 block">Кнопка</label>
                  <input value={ad.buttonText} onChange={field('buttonText')} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-0.5 block">Промоакция</label>
                <input value={ad.promoText} onChange={field('promoText')} placeholder="Скидка 20%" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Дополнительные ссылки</label>
                <div className="space-y-1.5">
                  {ad.sitelinks.map((sl, i) => (
                    <input key={i} value={sl} onChange={sitelink(i)} placeholder={`Доп ссылка ${i + 1}`} className={inputCls} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Vertical ───────────────────────────────────── */}
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Вертикальные</div>
          <VerticalV1 image={image} positions={positions} ad={ad} />
          <VerticalV2 image={image} positions={positions} ad={ad} />
          <VerticalV3 image={image} positions={positions} ad={ad} />

          {/* ── Horizontal ─────────────────────────────────── */}
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 mt-1">Горизонтальные</div>
          <HorizontalV1 image={image} positions={positions} ad={ad} />
          <HorizontalV2 image={image} positions={positions} ad={ad} />

          {/* ── Square ─────────────────────────────────────── */}
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 mt-1">Квадратные</div>
          <SquareV1 image={image} positions={positions} ad={ad} />
        </div>
      </div>
    </>
  )
}
