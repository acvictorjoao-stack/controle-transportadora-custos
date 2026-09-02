#!/usr/bin/env node
import {runDemoReset} from '../database/seeds/demo/reset-demo';

async function main() {
  const result = await runDemoReset();
  console.log('Reset demo concluído.');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
