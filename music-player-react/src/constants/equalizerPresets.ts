export const EQ_BAND_FREQUENCIES_HZ = [
  31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const

export type EQPresetId = 'flat' | 'pop' | 'rock' | 'jazz' | 'classic' | 'electronic' | 'vocal' | 'bass'

export type EQPreset = {
  id: EQPresetId
  name: string
  gainsDb: number[] // length must match EQ_BAND_FREQUENCIES_HZ
}

export const EQ_PRESETS: EQPreset[] = [
  {
    id: 'flat',
    name: '平坦',
    gainsDb: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'pop',
    name: '流行',
    gainsDb: [-1, 1, 2, 3, 2, 0, -1, -1, 0, 1],
  },
  {
    id: 'rock',
    name: '摇滚',
    gainsDb: [3, 2, 0, -1, 0, 1, 2, 3, 3, 2],
  },
  {
    id: 'jazz',
    name: '爵士',
    gainsDb: [1, 2, 1, 0, -1, -1, 0, 1, 2, 2],
  },
  {
    id: 'classic',
    name: '古典',
    gainsDb: [1, 1, 1, 0, 0, 0, 0, 0, 1, 2],
  },
  {
    id: 'electronic',
    name: '电子',
    gainsDb: [3, 2, 1, 0, -1, 0, 1, 1, 2, 3],
  },
  {
    id: 'vocal',
    name: '人声',
    gainsDb: [-2, -1, 0, 1, 2, 3, 2, 1, 0, -1],
  },
  {
    id: 'bass',
    name: '重低音',
    gainsDb: [6, 5, 4, 2, 1, 0, 0, 0, 0, 0],
  },
]
