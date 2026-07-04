'use client';

import {FileText, Loader2, Upload} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {createClient} from '@/supabase/client';

import {uploadFinancialFileAction} from '../actions';
import {FINANCIAL_STORAGE_BUCKET} from '../constants';
import type {FinancialDocumentType} from '../types';

const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 10 * 1024 * 1024;

export interface FinancialFileUploadProps {
  companyId: string;
  financialEntryId: string;
  documentType: FinancialDocumentType;
  label: string;
  accept?: string;
  onUploaded: () => void;
}

function buildStoragePath(
  companyId: string,
  financialEntryId: string,
  documentType: FinancialDocumentType,
  ext: string,
): string {
  return `${companyId}/${financialEntryId}/${documentType}-${Date.now()}.${ext}`;
}

function FinancialFileUpload({
  companyId,
  financialEntryId,
  documentType,
  label,
  accept,
  onUploaded,
}: FinancialFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
      setError('Formato de arquivo não permitido.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. Máximo 10 MB.');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = buildStoragePath(companyId, financialEntryId, documentType, ext);

      const {error: uploadError} = await supabase.storage
        .from(FINANCIAL_STORAGE_BUCKET)
        .upload(path, file, {upsert: true, contentType: file.type});

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {data: urlData} = supabase.storage
        .from(FINANCIAL_STORAGE_BUCKET)
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const result = await uploadFinancialFileAction({
        financialEntryId,
        fileUrl: publicUrl,
        storagePath: path,
        name: file.name,
        documentType,
        mimeType: file.type,
        fileSize: file.size,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const Icon =
    documentType === 'invoice' ||
    documentType === 'boleto' ||
    documentType === 'receipt' ||
    documentType === 'proof'
      ? FileText
      : Upload;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? ACCEPTED_DOC_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Icon className="size-4" />
        )}
        {label}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export {FinancialFileUpload};
