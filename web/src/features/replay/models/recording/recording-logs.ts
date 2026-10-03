import type { JobLogs } from '../../../../shared/api/types';
import { array, integer, invalid, object, text } from './recording-fields';

export function parseLogs(input: unknown): JobLogs {
  const logs = object(input, 'logs');
  if (
    typeof logs.state !== 'string' ||
    !['available', 'pending', 'unavailable'].includes(logs.state)
  )
    invalid('log state');
  if (logs.scope != null && logs.scope !== 'job' && logs.scope !== 'step') invalid('log scope');
  const steps = array(logs.steps, 'log steps').map((inputStep) => {
    const step = object(inputStep, 'step log');
    return {
      number: integer(step.number, 'log step number'),
      name: text(step.name, 'log step name'),
      content: text(step.content, 'step log content'),
    };
  });
  if (new Set(steps.map((step) => step.number)).size !== steps.length)
    invalid('duplicate log step numbers');
  const parsed: JobLogs = {
    state: logs.state as JobLogs['state'],
    message: text(logs.message, 'log message'),
    content: text(logs.content, 'log content'),
    steps,
  };
  if (logs.scope != null) parsed.scope = logs.scope;
  if (logs.unassigned_content != null) {
    parsed.unassigned_content = text(logs.unassigned_content, 'unassigned log content');
  }
  return parsed;
}
