import type {
  Employee,
  EmployeeListItem,
  EmployeeRow,
  PayrollExpense,
  PayrollExpenseRow,
  Position,
  PositionRow,
} from '../types';

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type EmployeeListRow = EmployeeRow & {
  positions?: {id: string; code: string; name: string} | {id: string; code: string; name: string}[] | null;
  cost_centers?: {id: string; code: string; name: string} | {id: string; code: string; name: string}[] | null;
  branches?: {id: string; code: string; name: string} | {id: string; code: string; name: string}[] | null;
};

export function mapPositionRow(row: PositionRow): Position {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    status: row.status,
    active: row.status === 'active',
  };
}

export function mapEmployeeRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    positionId: row.position_id,
    costCenterId: row.cost_center_id,
    name: row.name,
    cpf: row.cpf,
    registrationNumber: row.registration_number,
    email: row.email,
    phone: row.phone,
    contractType: row.contract_type,
    hiredAt: row.hired_at,
    terminatedAt: row.terminated_at,
    notes: row.notes,
    status: row.status,
    active: row.status === 'active',
  };
}

export function mapEmployeeListRow(row: EmployeeListRow): EmployeeListItem {
  const position = firstOrNull(row.positions);
  const costCenter = firstOrNull(row.cost_centers);
  const branch = firstOrNull(row.branches);
  const employee = mapEmployeeRow(row);

  return {
    ...employee,
    positionName: position?.name ?? null,
    positionCode: position?.code ?? null,
    costCenterName: costCenter?.name ?? null,
    costCenterCode: costCenter?.code ?? null,
    branchName: branch?.name ?? null,
  };
}

export function mapPayrollExpenseRow(row: PayrollExpenseRow): PayrollExpense {
  const employee = firstOrNull(row.employees);
  const driver = firstOrNull(row.drivers);
  const position = firstOrNull(row.positions);
  const costCenter = firstOrNull(row.cost_centers);
  const isDriver = row.driver_id != null;

  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    employeeId: row.employee_id,
    driverId: row.driver_id,
    personId: (isDriver ? row.driver_id : row.employee_id) ?? row.id,
    personKind: isDriver ? 'driver' : 'employee',
    personName: (isDriver ? driver?.name : employee?.name) ?? null,
    positionId: row.position_id,
    positionName: position?.name ?? null,
    costCenterId: row.cost_center_id,
    costCenterCode: costCenter?.code ?? null,
    costCenterName: costCenter?.name ?? null,
    competence: row.competence,
    expenseType: row.expense_type,
    expenseStatus: row.expense_status,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.payment_method,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    notes: row.notes,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    financialEntryId: null,
    financialStatus: null,
  };
}
