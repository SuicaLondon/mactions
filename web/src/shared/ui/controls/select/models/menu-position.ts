export function menuPosition(
  base: { width?: unknown; left?: unknown },
  element: HTMLDivElement | null,
) {
  const anchor = element?.closest('[data-select-anchor]') ?? element;
  const bounds = anchor?.getBoundingClientRect();
  const viewport = document.documentElement.clientWidth || window.innerWidth;
  const width = Math.min(Math.max(bounds?.width ?? (Number(base.width) || 0), 240), viewport - 24);
  return {
    width,
    left: Math.max(12, Math.min(bounds?.left ?? (Number(base.left) || 0), viewport - width - 12)),
  };
}
