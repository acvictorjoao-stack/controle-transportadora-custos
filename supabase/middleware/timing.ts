export type MiddlewareTimingContext = {
  requestId: string;
  pathname: string;
};

const timingContexts = new WeakMap<object, MiddlewareTimingContext>();

export function createMiddlewareRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function registerMiddlewareTimingContext(
  client: object,
  context: MiddlewareTimingContext,
): void {
  timingContexts.set(client, context);
}

function getTimingContext(client: object): MiddlewareTimingContext | undefined {
  return timingContexts.get(client);
}

function durationInMilliseconds(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function logTiming(
  context: MiddlewareTimingContext,
  details: string,
): void {
  console.log(
    `[MW_TIMING] requestId=${context.requestId} pathname=${context.pathname} ${details}`,
  );
}

function hasSupabaseError(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  return Boolean(value.error);
}

export function logMiddlewareStart(
  context: MiddlewareTimingContext,
  startedAt: number,
  method: string,
): void {
  logTiming(
    context,
    `method=${method} start=${startedAt.toFixed(2)}`,
  );
}

export function logMiddlewareStep(
  context: MiddlewareTimingContext,
  step: string,
  startedAt: number,
): void {
  logTiming(
    context,
    `step=${step} durationMs=${durationInMilliseconds(startedAt)}`,
  );
}

export function logMiddlewareStepForClient(
  client: object,
  step: string,
  startedAt: number,
): void {
  const context = getTimingContext(client);
  if (context) {
    logMiddlewareStep(context, step, startedAt);
  }
}

export function logMiddlewareTotal(
  context: MiddlewareTimingContext,
  startedAt: number,
  result: 'success' | 'error',
  error?: 'exception',
): void {
  const errorDetail = error ? ` error=${error}` : '';
  logTiming(
    context,
    `totalDurationMs=${durationInMilliseconds(startedAt)} result=${result}${errorDetail}`,
  );
}

export async function measureMiddlewareSupabase<T>(
  client: object,
  operation: string,
  step: string,
  callback: () => Promise<T>,
): Promise<T> {
  const context = getTimingContext(client);
  const startedAt = performance.now();

  try {
    const value = await callback();

    if (context) {
      const result = hasSupabaseError(value) ? 'error' : 'success';
      const errorDetail = result === 'error' ? ' error=response_error' : '';
      logTiming(
        context,
        `step=${step} operation=${operation} durationMs=${durationInMilliseconds(startedAt)} result=${result}${errorDetail}`,
      );
    }

    return value;
  } catch (error) {
    if (context) {
      logTiming(
        context,
        `step=${step} operation=${operation} durationMs=${durationInMilliseconds(startedAt)} result=error error=exception`,
      );
    }

    throw error;
  }
}
