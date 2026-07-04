'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import {createClient} from '@/supabase/server';

import {updatePlatformSettings} from '../queries/platform-settings';
import type {PlatformSettings} from '../types';
import {updatePlatformSettingsSchema} from '../validation/schemas';

export interface ActionError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionError;

export async function updatePlatformSettingsAction(
  input: unknown,
): Promise<ActionResult<PlatformSettings>> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  const parsed = updatePlatformSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await createClient();
    const data = await updatePlatformSettings(supabase, {
      platform_name: parsed.data.platformName,
      logo_url: parsed.data.logoUrl,
      favicon_url: parsed.data.faviconUrl,
      public_url: parsed.data.publicUrl,
      smtp_config: parsed.data.smtpConfig,
      sender_email: parsed.data.senderEmail,
      session_timeout_minutes: parsed.data.sessionTimeoutMinutes,
      password_policy: parsed.data.passwordPolicy,
      max_upload_mb: parsed.data.maxUploadMb,
      integrations: parsed.data.integrations,
      feature_flags: parsed.data.featureFlags,
    });

    const {
      data: {user},
    } = await supabase.auth.getUser();

    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.SETTINGS_UPDATE,
      actorProfileId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      targetType: 'settings',
      targetId: 'default',
      targetLabel: parsed.data.platformName,
    });

    revalidatePath(ROUTES.masterConfiguracoes);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao salvar configurações.',
    };
  }
}
