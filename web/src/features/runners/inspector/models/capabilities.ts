import type { Capability } from '../../../../shared/api/types';

export const capabilityLabels: Record<Capability['state'], string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  unknown: 'Not confirmed',
};
