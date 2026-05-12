export function getMaxCropSize(imgW: number, imgH: number, ratio: number) {
  const wFromH = imgH * ratio
  if (wFromH <= imgW + 0.5) return { w: wFromH, h: imgH }
  return { w: imgW, h: imgW / ratio }
}

export function getDefaultPos(imgW: number, imgH: number, ratio: number) {
  const { w, h } = getMaxCropSize(imgW, imgH, ratio)
  return { x: (imgW - w) / 2, y: (imgH - h) / 2 }
}

export function clampPos(
  x: number, y: number,
  imgW: number, imgH: number,
  fw: number, fh: number,
) {
  return {
    x: Math.max(0, Math.min(imgW - fw, x)),
    y: Math.max(0, Math.min(imgH - fh, y)),
  }
}
