'use client';

import {Bell} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';

function HeaderNotifications() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Central de notificações"
      className="relative"
      disabled
    >
      <Bell className="size-4" />
      <Badge
        variant="destructive"
        className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full p-0 text-[10px]"
      >
        0
      </Badge>
    </Button>
  );
}

export {HeaderNotifications};
