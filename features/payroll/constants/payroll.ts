export const PAYROLL_EXPENSES_PAGE_SIZE = 10;
export const POSITIONS_PAGE_SIZE = 10;
export const EMPLOYEES_PAGE_SIZE = 10;

/**
 * Embeds via FKs compostas de `payroll_expenses` (migration 091).
 * Hint por coluna (`:employee_id`, etc.) gera PGRST200.
 * Não inclui embed de `branches`: o mapper usa só `branch_id` escalar.
 */
export const PAYROLL_EXPENSE_EMPLOYEE_EMBED =
  'employees!payroll_expenses_employee_company_fkey(id, name)';

export const PAYROLL_EXPENSE_DRIVER_EMBED =
  'drivers!payroll_expenses_driver_company_fkey(id, name)';

export const PAYROLL_EXPENSE_POSITION_EMBED =
  'positions!payroll_expenses_position_company_fkey(id, code, name)';

export const PAYROLL_EXPENSE_COST_CENTER_EMBED =
  'cost_centers!payroll_expenses_cost_center_company_fkey(id, code, name)';

export const PAYROLL_EXPENSE_LIST_COLUMNS = `
  id, company_id, branch_id, employee_id, driver_id, position_id, cost_center_id,
  competence, expense_type, expense_status, amount, payment_method,
  due_date, paid_at, notes, metadata, status, created_at, updated_at,
  ${PAYROLL_EXPENSE_EMPLOYEE_EMBED},
  ${PAYROLL_EXPENSE_DRIVER_EMBED},
  ${PAYROLL_EXPENSE_POSITION_EMBED},
  ${PAYROLL_EXPENSE_COST_CENTER_EMBED}
`;

export const POSITION_LIST_COLUMNS =
  'id, company_id, code, name, description, is_system, status, created_at, updated_at';

export const EMPLOYEE_LIST_COLUMNS = `
  id, company_id, branch_id, position_id, cost_center_id, name, cpf,
  registration_number, email, phone, contract_type, hired_at, terminated_at,
  notes, status, created_at, updated_at
`;

/**
 * Embeds via FKs compostas da migration 091.
 * Hint por coluna (`:position_id`, `:cost_center_id`, `:branch_id`) gera PGRST200.
 */
export const EMPLOYEE_POSITION_EMBED =
  'positions!employees_position_company_fkey(id, code, name)';

export const EMPLOYEE_COST_CENTER_EMBED =
  'cost_centers!employees_cost_center_company_fkey(id, code, name)';

export const EMPLOYEE_BRANCH_EMBED =
  'branches!employees_branch_company_fkey(id, code, name)';

export const EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS = `
  id, company_id, branch_id, position_id, cost_center_id, name, cpf,
  registration_number, email, phone, contract_type, hired_at, terminated_at,
  notes, status, created_at, updated_at,
  ${EMPLOYEE_POSITION_EMBED},
  ${EMPLOYEE_COST_CENTER_EMBED},
  ${EMPLOYEE_BRANCH_EMBED}
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
