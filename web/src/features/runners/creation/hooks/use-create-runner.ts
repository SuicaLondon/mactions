import { useState } from 'react';

import { useConnection } from '../../../github/hooks/connection/use-connection';
import {
  type CreateRunnerOptions,
  parseRunnerTarget,
  type RunnerRegistrationMode,
  type RunnerScopeKind,
} from '../models/runner-creation';
import { useRunnerCreation } from './use-runner-creation';
import { useRunnerTargets } from './use-runner-targets';

export function useCreateRunner({
  onClose,
  locked,
  initializing = false,
  initialMode = 'automatic',
  initialTarget,
}: CreateRunnerOptions) {
  const connection = useConnection();
  const [step, setStep] = useState<1 | 2>(() => {
    if (initialMode === 'token') return 2;
    return 1;
  });
  const [mode, setMode] = useState<RunnerRegistrationMode>(initialMode);
  const [kind, setKind] = useState<RunnerScopeKind>(initialTarget?.kind ?? 'repo');
  const [target, setTarget] = useState(initialTarget?.name ?? '');
  const [token, setToken] = useState('');
  const [prefix, setPrefix] = useState('mactions');
  const [labels, setLabels] = useState('');
  const { normalized, valid } = parseRunnerTarget(kind, target);
  const usePicker = mode === 'automatic';
  const { discovery, options } = useRunnerTargets(
    kind,
    connection.data?.login,
    step === 2 && usePicker && Boolean(connection.data?.connected),
  );
  const create = useRunnerCreation({
    kind,
    target: normalized,
    prefix,
    labels,
    mode,
    token,
    onCreated: () => {
      setToken('');
      onClose();
    },
  });
  let currentStep: 1 | 2 | 3 = step;
  if (create.isPending) currentStep = 3;
  const busy = create.isPending;
  let waiting: string | null = null;
  if (initializing) waiting = 'Loading runner state…';
  else if (locked) waiting = 'Another runner operation is in progress. Waiting for it to finish…';
  else if (mode === 'automatic' && connection.isPending) waiting = 'Checking GitHub connection…';
  const connected = Boolean(connection.data?.connected);
  let registrationReady = connected;
  if (mode === 'token') registrationReady = Boolean(token.trim());
  const canContinue = !busy && (mode === 'token' || connected);
  const canCreate = !busy && !locked && valid && registrationReady;
  const waitingIsLoading = initializing || (!locked && connection.isPending);

  function changeKind(next: RunnerScopeKind) {
    if (kind === next) return;
    setKind(next);
    setTarget('');
  }
  function close() {
    if (!create.isPending) onClose();
  }
  function continueToTarget() {
    if (canContinue) setStep(2);
  }
  function goBack() {
    if (!create.isPending) setStep(1);
  }
  function submit() {
    if (step === 2 && canCreate) create.mutate();
  }
  return {
    connection,
    step,
    mode,
    setMode,
    kind,
    target,
    setTarget,
    options,
    token,
    setToken,
    prefix,
    setPrefix,
    labels,
    setLabels,
    valid,
    usePicker,
    discovery,
    create,
    currentStep,
    busy,
    waiting,
    connected,
    changeKind,
    close,
    continueToTarget,
    goBack,
    submit,
    canContinue,
    canCreate,
    waitingIsLoading,
  };
}
