export type Matrix3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

const IDENTITY: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
const ANOMALY_SEVERITY = 0.6

const PROTANOPIA: Matrix3 = [
  0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882,
  -0.048116, 1.051998,
]
const DEUTERANOPIA: Matrix3 = [
  0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
  0.04294, 0.968881,
]
const TRITANOPIA: Matrix3 = [
  1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733,
  0.691367, 0.3039,
]
const ACHROMATOPSIA: Matrix3 = [
  0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722,
]

function weaken(matrix: Matrix3, severity = ANOMALY_SEVERITY): Matrix3 {
  return matrix.map(
    (value, i) => IDENTITY[i]! + (value - IDENTITY[i]!) * severity,
  ) as Matrix3
}

export interface VisionMode {
  id: string
  name: string
  description: string
  /** Rough share of the whole population (men and women averaged). */
  prevalence: string
  matrix: Matrix3
}

// Prevalence figures are approximate and based on people of Northern European
// descent; red-green types are far more common in men.
export const VISION_MODES: VisionMode[] = [
  {
    id: 'deuteranomaly',
    name: 'Deuteranomaly',
    description: 'green-weak',
    prevalence: '~2.5%',
    matrix: weaken(DEUTERANOPIA),
  },
  {
    id: 'deuteranopia',
    name: 'Deuteranopia',
    description: 'green-blind',
    prevalence: '~0.6%',
    matrix: DEUTERANOPIA,
  },
  {
    id: 'protanomaly',
    name: 'Protanomaly',
    description: 'red-weak',
    prevalence: '~0.6%',
    matrix: weaken(PROTANOPIA),
  },
  {
    id: 'protanopia',
    name: 'Protanopia',
    description: 'red-blind',
    prevalence: '~0.5%',
    matrix: PROTANOPIA,
  },
  {
    id: 'tritanomaly',
    name: 'Tritanomaly',
    description: 'blue-weak',
    prevalence: '<0.01%',
    matrix: weaken(TRITANOPIA),
  },
  {
    id: 'tritanopia',
    name: 'Tritanopia',
    description: 'blue-blind',
    prevalence: '<0.01%',
    matrix: TRITANOPIA,
  },
  {
    id: 'achromatopsia',
    name: 'Achromatopsia',
    description: 'no colour',
    prevalence: '~0.003%',
    matrix: ACHROMATOPSIA,
  },
]

export function findVisionMode(id: string | null | undefined) {
  return VISION_MODES.find((mode) => mode.id === id)
}

/** The `values` attribute for an SVG feColorMatrix applying this matrix. */
export function feColorMatrixValues(m: Matrix3) {
  return [
    [m[0], m[1], m[2], 0, 0],
    [m[3], m[4], m[5], 0, 0],
    [m[6], m[7], m[8], 0, 0],
    [0, 0, 0, 1, 0],
  ]
    .map((row) => row.map((v) => +v.toFixed(6)).join(' '))
    .join(' ')
}

/** How a #rrggbb colour appears with the given matrix applied. */
export function simulateHex(hex: string, m: Matrix3) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return (
    '#' +
    [0, 3, 6]
      .map((i) => {
        const lin = Math.min(
          1,
          Math.max(0, m[i]! * r + m[i + 1]! * g + m[i + 2]! * b),
        )
        const c =
          lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055
        return Math.round(c * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}
