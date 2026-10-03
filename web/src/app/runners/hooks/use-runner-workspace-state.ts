import { useCallback, useState } from 'react';

import { useRunners } from '../../../features/runners/data/hooks/use-runners';
import { useRunnerInspector } from '../../../features/runners/inspector/hooks/use-runner-inspector';
import type { Action, Operation, Runner } from '../../../shared/api/types';

const EMPTY_RUNNERS: Runner[] = [];

type RunnerModal =
  | { type: 'create'; initialMode?: 'token' }
  | { type: 'storage' }
  | { type: 'action'; runner: Runner; action: Action }
  | null;

interface RunnerMenu {
  runner: Runner;
  x: number;
  y: number;
}

export function useRunnerWorkspaceState(welcome: boolean) {
  const fleet = useRunners(false);
  const rows = fleet.query.data?.runners ?? EMPTY_RUNNERS;
  const [menu, setMenu] = useState<RunnerMenu | null>(null);
  const [modal, setModal] = useState<RunnerModal>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback(
    (runner: Runner, x: number, y: number) => setMenu({ runner, x, y }),
    [],
  );
  const inspector = useRunnerInspector(
    rows,
    Boolean(fleet.query.data),
    modal !== null || menu !== null || welcome,
  );

  let currentMenu = menu;
  if (menu) {
    const local = rows.find((runner) => runner.id === menu.runner.id);
    if (local) {
      currentMenu = {
        ...menu,
        runner: {
          ...local,
          github_status: menu.runner.github_status,
          busy: menu.runner.busy,
          github_labels: menu.runner.github_labels ?? local.github_labels,
        },
      };
    }
  }

  function runOperation(operation: Operation) {
    setModal(null);
    fleet.run(operation);
  }

  function onAction(runner: Runner, action: Action) {
    if (fleet.locked) return;
    if (action === 'start') {
      runOperation({
        path: `/api/runners/${runner.id}/${action}`,
        payload: {},
        message: `Starting ${runner.name}…`,
      });
    } else {
      setModal({ type: 'action', runner, action });
    }
  }

  function openCreate(initialMode?: 'token') {
    setModal({ type: 'create', initialMode });
  }

  return {
    fleet,
    rows,
    inspector,
    menu: currentMenu,
    openMenu,
    closeMenu,
    modal,
    closeModal: () => setModal(null),
    openCreate,
    openStorage: () => setModal({ type: 'storage' }),
    runOperation,
    onAction,
  };
}
