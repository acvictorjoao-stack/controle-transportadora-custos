'use client';

import {Moon, Sun} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {useTheme} from '@/contexts/theme/use-theme';

function HeaderThemeToggle() {
  const {resolvedTheme, toggleTheme} = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}

export {HeaderThemeToggle};
