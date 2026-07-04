'use client';

import {MoreHorizontal} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {useClickOutside} from '@/hooks/use-click-outside';
import {cn} from '@/lib/utils';

export interface RowActionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function RowActionsMenu({
  open,
  onOpenChange,
  disabled = false,
  children,
  className,
}: RowActionsMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => onOpenChange(false), open);

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
      >
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export interface RowActionsMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

function RowActionsMenuItem({
  className,
  destructive = false,
  children,
  ...props
}: RowActionsMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent',
        destructive && 'text-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export {RowActionsMenu, RowActionsMenuItem};
