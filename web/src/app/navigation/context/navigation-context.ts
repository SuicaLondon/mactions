import { createContext } from 'react';

import type { useAppNavigation } from '../hooks/use-app-navigation';

export const NavigationContext = createContext<ReturnType<typeof useAppNavigation> | null>(null);
