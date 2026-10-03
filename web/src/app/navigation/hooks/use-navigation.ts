import { use } from 'react';

import { NavigationContext } from '../context/navigation-context';

export function useNavigation() {
  const navigation = use(NavigationContext);
  if (!navigation) throw new Error('Navigation requires AppProviders.');
  return navigation;
}
