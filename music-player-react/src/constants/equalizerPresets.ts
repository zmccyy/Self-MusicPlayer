export const EQ_BAND_FREQUENCIES_HZ = [60, 170, 350, 1000, 3500, 10000] as const

export type EQPresetId = 'flat' | 'pop' | 'rock' | 'classic' | 'bass'

export type EQPreset = {
  id: EQPresetId
  name: string
  gainsDb: number[] // length must match EQ_BAND_FREQUENCIES_HZ
}

export const EQ_PRESETS: EQPreset[] = [
  {
    id: 'flat',
    name: '平坦',
    gainsDb: [0, 0, 0, 0, 0, 0],
  },
  {
    id: 'pop',
    name: '流行',
    gainsDb: [2, 1, 1, 3, 2, 0],
  },
  {
    id: 'rock',
    name: '摇滚',
    gainsDb: [3, 2, 1, 4, 2, 1],
  },
  {
    id: 'classic',
    name: '古典',
    gainsDb: [1, 1, 0, 2, 1, 0],
  },
  {
    id: 'bass',
    name: '重低音',
    gainsDb: [6, 4, 2, 0, -1, -2],
  },
]
