'use client';

import {FileText, Loader2, Upload, X} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {createClient} from '@/supabase/client';

import {registerCustomerFileAction, replaceCustomerDocumentAction} from '../actions';
import {CUSTOMER_STORAGE_BUCKET} from '../constants';
import {CUSTOMER_DOCUMENT_TYPES} from '../constants/enums';
import type {CustomerDocument, CustomerDocumentType} from '../types';
import {CUSTOMER_DOCUMENT_TYPE_LABELS} from '../types';

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_SIZE = 10 * 1024 * 1024;

export interface CustomerFileUploadProps {
  companyId: string;
  customerId: string;
  contractId?: string | null;
  replacingDocument?: CustomerDocument | null;
  onCancelReplace?: () => void;
  onUploaded: () => void;
}

function CustomerFileUpload({
  companyId,
  customerId,
  contractId,
  replacingDocument,
  onCancelReplace,
  onUploaded,
}: CustomerFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = React.useState<CustomerDocumentType>('other');
  const activeDocumentType = replacingDocument?.documentType ?? documentType;
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato de arquivo não permitido.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. Máximo 10 MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'bin';
    const storagePath = `${companyId}/${customerId}/${activeDocumentType}-${Date.now()}.${ext}`;

    try {
      const supabase = createClient();
      const {error: uploadError} = await supabase.storage
        .from(CUSTOMER_STORAGE_BUCKET)
        .upload(storagePath, file, {upsert: false});

      if (uploadError) throw uploadError;

      const {data: urlData} = supabase.storage.from(CUSTOMER_STORAGE_BUCKET).getPublicUrl(storagePath);

      const payload = {
        customerId,
        contractId: contractId ?? replacingDocument?.contractId ?? null,
        fileUrl: urlData.publicUrl,
        storagePath,
        name: file.name,
        documentType: activeDocumentType,
        mimeType: file.type,
        fileSize: file.size,
      };

      const result = replacingDocument
        ? await replaceCustomerDocumentAction(customerId, replacingDocument.id, payload)
        : await registerCustomerFileAction(payload);

      if (!result.success) {
        await supabase.storage.from(CUSTOMER_STORAGE_BUCKET).remove([storagePath]);
        throw new Error(result.error);
      }

      onUploaded();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      {replacingDocument && (
        <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span>Substituindo: {replacingDocument.name}</span>
          {onCancelReplace && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancelReplace}>
              <X className="size-4" />
              Cancelar
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="size-5 text-muted-foreground" />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={activeDocumentType}
          onChange={(e) => setDocumentType(e.target.value as CustomerDocumentType)}
          disabled={Boolean(replacingDocument)}
        >
          {CUSTOMER_DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{CUSTOMER_DOCUMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {replacingDocument ? 'Selecionar novo arquivo' : 'Enviar documento'}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export {CustomerFileUpload};
