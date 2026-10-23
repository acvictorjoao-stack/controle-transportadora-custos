/**
 * Gera CPF/CNPJ fictícios com dígitos verificadores inválidos.
 * Aborta se algum documento passar na validação oficial do algoritmo.
 */

function cpfCheckDigits(base9: string): [number, number] {
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(base9[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;

  sum = 0;
  const withD1 = `${base9}${d1}`;
  for (let i = 0; i < 10; i += 1) sum += Number(withD1[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;

  return [d1, d2];
}

function cnpjCheckDigits(base12: string): [number, number] {
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(base12[i]) * weights1[i];
  let d1 = sum % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;

  sum = 0;
  const withD1 = `${base12}${d1}`;
  for (let i = 0; i < 13; i += 1) sum += Number(withD1[i]) * weights2[i];
  let d2 = sum % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;

  return [d1, d2];
}

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const [d1, d2] = cpfCheckDigits(digits.slice(0, 9));
  return digits[9] === String(d1) && digits[10] === String(d2);
}

export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits)) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const [d1, d2] = cnpjCheckDigits(digits.slice(0, 12));
  return digits[12] === String(d1) && digits[13] === String(d2);
}

/** Força dígitos verificadores incorretos a partir de uma base. */
export function makeInvalidCpf(sequence: number): string {
  const base9 = `70${String(sequence).padStart(7, '0')}`.slice(0, 9);
  const [d1, d2] = cpfCheckDigits(base9);
  const wrongD1 = (d1 + 1) % 10;
  const wrongD2 = (d2 + 1) % 10;
  const digits = `${base9}${wrongD1}${wrongD2}`;
  if (isValidCpf(digits)) {
    throw new Error(`CPF gerado acidentalmente válido: ${digits}`);
  }
  return digits;
}

export function makeInvalidCnpj(sequence: number): string {
  const base12 = `88${String(sequence).padStart(10, '0')}`.slice(0, 12);
  const [d1, d2] = cnpjCheckDigits(base12);
  const wrongD1 = (d1 + 1) % 10;
  const wrongD2 = (d2 + 1) % 10;
  const digits = `${base12}${wrongD1}${wrongD2}`;
  if (isValidCnpj(digits)) {
    throw new Error(`CNPJ gerado acidentalmente válido: ${digits}`);
  }
  return digits;
}

export function assertFictitiousDocuments(documents: {
  cpfs: string[];
  cnpjs: string[];
}): void {
  for (const cpf of documents.cpfs) {
    if (cpf.length !== 11) {
      throw new Error(`CPF fictício com tamanho inválido: ${cpf}`);
    }
    if (isValidCpf(cpf)) {
      throw new Error(`CPF fictício passou no dígito verificador: ${cpf}`);
    }
  }
  for (const cnpj of documents.cnpjs) {
    if (cnpj.length !== 14) {
      throw new Error(`CNPJ fictício com tamanho inválido: ${cnpj}`);
    }
    if (isValidCnpj(cnpj)) {
      throw new Error(`CNPJ fictício passou no dígito verificador: ${cnpj}`);
    }
  }
}
