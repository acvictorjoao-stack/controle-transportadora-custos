'use client';

import {
  ArrowLeft,
  Copy,
  KeyRound,
  Mail,
  PauseCircle,
  Pencil,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {ROUTES} from '@/constants/routes/paths';
import {getPlanLabel, type PlanCatalogItem} from '@/features/master/plans';

import {
  deleteCompanyAction,
  reactivateCompanyAction,
  resendCredentialsAction,
  resetAdminPasswordAction,
  suspendCompanyAction,
  updateCompanyAction,
} from '../actions';
import {ENTITY_STATUS_LABELS, PROVISION_STATUS_LABELS} from '../constants';
import {formatCompanyTaxIdDisplay} from '../services';
import type {CompanyDetail, EntityStatus} from '../types';
import type {UpdateCompanyInput} from '../validation';
import {getDisplayName, slugify} from '../utils/format';

export interface EmpresaDetailProps {
  company: CompanyDetail;
  plans: PlanCatalogItem[];
}

type FieldErrors = Partial<Record<keyof UpdateCompanyInput, string>>;

function getStatusVariant(status: EntityStatus) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'inactive':
      return 'warning' as const;
    case 'blocked':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function getProvisionVariant(status: CompanyDetail['provisionStatus']) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'in_progress':
      return 'info' as const;
    case 'error':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function EmpresaDetail({company: initialCompany, plans}: EmpresaDetailProps) {
  const router = useRouter();
  const [company, setCompany] = React.useState(initialCompany);
  const [editing, setEditing] = React.useState(false);
  const [formData, setFormData] = React.useState<UpdateCompanyInput>(() => ({
    legalName: initialCompany.legalName,
    tradeName: initialCompany.tradeName,
    slug: initialCompany.slug,
    email: initialCompany.email,
    phone: initialCompany.phone,
    status: initialCompany.status,
    planSlug: initialCompany.planSlug,
    notes: initialCompany.notes,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [credentials, setCredentials] = React.useState<{
    adminEmail: string;
    temporaryPassword: string;
    accessUrl: string;
  } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  function updateField<K extends keyof UpdateCompanyInput>(
    field: K,
    value: UpdateCompanyInput[K],
  ) {
    setFormData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
    setFormError(null);
  }

  function handleCancelEdit() {
    setEditing(false);
    setFormData({
      legalName: company.legalName,
      tradeName: company.tradeName,
      slug: company.slug,
      email: company.email,
      phone: company.phone,
      status: company.status,
      planSlug: company.planSlug,
      notes: company.notes,
    });
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = await updateCompanyAction(company.id, formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    setCompany((prev) => ({...prev, ...result.data}));
    setEditing(false);
    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Deseja excluir esta empresa? Ela será removida da listagem (exclusão lógica).',
    );
    if (!confirmed) return;

    setActionLoading('delete');
    const result = await deleteCompanyAction(company.id);
    if (!result.success) {
      setFormError(result.error);
      setActionLoading(null);
      return;
    }
    router.push(ROUTES.masterEmpresas);
    router.refresh();
  }

  async function handleSuspend() {
    setActionLoading('suspend');
    setFormError(null);
    const result = await suspendCompanyAction(company.id);
    if (!result.success) {
      setFormError(result.error);
      setActionLoading(null);
      return;
    }
    setCompany((prev) => ({...prev, status: result.data.status}));
    setActionMessage('Empresa suspensa com sucesso.');
    setActionLoading(null);
    router.refresh();
  }

  async function handleReactivate() {
    setActionLoading('reactivate');
    setFormError(null);
    const result = await reactivateCompanyAction(company.id);
    if (!result.success) {
      setFormError(result.error);
      setActionLoading(null);
      return;
    }
    setCompany((prev) => ({...prev, status: result.data.status}));
    setActionMessage('Empresa reativada com sucesso.');
    setActionLoading(null);
    router.refresh();
  }

  async function handleResetPassword() {
    setActionLoading('reset');
    setFormError(null);
    const result = await resetAdminPasswordAction(company.id);
    if (!result.success) {
      setFormError(result.error);
      setActionLoading(null);
      return;
    }
    setCredentials(result.data);
    setActionMessage('Senha resetada. Copie as novas credenciais.');
    setActionLoading(null);
  }

  async function handleResendCredentials() {
    setActionLoading('resend');
    setFormError(null);
    const result = await resendCredentialsAction(company.id);
    if (!result.success) {
      setFormError(result.error);
      setActionLoading(null);
      return;
    }
    setCredentials(result.data);
    setActionMessage('Novas credenciais geradas.');
    setActionLoading(null);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage('Copiado para a área de transferência.');
    } catch {
      setFormError('Não foi possível copiar.');
    }
  }

  function buildCredentialsText() {
    const email = credentials?.adminEmail ?? company.admin?.email ?? '';
    const password = credentials?.temporaryPassword ?? '(gere novas credenciais)';
    const url = credentials?.accessUrl ?? company.accessUrl;
    return [
      `Empresa: ${getDisplayName(company.legalName, company.tradeName)}`,
      `URL: ${url}`,
      `E-mail: ${email}`,
      `Senha temporária: ${password}`,
    ].join('\n');
  }

  const selectClassName =
    'flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={ROUTES.masterEmpresas}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </Link>
        <Badge variant={getStatusVariant(company.status)}>
          {ENTITY_STATUS_LABELS[company.status]}
        </Badge>
        <Badge variant={getProvisionVariant(company.provisionStatus)}>
          {PROVISION_STATUS_LABELS[company.provisionStatus]}
        </Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
          )}
          {company.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSuspend()}
              disabled={actionLoading === 'suspend'}
            >
              <PauseCircle className="size-4" />
              Suspender
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleReactivate()}
              disabled={actionLoading === 'reactivate'}
            >
              <PlayCircle className="size-4" />
              Reativar
            </Button>
          )}
          {company.admin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleResetPassword()}
                disabled={actionLoading === 'reset'}
              >
                <KeyRound className="size-4" />
                Resetar senha
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleResendCredentials()}
                disabled={actionLoading === 'resend'}
              >
                <Mail className="size-4" />
                Reenviar credenciais
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copyText(company.accessUrl)}
          >
            <Copy className="size-4" />
            Copiar URL
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copyText(buildCredentialsText())}
            disabled={!company.admin}
          >
            <Copy className="size-4" />
            Copiar credenciais
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={actionLoading === 'delete'}
          >
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      </div>

      {company.provisionError && (
        <Alert variant="destructive">
          <AlertDescription>{company.provisionError}</AlertDescription>
        </Alert>
      )}

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {actionMessage && (
        <Alert>
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      )}

      {credentials && (
        <Alert>
          <AlertDescription className="space-y-1">
            <p>Novas credenciais geradas (exibidas uma única vez):</p>
            <p className="font-mono text-xs">
              E-mail: {credentials.adminEmail} · Senha: {credentials.temporaryPassword}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {editing ? (
        <Card className="py-4 shadow-none">
          <CardHeader className="px-4 py-0">
            <CardTitle className="text-base">Editar empresa</CardTitle>
            <CardDescription>Atualize os dados cadastrais da empresa</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <form onSubmit={handleSave} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Razão Social" htmlFor="legalName" required error={fieldErrors.legalName}>
                  <Input id="legalName" value={formData.legalName} onChange={(e) => updateField('legalName', e.target.value)} error={Boolean(fieldErrors.legalName)} />
                </FormField>
                <FormField label="Nome Fantasia" htmlFor="tradeName" error={fieldErrors.tradeName}>
                  <Input id="tradeName" value={formData.tradeName ?? ''} onChange={(e) => updateField('tradeName', e.target.value)} error={Boolean(fieldErrors.tradeName)} />
                </FormField>
                <FormField label="Slug" htmlFor="slug" required error={fieldErrors.slug}>
                  <Input id="slug" value={formData.slug} onChange={(e) => updateField('slug', slugify(e.target.value))} error={Boolean(fieldErrors.slug)} />
                </FormField>
                <FormField label="Plano" htmlFor="planSlug" error={fieldErrors.planSlug}>
                  <select id="planSlug" value={formData.planSlug ?? 'free'} onChange={(e) => updateField('planSlug', e.target.value)} className={selectClassName}>
                    {plans.map((plan) => (
                      <option key={plan.slug} value={plan.slug}>{plan.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="E-mail" htmlFor="email" required error={fieldErrors.email}>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} error={Boolean(fieldErrors.email)} />
                </FormField>
                <FormField label="Telefone" htmlFor="phone" error={fieldErrors.phone}>
                  <Input id="phone" value={formData.phone ?? ''} onChange={(e) => updateField('phone', e.target.value)} error={Boolean(fieldErrors.phone)} />
                </FormField>
                <FormField label="Status" htmlFor="status" required error={fieldErrors.status}>
                  <select id="status" value={formData.status} onChange={(e) => updateField('status', e.target.value as EntityStatus)} className={selectClassName}>
                    {(Object.keys(ENTITY_STATUS_LABELS) as EntityStatus[]).map((status) => (
                      <option key={status} value={status}>{ENTITY_STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Observações" htmlFor="notes" error={fieldErrors.notes} className="md:col-span-2">
                  <Textarea id="notes" value={formData.notes ?? ''} onChange={(e) => updateField('notes', e.target.value)} error={Boolean(fieldErrors.notes)} placeholder="Anotações internas sobre a empresa" />
                </FormField>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={submitting}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar alterações'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="py-4 shadow-none">
            <CardHeader className="px-4 py-0">
              <CardTitle className="text-base">Empresa</CardTitle>
              <CardDescription>Informações cadastrais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <DetailRow label="Razão Social" value={company.legalName} />
              <DetailRow label="Nome Fantasia" value={company.tradeName ?? '—'} />
              <DetailRow label="CNPJ" value={formatCompanyTaxIdDisplay(company.taxId)} />
              <DetailRow label="Slug" value={company.slug} mono />
              <DetailRow label="Status" value={ENTITY_STATUS_LABELS[company.status]} />
              <DetailRow label="Plano" value={getPlanLabel(plans, company.planSlug)} />
              <DetailRow label="URL" value={company.accessUrl} mono />
              <DetailRow label="E-mail" value={company.email} />
              {company.phone && <DetailRow label="Telefone" value={company.phone} />}
              <DetailRow label="Cadastro" value={new Date(company.createdAt).toLocaleString('pt-BR')} />
              <DetailRow label="Última atualização" value={new Date(company.updatedAt).toLocaleString('pt-BR')} />
            </CardContent>
          </Card>

          <Card className="py-4 shadow-none">
            <CardHeader className="px-4 py-0">
              <CardTitle className="text-base">Administrador</CardTitle>
              <CardDescription>Usuário principal da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              {company.admin ? (
                <>
                  <DetailRow label="Nome" value={company.admin.fullName} />
                  <DetailRow label="E-mail" value={company.admin.email} />
                  <DetailRow
                    label="Último login"
                    value={
                      company.admin.lastLoginAt
                        ? new Date(company.admin.lastLoginAt).toLocaleString('pt-BR')
                        : 'Nunca'
                    }
                  />
                </>
              ) : (
                <p className="text-muted-foreground">Administrador não provisionado.</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4 shadow-none">
            <CardHeader className="px-4 py-0">
              <CardTitle className="text-base">Organização</CardTitle>
              <CardDescription>Estrutura operacional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <DetailRow label="Filiais" value={String(company.branchCount)} />
              <DetailRow label="Usuários ativos" value={String(company.memberCount)} />
            </CardContent>
          </Card>

          <Card className="py-4 shadow-none">
            <CardHeader className="px-4 py-0">
              <CardTitle className="text-base">Provisionamento</CardTitle>
              <CardDescription>Status e histórico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <DetailRow label="Status" value={PROVISION_STATUS_LABELS[company.provisionStatus]} />
              <DetailRow
                label="Data"
                value={
                  company.provisionedAt
                    ? new Date(company.provisionedAt).toLocaleString('pt-BR')
                    : '—'
                }
              />
              {company.provisionError && (
                <DetailRow label="Erro" value={company.provisionError} />
              )}
              {company.provisionHistory.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-muted-foreground">Histórico</p>
                  <ul className="space-y-2">
                    {company.provisionHistory.map((entry) => (
                      <li key={`${entry.at}-${entry.status}`} className="rounded-md border border-border p-2">
                        <p className="font-medium">
                          {PROVISION_STATUS_LABELS[entry.status]} ·{' '}
                          {new Date(entry.at).toLocaleString('pt-BR')}
                        </p>
                        {entry.message && (
                          <p className="text-xs text-muted-foreground">{entry.message}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {company.notes && (
            <Card className="py-4 shadow-none lg:col-span-2">
              <CardHeader className="px-4 py-0">
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">{company.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs font-medium' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}

export {EmpresaDetail};
