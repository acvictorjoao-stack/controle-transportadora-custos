'use client';

import {Badge} from '@/components/ui/badge';

import type {SupplierCategory} from '../types';
import {SUPPLIER_CATEGORY_LABELS} from '../types';

export interface SupplierBadgeProps {
  category: SupplierCategory;
  className?: string;
}

function SupplierBadge({category, className}: SupplierBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      {SUPPLIER_CATEGORY_LABELS[category] ?? category}
    </Badge>
  );
}

export interface SupplierCategoriesBadgesProps {
  categories: SupplierCategory[];
  max?: number;
}

function SupplierCategoriesBadges({categories, max = 3}: SupplierCategoriesBadgesProps) {
  if (!categories.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  const visible = categories.slice(0, max);
  const rest = categories.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((cat) => (
        <SupplierBadge key={cat} category={cat} />
      ))}
      {rest > 0 && (
        <Badge variant="outline">+{rest}</Badge>
      )}
    </div>
  );
}

export {SupplierBadge, SupplierCategoriesBadges};
