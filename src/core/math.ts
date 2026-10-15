export const clamp = (value: number, min = 0, max = 1): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min

export const clampByte = (value: number): number => Math.round(clamp(value, 0, 255))

export const mix = (from: number, to: number, amount: number): number =>
  from + (to - from) * clamp(amount)
