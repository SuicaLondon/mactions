import { memo } from 'react';

import { NavigationContext } from '../../navigation/context/navigation-context';
import { useAppNavigation } from '../../navigation/hooks/use-app-navigation';
import type { ProviderProps } from '../types';

export const NavigationProvider = memo(function NavigationProvider({
  children,
  clearDetails,
}: ProviderProps & { clearDetails: () => void }) {
  const navigation = useAppNavigation(clearDetails);
  return <NavigationContext value={navigation}>{children}</NavigationContext>;
});
