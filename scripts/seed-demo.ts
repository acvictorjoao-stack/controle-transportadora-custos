#!/usr/bin/env node
import {runDemoSeed} from '../database/seeds/demo/seed-demo';

async function main() {
  const summary = await runDemoSeed();
  console.log('Seed demo concluída.');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
