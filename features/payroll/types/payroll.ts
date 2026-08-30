import type {FinancialEntryStatus} from '@/features/financial/types';
import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  PAYROLL_EXPENSE_STATUSES,
  PAYROLL_EXPENSE_TYPES,
  PAYROLL_PAYMENT_METHODS,
  PAYROLL_PERSON_KINDS,
} from '../constants/enums';

export type PayrollExpenseType = (typeof PAYROLL_EXPENSE_TYPES)[number];
export type PayrollExpenseStatus = (typeof PAYROLL_EXPENSE_STATUSES)[number];
export type PayrollPaymentMethod = (typeof PAYROLL_PAYMENT_METHODS)[number];

/** Origem da pessoa vinculada à despesa: cadastro operacional ou colaborador. */
export type PayrollPersonKind = (typeof PAYROLL_PERSON_KINDS)[number];

export interface PayrollPersonOption {
  id: string;
  kind: PayrollPersonKind;
  name: string;
  positionId: string | null;
  costCenterId: string | null;
  active: boolean;
}

export interface PositionRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: EntityStatus;
  active: boolean;
}

export interface EmployeeRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  position_id: string | null;
  cost_center_id: string | null;
  name: string;
  cpf: string | null;
  registration_number: string | null;
  email: string | null;
  phone: string | null;
  contract_type: string | null;
  hired_at: string | null;
  terminated_at: string | null;
  notes: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  companyId: string;
  branchId: string | null;
  positionId: string | null;
  costCenterId: string | null;
  name: string;
  cpf: string | null;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  contractType: string | null;
  hiredAt: string | null;
  terminatedAt: string | null;
  notes: string | null;
  status: EntityStatus;
  active: boolean;
}

type EmbeddedNamed = {id: string; name: string} | {id: string; name: string}[] | null;
type EmbeddedCoded =
  | {id: string; code: string; name: string}
  | {id: string; code: string; name: string}[]
  | null;

export interface PayrollExpenseRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  employee_id: string | null;
  driver_id: string | null;
  position_id: string | null;
  cost_center_id: string;
  competence: string;
  expense_type: PayrollExpenseType;
  expense_status: PayrollExpenseStatus;
  amount: number | string;
  payment_method: PayrollPaymentMethod | null;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  employees?: EmbeddedNamed;
  drivers?: EmbeddedNamed;
  positions?: EmbeddedCoded;
  cost_centers?: EmbeddedCoded;
}

export interface PayrollExpense {
  id: string;
  companyId: string;
  branchId: string | null;
  employeeId: string | null;
  driverId: string | null;
  /** Identificador da pessoa, independente da origem do cadastro. */
  personId: string;
  personKind: PayrollPersonKind;
  personName: string | null;
  positionId: string | null;
  positionName: string | null;
  costCenterId: string;
  costCenterCode: string | null;
  costCenterName: string | null;
  competence: string;
  expenseType: PayrollExpenseType;
  expenseStatus: PayrollExpenseStatus;
  amount: number;
  paymentMethod: PayrollPaymentMethod | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  /** Lançamento em financial_entries gerado por esta despesa. */
  financialEntryId: string | null;
  /** Situação do lançamento (a baixa pode ocorrer em Contas a Pagar). */
  financialStatus: FinancialEntryStatus | null;
}

export interface PayrollListFilters {
  competence?: string;
  personId?: string;
  positionId?: string;
  costCenterId?: string;
  expenseType?: PayrollExpenseType;
  expenseStatus?: PayrollExpenseStatus;
}

export interface PayrollSortOptions {
  sortBy?: 'competence' | 'amount' | 'due_date' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedPayrollExpenses {
  items: PayrollExpense[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PayrollSummary {
  totalCompetence: number;
  totalPaid: number;
  totalPending: number;
  peopleCount: number;
}

export const PAYROLL_EXPENSE_TYPE_LABELS: Record<PayrollExpenseType, string> = {
  salario: 'Salário',
  hora_extra: 'Hora extra',
  adicional: 'Adicional',
  beneficios: 'Benefícios',
  vale_alimentacao: 'Vale alimentação',
  vale_transporte: 'Vale transporte',
  encargos: 'Encargos',
  ferias: 'Férias',
  decimo_terceiro: '13º salário',
  rescisao: 'Rescisão',
  outros: 'Outros',
};

export const PAYROLL_EXPENSE_STATUS_LABELS: Record<PayrollExpenseStatus, string> = {
  pending: 'Em aberto',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

export const PAYROLL_PAYMENT_METHOD_LABELS: Record<PayrollPaymentMethod, string> = {
  pix: 'PIX',
  transferencia: 'Transferência',
  deposito: 'Depósito',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
  outros: 'Outros',
};

export const PAYROLL_PERSON_KIND_LABELS: Record<PayrollPersonKind, string> = {
  driver: 'Motorista',
  employee: 'Colaborador',
};
