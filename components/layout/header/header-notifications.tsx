'use client';

import {Bell} from 'lucide-react';

import {Button} from '@/components/ui/button';

function HeaderNotifications() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Central de notificações"
      disabled
    >
      <Bell className="size-4" />
    </Button>
  );
}

export {HeaderNotifications};
