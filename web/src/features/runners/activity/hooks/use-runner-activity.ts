import { useEffect, useRef, useState } from 'react';

import type { Runner } from '../../../../shared/api/types';
import { useRunnerJobs } from './use-runner-jobs';
import { useRunnerLogs } from './use-runner-logs';

export function useRunnerActivity(runner: Runner, connected: boolean, logsOnly: boolean) {
  const [tab, setTab] = useState<'logs' | 'jobs'>(() => {
    if (!logsOnly && runner.busy) return 'jobs';
    return 'logs';
  });
  const [file, setFile] = useState('');
  const [live, setLive] = useState(true);
  const [follow, setFollow] = useState(true);
  const [wrap, setWrap] = useState(true);
  const [repositoryInput, setRepositoryInput] = useState('');
  const [repository, setRepository] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const output = useRef<HTMLPreElement>(null);
  const logs = useRunnerLogs(runner.id, file, live, tab === 'logs');
  const jobs = useRunnerJobs(runner.id, repository, !logsOnly && tab === 'jobs' && connected);
  useEffect(() => {
    if (follow && output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [logs.data, follow, wrap]);
  const allJobs = jobs.data?.jobs ?? [];
  const selectedJob = allJobs.find((job) => job.id === selectedJobId);
  let logsTitle = 'Runner output';
  if (logsOnly) logsTitle = 'Runner diagnostic logs';
  return {
    tab,
    setTab,
    file,
    setFile,
    live,
    setLive,
    follow,
    setFollow,
    wrap,
    setWrap,
    repositoryInput,
    setRepositoryInput,
    setRepository,
    repository,
    selectedJobId,
    setSelectedJobId,
    output,
    logs,
    jobs,
    allJobs,
    selectedJob,
    logsTitle,
  };
}
