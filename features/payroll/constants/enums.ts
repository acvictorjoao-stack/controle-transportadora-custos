export const PAYROLL_EXPENSE_TYPES = [
  'salario',
  'hora_extra',
  'adicional',
  'beneficios',
  'vale_alimentacao',
  'vale_transporte',
  'encargos',
  'ferias',
  'decimo_terceiro',
  'rescisao',
  'outros',
] as const;

export const PAYROLL_EXPENSE_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export const PAYROLL_PAYMENT_METHODS = [
  'pix',
  'transferencia',
  'deposito',
  'dinheiro',
  'cheque',
  'outros',
] as const;

export const PAYROLL_PERSON_KINDS = ['driver', 'employee'] as const;
