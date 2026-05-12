import type { Format } from './types'

interface Platform {
  id: string
  label: string
  formats: Format[]
}

export const PLATFORMS: Record<string, Platform> = {
  yandex: {
    id: 'yandex',
    label: 'Яндекс Директ',
    formats: [
      { id: 'yd_sq',   label: 'Квадрат',         ratio: 1,      dims: '1:1'  },
      { id: 'yd_h43',  label: 'Горизонтальный',  ratio: 4 / 3,  dims: '4:3'  },
      { id: 'yd_v34',  label: 'Вертикальный',    ratio: 3 / 4,  dims: '3:4'  },
      { id: 'yd_w169', label: 'Широкоформатный', ratio: 16 / 9, dims: '16:9' },
      { id: 'yd_b165', label: 'Баннер',          ratio: 16 / 5, dims: '16:5' },
    ],
  },
  vk: {
    id: 'vk',
    label: 'ВКонтакте',
    formats: [
      { id: 'vk_sq',  label: 'Квадрат — лента',    ratio: 1,      dims: '1:1'  },
      { id: 'vk_45',  label: 'Портретный — лента',  ratio: 4 / 5,  dims: '4:5'  },
      { id: 'vk_169', label: 'Горизонтальный',      ratio: 16 / 9, dims: '16:9' },
      { id: 'vk_916', label: 'Истории и клипы',     ratio: 9 / 16, dims: '9:16' },
    ],
  },
}

export type PlatformId = 'yandex' | 'vk'

export const PLATFORM_ORDER: PlatformId[] = ['yandex', 'vk']

export const MAX_FILES = 10
export const MAX_FILE_SIZE_MB = 5
