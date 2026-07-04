import {Construction} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface MasterPlaceholderPageProps {
  title: string;
  description: string;
}

function MasterPlaceholderPage({title, description}: MasterPlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Construction className="size-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Este módulo será implementado nas próximas sprints do Portal Master.
        </p>
      </CardContent>
    </Card>
  );
}

export {MasterPlaceholderPage};
