import type { Format } from './types'

export const FORMATS: Format[] = [
  { id: 'yd_sq',   label: 'Квадрат',         ratio: 1,      dims: '1:1'  },
  { id: 'yd_h43',  label: 'Горизонтальный',  ratio: 4 / 3,  dims: '4:3'  },
  { id: 'yd_v34',  label: 'Вертикальный',    ratio: 3 / 4,  dims: '3:4'  },
  { id: 'yd_w169', label: 'Широкоформатный', ratio: 16 / 9, dims: '16:9' },
  { id: 'yd_b165', label: 'Баннер',          ratio: 16 / 5, dims: '16:5' },
]

export const MAX_FILES = 10
export const MAX_FILE_SIZE_MB = 5
