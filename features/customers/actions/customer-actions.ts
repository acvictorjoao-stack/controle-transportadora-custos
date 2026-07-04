'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  assertCompanyPermission,
  COMPANY_ACCESS_DENIED,
  getCurrentCompanyId,
  getServerSupabaseClient,
  getUserCompanyMembership,
} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {
  createCustomer,
  createCustomerAddress,
  createCustomerContact,
  createCustomerDocument,
  createCustomerContract,
  softDeleteCustomer,
  softDeleteCustomerAddress,
  softDeleteCustomerContact,
  softDeleteCustomerContract,
  softDeleteCustomerDocument,
  updateCustomer,
  updateCustomerContract,
  updateCustomerStatus,
} from '../queries';
import type {Customer, CustomerAddress, CustomerContact, CustomerContract, CustomerDocument} from '../types';
import {
  createCustomerContractSchema,
  createCustomerSchema,
  customerAddressSchema,
  customerContactSchema,
  updateCustomerContractSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  uploadCustomerFileSchema,
} from '../validation';

type CustomerPermission =
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete';

function revalidateCustomerPaths(customerId?: string) {
  revalidatePath(ROUTES.clientes);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.viagens);
  if (customerId) {
    revalidatePath(ROUTES.clienteDetail(customerId));
  }
}

async function resolveCustomerAccess(
  permission: CustomerPermission,
): Promise<ActionResult<{companyId: string; profileId: string}>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  const membership = await getUserCompanyMembership(supabase, companyId);
  if (!membership) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const allowed = await assertCompanyPermission(supabase, companyId, permission);
  if (!allowed) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  return {success: true, data: {companyId, profileId: membership.profileId}};
}

export async function createCustomerAction(
  input: unknown,
): Promise<ActionResult<Customer>> {
  const resolved = await resolveCustomerAccess('customers:create');
  if (!resolved.success) return resolved;

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createCustomer(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCustomerPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar cliente.',
    };
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: unknown,
): Promise<ActionResult<Customer>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCustomer(
      supabase,
      resolved.data.companyId,
      customerId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar cliente.',
    };
  }
}

export async function updateCustomerStatusAction(
  customerId: string,
  input: unknown,
): Promise<ActionResult<Customer>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  const parsed = updateCustomerStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, error: 'Status inválido.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCustomerStatus(
      supabase,
      resolved.data.companyId,
      customerId,
      parsed.data.customerStatus,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar status.',
    };
  }
}

export async function deleteCustomerAction(
  customerId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveCustomerAccess('customers:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteCustomer(
      supabase,
      resolved.data.companyId,
      customerId,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir cliente.',
    };
  }
}

export async function createCustomerAddressAction(
  customerId: string,
  input: unknown,
): Promise<ActionResult<CustomerAddress>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  const parsed = customerAddressSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, error: 'Verifique os campos do endereço.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createCustomerAddress(
      supabase,
      resolved.data.companyId,
      customerId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar endereço.',
    };
  }
}

export async function deleteCustomerAddressAction(
  customerId: string,
  addressId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteCustomerAddress(
      supabase,
      resolved.data.companyId,
      addressId,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir endereço.',
    };
  }
}

export async function createCustomerContactAction(
  customerId: string,
  input: unknown,
): Promise<ActionResult<CustomerContact>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  const parsed = customerContactSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, error: 'Verifique os campos do contato.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createCustomerContact(
      supabase,
      resolved.data.companyId,
      customerId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar contato.',
    };
  }
}

export async function deleteCustomerContactAction(
  customerId: string,
  contactId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteCustomerContact(
      supabase,
      resolved.data.companyId,
      contactId,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir contato.',
    };
  }
}

export async function createCustomerContractAction(
  input: unknown,
): Promise<ActionResult<CustomerContract>> {
  const resolved = await resolveCustomerAccess('customers:create');
  if (!resolved.success) return resolved;

  const parsed = createCustomerContractSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do contrato.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createCustomerContract(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(parsed.data.customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar contrato.',
    };
  }
}

export async function updateCustomerContractAction(
  contractId: string,
  customerId: string,
  input: unknown,
): Promise<ActionResult<CustomerContract>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  const parsed = updateCustomerContractSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do contrato.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCustomerContract(
      supabase,
      resolved.data.companyId,
      contractId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar contrato.',
    };
  }
}

export async function deleteCustomerContractAction(
  customerId: string,
  contractId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveCustomerAccess('customers:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteCustomerContract(
      supabase,
      resolved.data.companyId,
      contractId,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir contrato.',
    };
  }
}

export async function registerCustomerFileAction(
  input: unknown,
): Promise<ActionResult<CustomerDocument>> {
  const resolved = await resolveCustomerAccess('customers:update');
  if (!resolved.success) return resolved;

  const parsed = uploadCustomerFileSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, error: 'Dados do arquivo inválidos.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createCustomerDocument(
      supabase,
      resolved.data.companyId,
      parsed.data.customerId,
      {
        contractId: parsed.data.contractId,
        name: parsed.data.name,
        fileUrl: parsed.data.fileUrl,
        storagePath: parsed.data.storagePath,
        documentType: parsed.data.documentType,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
      },
      resolved.data.profileId,
    );
    revalidateCustomerPaths(parsed.data.customerId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar documento.',
    };
  }
}

export async function deleteCustomerDocumentAction(
  customerId: string,
  documentId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveCustomerAccess('customers:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteCustomerDocument(
      supabase,
      resolved.data.companyId,
      documentId,
      resolved.data.profileId,
    );
    revalidateCustomerPaths(customerId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir documento.',
    };
  }
}

export async function resolveContractFreightAction(
  contractId: string,
  origin?: string | null,
  destination?: string | null,
): Promise<ActionResult<import('../queries/contracts').ContractFreightDefaults | null>> {
  const resolved = await resolveCustomerAccess('customers:read');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const {resolveContractFreightDefaults} = await import('../queries/contracts');
    const data = await resolveContractFreightDefaults(
      supabase,
      resolved.data.companyId,
      contractId,
      origin,
      destination,
    );
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao carregar dados do contrato.',
    };
  }
}
