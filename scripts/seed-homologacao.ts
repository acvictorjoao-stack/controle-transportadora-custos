#!/usr/bin/env node
/**
 * Seed de homologação para a empresa `primeira-empresa`.
 *
 * Padrão: dry-run (sem escrita).
 * Escrita: exige `--execute` explícito.
 * Autenticação: Super Admin de `primeira-empresa` (anon key) — nunca service_role.
 * Resolução de empresa: exclusivamente pelo slug (sem `limit(1)` em memberships).
 *
 * Variáveis: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * HML_ADMIN_EMAIL, HML_ADMIN_PASSWORD.
 *
 * Escrita (`--execute`) não é atômica: falha parcial deixa dados; sem limpeza automática.
 * Após falha parcial, não repetir a carga automaticamente — empty-guards devem abortar.
 * Manifesto/relatório local ≠ log transacional. Ver database/seeds/homologacao/PARTIAL_FAILURE.md.
 * Integrações financeiras operacionais são obrigatórias na carga HML.
 */

import {runHomologacaoSeed} from '../database/seeds/homologacao/run';
import type {HmlSeedMode} from '../database/seeds/homologacao/types';

function parseArgs(argv: string[]): {mode: HmlSeedMode; liveChecks: boolean} {
  const execute = argv.includes('--execute');
  const liveChecks = argv.includes('--live-checks');

  if (execute && liveChecks) {
    // --execute já inclui guards de leitura antes de escrever.
  }

  return {
    mode: execute ? 'execute' : 'dry-run',
    liveChecks: liveChecks && !execute,
  };
}

async function main() {
  const {mode, liveChecks} = parseArgs(process.argv.slice(2));

  if (mode === 'execute') {
    console.log(
      'Modo EXECUTE: serão gravados dados em primeira-empresa após guards. ' +
        'Nenhuma senha ou token será impressa.',
    );
  } else {
    console.log(
      liveChecks
        ? 'Modo DRY-RUN com --live-checks (somente leitura no banco).'
        : 'Modo DRY-RUN offline (padrão). Nenhuma escrita no banco.',
    );
  }

  const result = await runHomologacaoSeed({mode, liveChecks});

  if (result.aborted) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  // Nunca ecoar objetos que possam conter credenciais.
  console.error(message);
  process.exit(1);
});
