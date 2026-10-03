import { cn } from '../../../../shared/lib/cn';
import { AppNavigation } from '../../../navigation/components/AppNavigation';
import { AppHeaderActions } from './AppHeaderActions';

export function AppChrome() {
  return (
    <header
      className={cn(
        'app-chrome flex min-h-12 shrink-0 items-center gap-4.5 border-b border-line',
        'bg-toolbar px-4 py-1.75 max-sm:gap-2 max-sm:py-1.5',
      )}
    >
      <AppNavigation />
      <AppHeaderActions />
    </header>
  );
}
