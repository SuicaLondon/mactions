import type { Capabilities } from '../../../api/types';

export const capabilityLabels = {
  available: 'Available',
  unavailable: 'Unavailable',
  unknown: 'Not confirmed',
};

export const capabilityClasses: Record<Capabilities['jobs']['state'], string> = {
  available: 'capability-available',
  unavailable: 'capability-unavailable',
  unknown: 'capability-unknown',
};
