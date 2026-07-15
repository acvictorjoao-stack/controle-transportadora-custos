function isUniqueViolation(error: {code?: string}): boolean {
  return error.code === '23505';
}

export function mapDatabaseError(error: {code?: string; message: string}): string {
  if (isUniqueViolation(error)) {
    if (error.message.includes('idx_companies_slug')) {
      return 'Este slug já está em uso.';
    }
    if (error.message.includes('idx_companies_tax_id_active')) {
      return 'Este CNPJ já está cadastrado.';
    }
    if (error.message.includes('idx_branches_company_code_active')) {
      return 'Este código de filial já está em uso.';
    }
    if (error.message.includes('idx_vehicles_company_plate_active')) {
      return 'Esta placa já está cadastrada nesta empresa.';
    }
    if (error.message.includes('idx_drivers_company_cpf_active')) {
      return 'Este CPF já está cadastrado nesta empresa.';
    }
    if (error.message.includes('idx_drivers_company_cnh_active')) {
      return 'Esta CNH já está cadastrada nesta empresa.';
    }
    return 'Já existe um registro com estes dados.';
  }

  return 'Não foi possível concluir a operação.';
}
