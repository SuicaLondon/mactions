import type { Connection } from '../../../shared/api/types';

/**
 * How a GitHub connection panel looks: `banner` spans the window below the header; `card` is a
 * bordered box inside a dialog.
 */
export type ConnectionPanelVariant = 'banner' | 'card';

/** Whether a GitHub connection panel was opened and whether its first-run guide was put away. */
export interface ConnectionPanelState {
  expanded: boolean;
  dismissed: boolean;
}

export type ConnectionPanelAction =
  | { type: 'authorizationStarted' }
  | { type: 'authorizationCompleted' }
  | { type: 'toggled'; visible: boolean }
  | { type: 'continuedLocally' };

export function initialConnectionPanel(organizationAccess: boolean): ConnectionPanelState {
  return { expanded: organizationAccess, dismissed: false };
}

export function connectionPanelReducer(
  state: ConnectionPanelState,
  action: ConnectionPanelAction,
): ConnectionPanelState {
  switch (action.type) {
    case 'authorizationStarted':
      if (state.expanded) return state;
      return { ...state, expanded: true };
    case 'authorizationCompleted':
      return { expanded: false, dismissed: false };
    case 'toggled':
      // Hiding a visible panel also puts the guide away; showing it brings everything back.
      return { expanded: !action.visible, dismissed: action.visible };
    case 'continuedLocally':
      return { expanded: false, dismissed: true };
  }
}

/** A loaded connection that is disconnected, but not because GitHub CLI is unavailable. */
export function needsGitHubConnection(loaded: boolean, connection: Connection | undefined) {
  return loaded && !!connection && !connection.connected && connection.state !== 'unavailable';
}

interface ConnectionPanelVisibilityInput extends ConnectionPanelState {
  guide: boolean;
  needsConnection: boolean;
  /** A device authorization is waiting for the user to enter its code. */
  pending: boolean;
}

export function connectionPanelVisibility({
  guide,
  needsConnection,
  pending,
  expanded,
  dismissed,
}: ConnectionPanelVisibilityInput) {
  const showGuide = guide && needsConnection && !dismissed;
  return { showGuide, showContent: expanded || pending || showGuide };
}
