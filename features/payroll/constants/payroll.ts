export const PAYROLL_EXPENSES_PAGE_SIZE = 10;

export const PAYROLL_EXPENSE_LIST_COLUMNS = `
  id, company_id, branch_id, employee_id, driver_id, position_id, cost_center_id,
  competence, expense_type, expense_status, amount, payment_method,
  due_date, paid_at, notes, metadata, status, created_at, updated_at,
  employees:employee_id (id, name),
  drivers:driver_id (id, name),
  positions:position_id (id, code, name),
  cost_centers:cost_center_id (id, code, name)
`;

export const POSITION_LIST_COLUMNS =
  'id, company_id, code, name, description, is_system, status, created_at, updated_at';

export const EMPLOYEE_LIST_COLUMNS = `
  id, company_id, branch_id, position_id, cost_center_id, name, cpf,
  registration_number, email, phone, contract_type, hired_at, terminated_at,
  notes, status, created_at, updated_at
`;

/** Categoria financeira já semeada por empresa (062/083) — não criar nova. */
export const PAYROLL_CATEGORY_SLUG = 'salarios';

/** Cargo padrão sugerido quando a pessoa vem do cadastro de motoristas. */
export const PAYROLL_DRIVER_POSITION_CODE = 'MOTORISTA';

/** Centro de custo sugerido para motoristas (editável no formulário). */
export const PAYROLL_DRIVER_COST_CENTER_CODE = 'OPERACIONAL';

/** Centro de custo sugerido para colaboradores sem centro próprio. */
export const PAYROLL_DEFAULT_COST_CENTER_CODE = 'RH';

/** Campo usado pelas actions para sinalizar duplicidade que exige confirmação. */
export const PAYROLL_DUPLICATE_FIELD = 'confirmDuplicate';
