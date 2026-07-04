'use client';

import {X} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'lg',
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto py-0 shadow-lg',
          sizeClasses[size],
          className,
        )}
      >
        <CardHeader className="sticky top-0 z-10 border-b border-border bg-card py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle id="modal-title">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-6">{children}</CardContent>
      </Card>
    </div>
  );
}

export {Modal};
