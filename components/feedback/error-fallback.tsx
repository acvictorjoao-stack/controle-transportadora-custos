'use client';

import {AlertTriangle, RefreshCw} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function ErrorFallback({error, reset}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <CardTitle>Algo deu errado</CardTitle>
          <CardDescription>
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {error.message}
            </pre>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={reset}>
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export {ErrorFallback};
