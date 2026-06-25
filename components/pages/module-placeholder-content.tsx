import {Construction} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
      <CardContent>
        <p className="text-sm text-muted-foreground">
          A estrutura da página já está pronta. Em breve você poderá acessar
          todas as funcionalidades deste módulo.
        </p>
      </CardContent>
    </Card>
  );
}

export {ModulePlaceholderContent};
