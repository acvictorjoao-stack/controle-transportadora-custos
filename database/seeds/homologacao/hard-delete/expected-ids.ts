import type {HmlHardDeleteTable} from './constants';

/**
 * Allowlist imutável dos 43 IDs do manifesto parcial 2026-10-20.
 * Fonte: `.hml-seed/evidence-2026-10-20-partial/manifest.json`.
 * Qualquer divergência com o arquivo → abort (testes e CLI).
 */
export type ExpectedManifestEntry = {
  table: HmlHardDeleteTable;
  key: string;
  id: string;
  /** Código esperado quando a tabela tem coluna code (branches/cost_centers/positions). */
  expectedCode?: string;
};

export const HML_HARD_DELETE_EXPECTED_ENTRIES: readonly ExpectedManifestEntry[] = [
  {table: 'branches', key: 'imp', id: 'ba3c7aaa-57d0-4f1a-b406-1871e25c9a84', expectedCode: 'HML-IMP'},
  {table: 'branches', key: 'the', id: '190c68ca-8a3d-4b62-9960-b0516215e3c6', expectedCode: 'HML-THE'},
  {table: 'cost_centers', key: 'cc-frota', id: '6230f8f2-5615-4dd9-bbda-8fdb12785ff9', expectedCode: 'HML-FROTA'},
  {table: 'cost_centers', key: 'cc-manut', id: 'e829ae85-5fad-4042-95aa-9ed6efae4bc2', expectedCode: 'HML-MANUT'},
  {table: 'cost_centers', key: 'cc-fin', id: 'd4b4ba1c-bf62-495f-9e28-88ce33749740', expectedCode: 'HML-FIN'},
  {table: 'positions', key: 'pos-analista', id: 'f003fee1-a3fe-4b7c-a775-4a70e97213cf', expectedCode: 'HML_ANALISTA_OPS'},
  {table: 'positions', key: 'pos-aux', id: 'b2647966-6a1a-4b8d-85d8-5d11a639e5b0', expectedCode: 'HML_AUX_LOG'},
  {table: 'suppliers', key: 's01', id: '7ba15f45-a73e-428d-8724-13e5f3e66cb2'},
  {table: 'suppliers', key: 's02', id: '5b3010db-628d-4dca-9dd7-ea2545e29cde'},
  {table: 'suppliers', key: 's03', id: '65e71876-4617-46e3-8ed3-d5d890531665'},
  {table: 'suppliers', key: 's04', id: 'c0ba1762-8b04-4922-9bf2-2997a8b477fd'},
  {table: 'suppliers', key: 's05', id: 'cec1f6e6-5c23-4c36-9955-5a0931543822'},
  {table: 'suppliers', key: 's06', id: '30dbf51e-1638-4c8f-894d-3cfa0c72dc54'},
  {table: 'customers', key: 'c01', id: '73e1e53e-c969-45a5-8783-34785ef16e45'},
  {table: 'customer_addresses', key: 'c01', id: 'f1926546-39b5-4421-8d65-47e73119c632'},
  {table: 'customer_contacts', key: 'c01', id: '3539c2e2-7b46-494a-ac5f-b0e833f82f0a'},
  {table: 'customer_contracts', key: 'c01', id: '21208711-6975-4a55-b146-94a090fca772'},
  {table: 'customer_contract_items', key: 'c01-item1', id: '1529de21-f635-48f2-ae68-bd77743c0069'},
  {table: 'customer_contract_items', key: 'c01-item2', id: '521a0db9-86aa-49a9-b4fa-7b499ec01ad5'},
  {table: 'customers', key: 'c02', id: '1d24560c-2b79-4da7-b96e-33d02fb41a78'},
  {table: 'customer_addresses', key: 'c02', id: 'fc48c5fd-a499-44b3-8d19-4849c748ef09'},
  {table: 'customer_contacts', key: 'c02', id: '7ea3b10c-2756-48a1-90d9-492113e895b5'},
  {table: 'customer_contracts', key: 'c02', id: 'f6dba37c-68b6-4927-ba7b-a95faf431386'},
  {table: 'customer_contract_items', key: 'c02-item1', id: '061bdf27-9092-40f6-891e-2f3f6b154538'},
  {table: 'customer_contract_items', key: 'c02-item2', id: 'a1942bbf-9eff-42c1-aae9-e2dd15c1febd'},
  {table: 'customers', key: 'c03', id: '3054338e-89e8-4407-8c4c-7a8603d8b8af'},
  {table: 'customer_addresses', key: 'c03', id: 'ccb5b3b7-c34d-41d9-9c76-df64acbf102d'},
  {table: 'customer_contacts', key: 'c03', id: 'a701a2c8-9c89-439b-82f5-ffbc7c9bd902'},
  {table: 'customer_contracts', key: 'c03', id: '80bf0fc5-8519-4c4a-9858-63350fbce988'},
  {table: 'customer_contract_items', key: 'c03-item1', id: '687f69ba-ddd3-4ded-be53-d1215df1ef7c'},
  {table: 'customer_contract_items', key: 'c03-item2', id: '76b20c23-c923-4917-8326-72c3ac00353d'},
  {table: 'customers', key: 'c04', id: '2a24985a-2626-4952-92d8-c333e673cdb1'},
  {table: 'customers', key: 'c05', id: '3986f298-21a4-4970-b4dc-7ee0e689ce28'},
  {table: 'vehicles', key: 'v01', id: 'f38981b2-c743-4ae7-aadf-3738bce0b27f'},
  {table: 'vehicles', key: 'v02', id: '19e4dff6-0bf6-4a90-a015-a7651a9f0e6f'},
  {table: 'vehicles', key: 'v03', id: 'b65da7ef-48fc-4cfe-83f2-d22b658da19b'},
  {table: 'vehicles', key: 'v04', id: '8a04fd77-8148-4c7d-8606-e813cbe50014'},
  {table: 'vehicles', key: 'v05', id: 'a348bb51-780b-431f-a4bc-a94c7c0f283f'},
  {table: 'vehicles', key: 'v06', id: 'a052a55b-cfc3-4858-b4d3-ef4ff450241e'},
  {table: 'vehicles', key: 'v07', id: '3c01c8da-e4d2-46e6-aaab-afebdebdd5ad'},
  {table: 'vehicles', key: 'v08', id: 'cfcf4643-a907-4e15-a74d-745908ffd5d4'},
  {table: 'vehicles', key: 'v09', id: 'fffd274a-5547-4bcc-9dae-1ca9d072680d'},
  {table: 'vehicles', key: 'v10', id: '61b398cc-ba4a-4ff0-a8ab-a7f71974fac0'},
] as const;

export function expectedIdsByTable(): Map<HmlHardDeleteTable, Set<string>> {
  const map = new Map<HmlHardDeleteTable, Set<string>>();
  for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
    const set = map.get(entry.table) ?? new Set<string>();
    set.add(entry.id);
    map.set(entry.table, set);
  }
  return map;
}

export function allExpectedIds(): Set<string> {
  return new Set(HML_HARD_DELETE_EXPECTED_ENTRIES.map((entry) => entry.id));
}
