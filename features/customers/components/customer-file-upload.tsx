'use client';

import {FileText, Loader2, Upload} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {createClient} from '@/supabase/client';

import {registerCustomerFileAction} from '../actions';
import {CUSTOMER_STORAGE_BUCKET} from '../constants';
import {CUSTOMER_DOCUMENT_TYPES} from '../constants/enums';
import type {CustomerDocumentType} from '../types';
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
  onUploaded: () => void;
}

function CustomerFileUpload({companyId, customerId, contractId, onUploaded}: CustomerFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = React.useState<CustomerDocumentType>('other');
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
    const storagePath = `${companyId}/${customerId}/${documentType}-${Date.now()}.${ext}`;

    try {
      const supabase = createClient();
      const {error: uploadError} = await supabase.storage
        .from(CUSTOMER_STORAGE_BUCKET)
        .upload(storagePath, file, {upsert: true});

      if (uploadError) throw uploadError;

      const {data: urlData} = supabase.storage.from(CUSTOMER_STORAGE_BUCKET).getPublicUrl(storagePath);

      const result = await registerCustomerFileAction({
        customerId,
        contractId: contractId ?? null,
        fileUrl: urlData.publicUrl,
        storagePath,
        name: file.name,
        documentType,
        mimeType: file.type,
        fileSize: file.size,
      });

      if (!result.success) throw new Error(result.error);
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
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="size-5 text-muted-foreground" />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as CustomerDocumentType)}
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
          Enviar documento
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
