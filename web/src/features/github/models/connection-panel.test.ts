import { describe, expect, it } from 'vitest';

import {
  connectionPanelReducer,
  connectionPanelVisibility,
  initialConnectionPanel,
  needsGitHubConnection,
} from './connection-panel';

describe('connectionPanelReducer', () => {
  it('opens with organization access preselected and closes when authorization completes', () => {
    const opened = initialConnectionPanel(true);
    expect(opened).toEqual({ expanded: true, dismissed: false });
    expect(connectionPanelReducer(opened, { type: 'authorizationStarted' })).toBe(opened);
    expect(
      connectionPanelReducer(
        { expanded: true, dismissed: true },
        { type: 'authorizationCompleted' },
      ),
    ).toEqual({ expanded: false, dismissed: false });
  });

  it('dismisses the guide when a visible panel is hidden or the user continues locally', () => {
    const closed = initialConnectionPanel(false);
    expect(connectionPanelReducer(closed, { type: 'toggled', visible: true })).toEqual({
      expanded: false,
      dismissed: true,
    });
    expect(connectionPanelReducer(closed, { type: 'toggled', visible: false })).toEqual({
      expanded: true,
      dismissed: false,
    });
    expect(
      connectionPanelReducer({ expanded: true, dismissed: false }, { type: 'continuedLocally' }),
    ).toEqual({ expanded: false, dismissed: true });
  });
});

describe('needsGitHubConnection', () => {
  it('asks to connect only for a loaded, disconnected, available GitHub CLI', () => {
    expect(needsGitHubConnection(true, { connected: false, message: '' })).toBe(true);
    expect(needsGitHubConnection(false, { connected: false, message: '' })).toBe(false);
    expect(needsGitHubConnection(true, undefined)).toBe(false);
    expect(needsGitHubConnection(true, { connected: true, message: '' })).toBe(false);
    expect(
      needsGitHubConnection(true, { connected: false, message: '', state: 'unavailable' }),
    ).toBe(false);
  });
});

describe('connectionPanelVisibility', () => {
  const base = {
    guide: true,
    needsConnection: true,
    pending: false,
    expanded: false,
    dismissed: false,
  };

  it('shows the guide until it is dismissed', () => {
    expect(connectionPanelVisibility(base)).toEqual({ showGuide: true, showContent: true });
    expect(connectionPanelVisibility({ ...base, dismissed: true })).toEqual({
      showGuide: false,
      showContent: false,
    });
  });

  it('keeps a pending authorization visible even when collapsed', () => {
    expect(connectionPanelVisibility({ ...base, guide: false, pending: true })).toEqual({
      showGuide: false,
      showContent: true,
    });
  });
});
