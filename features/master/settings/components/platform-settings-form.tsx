'use client';

import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {updatePlatformSettingsAction} from '@/features/master/settings/actions/settings-actions';
import type {PlatformSettings} from '@/features/master/settings/types';

export interface PlatformSettingsFormProps {
  settings: PlatformSettings;
}

function PlatformSettingsForm({settings}: PlatformSettingsFormProps) {
  const [platformName, setPlatformName] = React.useState(settings.platformName);
  const [logoUrl, setLogoUrl] = React.useState(settings.logoUrl ?? '');
  const [faviconUrl, setFaviconUrl] = React.useState(settings.faviconUrl ?? '');
  const [publicUrl, setPublicUrl] = React.useState(settings.publicUrl ?? '');
  const [senderEmail, setSenderEmail] = React.useState(settings.senderEmail ?? '');
  const [sessionTimeout, setSessionTimeout] = React.useState(
    String(settings.sessionTimeoutMinutes),
  );
  const [maxUploadMb, setMaxUploadMb] = React.useState(String(settings.maxUploadMb));

  const [smtpHost, setSmtpHost] = React.useState(settings.smtpConfig.host);
  const [smtpPort, setSmtpPort] = React.useState(String(settings.smtpConfig.port));
  const [smtpUsername, setSmtpUsername] = React.useState(settings.smtpConfig.username);
  const [smtpPassword, setSmtpPassword] = React.useState(settings.smtpConfig.password);
  const [smtpSecure, setSmtpSecure] = React.useState(settings.smtpConfig.secure);

  const [minLength, setMinLength] = React.useState(
    String(settings.passwordPolicy.min_length),
  );
  const [requireUppercase, setRequireUppercase] = React.useState(
    settings.passwordPolicy.require_uppercase,
  );
  const [requireLowercase, setRequireLowercase] = React.useState(
    settings.passwordPolicy.require_lowercase,
  );
  const [requireNumber, setRequireNumber] = React.useState(
    settings.passwordPolicy.require_number,
  );
  const [requireSpecial, setRequireSpecial] = React.useState(
    settings.passwordPolicy.require_special,
  );

  const [stripeEnabled, setStripeEnabled] = React.useState(
    settings.integrations.stripe_enabled,
  );
  const [webhookUrl, setWebhookUrl] = React.useState(settings.integrations.webhook_url);
  const [analyticsId, setAnalyticsId] = React.useState(settings.integrations.analytics_id);

  const [maintenanceMode, setMaintenanceMode] = React.useState(
    settings.featureFlags.maintenance_mode,
  );
  const [allowSignups, setAllowSignups] = React.useState(
    settings.featureFlags.allow_signups,
  );
  const [enableBi, setEnableBi] = React.useState(settings.featureFlags.enable_bi);
  const [enableIa, setEnableIa] = React.useState(settings.featureFlags.enable_ia);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const checkboxClassName = 'size-4 rounded border-input';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setFieldErrors({});

    const result = await updatePlatformSettingsAction({
      platformName,
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
      publicUrl: publicUrl || null,
      senderEmail: senderEmail || null,
      sessionTimeoutMinutes: Number(sessionTimeout),
      maxUploadMb: Number(maxUploadMb),
      smtpConfig: {
        host: smtpHost,
        port: Number(smtpPort),
        username: smtpUsername,
        password: smtpPassword,
        secure: smtpSecure,
      },
      passwordPolicy: {
        min_length: Number(minLength),
        require_uppercase: requireUppercase,
        require_lowercase: requireLowercase,
        require_number: requireNumber,
        require_special: requireSpecial,
      },
      integrations: {
        stripe_enabled: stripeEnabled,
        webhook_url: webhookUrl,
        analytics_id: analyticsId,
      },
      featureFlags: {
        maintenance_mode: maintenanceMode,
        allow_signups: allowSignups,
        enable_bi: enableBi,
        enable_ia: enableIa,
      },
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess(true);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>Configurações salvas com sucesso.</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Identidade da plataforma</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Nome da plataforma"
            htmlFor="platformName"
            required
            error={fieldErrors.platformName}
          >
            <Input
              id="platformName"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <FormField label="URL pública" htmlFor="publicUrl" error={fieldErrors.publicUrl}>
            <Input
              id="publicUrl"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://app.exemplo.com"
              disabled={loading}
            />
          </FormField>
          <FormField label="Logo (URL)" htmlFor="logoUrl" error={fieldErrors.logoUrl}>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://"
              disabled={loading}
            />
          </FormField>
          <FormField label="Favicon (URL)" htmlFor="faviconUrl" error={fieldErrors.faviconUrl}>
            <Input
              id="faviconUrl"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://"
              disabled={loading}
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">E-mail (SMTP)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Host SMTP" htmlFor="smtpHost">
            <Input
              id="smtpHost"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <FormField label="Porta" htmlFor="smtpPort">
            <Input
              id="smtpPort"
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <FormField label="Usuário SMTP" htmlFor="smtpUsername">
            <Input
              id="smtpUsername"
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <FormField label="Senha SMTP" htmlFor="smtpPassword">
            <Input
              id="smtpPassword"
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <FormField label="E-mail remetente" htmlFor="senderEmail" error={fieldErrors.senderEmail}>
            <Input
              id="senderEmail"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="smtpSecure"
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className={checkboxClassName}
              disabled={loading}
            />
            <label htmlFor="smtpSecure" className="text-sm">
              Conexão segura (TLS)
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Sessão e segurança</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Tempo de sessão (minutos)"
            htmlFor="sessionTimeout"
            error={fieldErrors.sessionTimeoutMinutes}
          >
            <Input
              id="sessionTimeout"
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <FormField
            label="Upload máximo (MB)"
            htmlFor="maxUploadMb"
            error={fieldErrors.maxUploadMb}
          >
            <Input
              id="maxUploadMb"
              type="number"
              value={maxUploadMb}
              onChange={(e) => setMaxUploadMb(e.target.value)}
              disabled={loading}
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tamanho mínimo da senha" htmlFor="minLength">
            <Input
              id="minLength"
              type="number"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <div className="space-y-2 pt-2">
            {[
              {id: 'requireUppercase', label: 'Exigir maiúscula', checked: requireUppercase, set: setRequireUppercase},
              {id: 'requireLowercase', label: 'Exigir minúscula', checked: requireLowercase, set: setRequireLowercase},
              {id: 'requireNumber', label: 'Exigir número', checked: requireNumber, set: setRequireNumber},
              {id: 'requireSpecial', label: 'Exigir caractere especial', checked: requireSpecial, set: setRequireSpecial},
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  id={item.id}
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className={checkboxClassName}
                  disabled={loading}
                />
                <label htmlFor={item.id} className="text-sm">
                  {item.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Integrações futuras</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <input
              id="stripeEnabled"
              type="checkbox"
              checked={stripeEnabled}
              onChange={(e) => setStripeEnabled(e.target.checked)}
              className={checkboxClassName}
              disabled={loading}
            />
            <label htmlFor="stripeEnabled" className="text-sm">
              Stripe habilitado
            </label>
          </div>
          <FormField label="ID Analytics" htmlFor="analyticsId">
            <Input
              id="analyticsId"
              value={analyticsId}
              onChange={(e) => setAnalyticsId(e.target.value)}
              disabled={loading}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Webhook URL" htmlFor="webhookUrl">
              <Textarea
                id="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </FormField>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Feature flags</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {id: 'maintenanceMode', label: 'Modo manutenção', checked: maintenanceMode, set: setMaintenanceMode},
            {id: 'allowSignups', label: 'Permitir cadastros', checked: allowSignups, set: setAllowSignups},
            {id: 'enableBi', label: 'Habilitar BI', checked: enableBi, set: setEnableBi},
            {id: 'enableIa', label: 'Habilitar IA', checked: enableIa, set: setEnableIa},
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                id={item.id}
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.set(e.target.checked)}
                className={checkboxClassName}
                disabled={loading}
              />
              <label htmlFor={item.id} className="text-sm">
                {item.label}
              </label>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" loading={loading}>
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}

export {PlatformSettingsForm};
