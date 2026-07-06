'use client';

import {MoreHorizontal} from 'lucide-react';
import * as React from 'react';
import {createPortal} from 'react-dom';

import {Button} from '@/components/ui/button';
import {zIndex} from '@/config/design-tokens/z-index';
import {cn} from '@/lib/utils';

const MENU_WIDTH_PX = 176;
const MENU_GAP_PX = 4;

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
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({
    visibility: 'hidden',
  });

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove =
      menuHeight > 0 &&
      spaceBelow < menuHeight + MENU_GAP_PX &&
      spaceAbove > spaceBelow;

    const top = openAbove
      ? rect.top - menuHeight - MENU_GAP_PX
      : rect.bottom + MENU_GAP_PX;

    const left = Math.max(
      8,
      Math.min(rect.right - MENU_WIDTH_PX, window.innerWidth - MENU_WIDTH_PX - 8),
    );

    setMenuStyle({
      position: 'fixed',
      top,
      left,
      width: MENU_WIDTH_PX,
      zIndex: zIndex.dropdown,
      visibility: 'visible',
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, children, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    function handleReposition() {
      updatePosition();
    }

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={triggerRef} className={cn('relative inline-flex', className)}>
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
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={menuStyle}
            className="rounded-md border border-border bg-popover p-1 shadow-md"
          >
            {children}
          </div>,
          document.body,
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
