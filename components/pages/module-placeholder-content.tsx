import {ArrowLeft, Construction} from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';

function ModulePlaceholderContent() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Construction className="size-5 text-muted-foreground" />
          <CardTitle>Módulo em desenvolvimento</CardTitle>
        </div>
        <CardDescription>
          Este módulo será implementado nas próximas sprints.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A estrutura da página já está pronta. Em breve você poderá acessar
          todas as funcionalidades deste módulo.
        </p>
        <Link
          href={ROUTES.dashboard}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
          Voltar ao dashboard
        </Link>
      </CardContent>
    </Card>
  );
}

export {ModulePlaceholderContent};
