import { createContext } from 'react';

import { type useCreateRunner } from '../hooks/use-create-runner';

export const RunnerCreationContext = createContext<ReturnType<typeof useCreateRunner> | null>(null);
