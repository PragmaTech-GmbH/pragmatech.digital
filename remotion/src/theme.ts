// Shared tokens for the abstract section animations (same palette as the site theme)
export const colors = {
  background: '#0f172a',
  panel: '#111c33',
  border: '#1e293b',
  grid: '#1b2740',
  textMuted: '#64748b',
  text: '#cbd5e1',
  white: '#f8fafc',
  brand: '#0ea5e9',
  brandLight: '#38bdf8',
  emerald: '#34d399',
  rose: '#fb7185',
  amber: '#fbbf24',
};

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 675;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;

export const smoothstep = (edgeStart: number, edgeEnd: number, value: number) => {
  const progress = clamp01((value - edgeStart) / (edgeEnd - edgeStart));
  return progress * progress * (3 - 2 * progress);
};

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const mixColors = (fromHex: string, toHex: string, progress: number) => {
  const [fromRed, fromGreen, fromBlue] = hexToRgb(fromHex);
  const [toRed, toGreen, toBlue] = hexToRgb(toHex);
  const mixedChannels = [
    lerp(fromRed, toRed, clamp01(progress)),
    lerp(fromGreen, toGreen, clamp01(progress)),
    lerp(fromBlue, toBlue, clamp01(progress)),
  ].map((channel) => Math.round(channel));
  return `rgb(${mixedChannels[0]}, ${mixedChannels[1]}, ${mixedChannels[2]})`;
};
