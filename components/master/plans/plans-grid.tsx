import {Check} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {PlanCatalogItem} from '@/features/master/plans';

export interface PlansGridProps {
  plans: PlanCatalogItem[];
}

function PlansGrid({plans}: PlansGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.slug}
          className={plan.slug === 'professional' ? 'border-primary' : ''}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plan.name}</CardTitle>
              {plan.slug === 'professional' && (
                <Badge variant="default">Popular</Badge>
              )}
            </div>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-success" />
                Até {plan.maxVehicles} veículos
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-success" />
                Até {plan.maxUsers} usuários
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-success" />
                Até {plan.maxBranches} filiais
              </li>
              {plan.enabledModules.map((module) => (
                <li key={module} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-success" />
                  {module}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Gerenciar plano
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export {PlansGrid};
