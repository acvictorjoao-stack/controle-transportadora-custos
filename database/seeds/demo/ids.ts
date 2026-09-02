import {createHash} from 'node:crypto';

const DEMO_NAMESPACE = 'fleetcontrol-demo-v1';

/** Gera UUID determinístico para entidades da massa demo. */
export function demoUuid(entity: string, key: string): string {
  const digest = createHash('sha256')
    .update(`${DEMO_NAMESPACE}:${entity}:${key}`)
    .digest('hex');

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
}

export function demoExternalId(entity: string, key: string): string {
  return `demo-${entity}-${key}`;
}
