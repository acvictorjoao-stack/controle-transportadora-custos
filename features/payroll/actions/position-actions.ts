'use server';

import type {ActionResult} from '@/features/organization/shared/action-result';
import {getServerSupabaseClient} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {
  createPosition,
  setPositionStatus,
  softDeletePosition,
  updatePosition,
} from '../queries';
import type {Position} from '../types';
import {createPositionSchema, updatePositionSchema} from '../validation';
import type {CreatePositionInput} from '../validation';
import {
  revalidatePositionPaths,
  resolvePayrollAccess,
} from './payroll-access';

function generatePositionCode(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 40);

  return base || 'CARGO';
}

function resolvePositionCode(input: CreatePositionInput): string {
  return input.code ?? generatePositionCode(input.name);
}

export async function createPositionAction(input: unknown): Promise<ActionResult<Position>> {
  const resolved = await resolvePayrollAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createPositionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const position = await createPosition(
      supabase,
      resolved.data.companyId,
      {
        ...parsed.data,
        code: resolvePositionCode(parsed.data),
      },
      resolved.data.profileId,
    );

    revalidatePositionPaths();
    return {success: true, data: position};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cadastrar cargo.',
    };
  }
}

export async function updatePositionAction(
  positionId: string,
  input: unknown,
): Promise<ActionResult<Position>> {
  const resolved = await resolvePayrollAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updatePositionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const position = await updatePosition(
      supabase,
      resolved.data.companyId,
      positionId,
      {
        ...parsed.data,
        code: parsed.data.code ?? generatePositionCode(parsed.data.name),
      },
      resolved.data.profileId,
    );

    revalidatePositionPaths();
    return {success: true, data: position};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar cargo.',
    };
  }
}

export async function togglePositionStatusAction(
  positionId: string,
  active: boolean,
): Promise<ActionResult<Position>> {
  const resolved = await resolvePayrollAccess('financeiro:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const position = await setPositionStatus(
      supabase,
      resolved.data.companyId,
      positionId,
      active ? 'active' : 'inactive',
      resolved.data.profileId,
    );
    revalidatePositionPaths();
    return {success: true, data: position};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status.',
    };
  }
}

export async function deletePositionAction(positionId: string): Promise<ActionResult<void>> {
  const resolved = await resolvePayrollAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeletePosition(
      supabase,
      resolved.data.companyId,
      positionId,
      resolved.data.profileId,
    );
    revalidatePositionPaths();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir cargo.',
    };
  }
}
