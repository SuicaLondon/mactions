import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDetailsOverlayTop } from './use-details-overlay-top';

function Workspace({ open, anchored }: { open: boolean; anchored: boolean }) {
  const panel = useRef<HTMLElement>(null);
  useDetailsOverlayTop(panel, open, String(anchored));
  return (
    <div data-testid="workspace">
      <div data-testid="content">
        <header data-overlay-anchor={anchored || undefined}>Runners</header>
      </div>
      <aside ref={panel} aria-label="Runner details" />
    </div>
  );
}

function stubRect(element: HTMLElement, top: number, bottom: number) {
  const rect = { x: 0, y: top, top, bottom, left: 0, right: 100, width: 100, height: bottom - top };
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
  vi.spyOn(element, 'getClientRects').mockReturnValue([rect] as unknown as DOMRectList);
}

afterEach(() => vi.restoreAllMocks());

describe('useDetailsOverlayTop', () => {
  it('starts the overlay below the list header and follows it while scrolling', () => {
    const { rerender } = render(<Workspace open={false} anchored />);
    const header = screen.getByText('Runners');
    const panel = screen.getByRole('complementary', { name: 'Runner details' });
    const computed = window.getComputedStyle(header);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ ...computed, marginBottom: '10px' });
    stubRect(screen.getByTestId('workspace'), 100, 600);
    stubRect(header, 114, 144);
    rerender(<Workspace open anchored />);
    expect(panel.style.top).toBe('54px');
    expect(panel).toHaveAttribute('data-anchored');

    stubRect(header, 20, 50);
    act(() => {
      fireEvent.scroll(screen.getByTestId('content'));
    });
    expect(panel.style.top).toBe('0px');
  });

  it('keeps the full height without an anchor and clears the offset on close', () => {
    const { rerender } = render(<Workspace open anchored={false} />);
    const panel = screen.getByRole('complementary', { name: 'Runner details' });
    expect(panel.style.top).toBe('');
    expect(panel).not.toHaveAttribute('data-anchored');
    rerender(<Workspace open={false} anchored={false} />);
    expect(panel.style.top).toBe('');
  });
});
