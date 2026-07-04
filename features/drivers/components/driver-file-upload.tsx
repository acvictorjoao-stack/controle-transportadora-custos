'use client';

import {FileText, ImageIcon, Loader2, Upload} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {createClient} from '@/supabase/client';

import {registerDriverFileAction} from '../actions';
import {DRIVER_STORAGE_BUCKET} from '../constants';
import type {DriverDocumentType} from '../types';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 10 * 1024 * 1024;

export interface DriverFileUploadProps {
  companyId: string;
  driverId: string;
  documentType: DriverDocumentType;
  label: string;
  accept?: string;
  onUploaded: () => void;
}

function buildStoragePath(
  companyId: string,
  driverId: string,
  documentType: DriverDocumentType,
  ext: string,
): string {
  if (documentType === 'document') {
    return `${companyId}/${driverId}/document-${Date.now()}.${ext}`;
  }

  return `${companyId}/${driverId}/${documentType}.${ext}`;
}

function DriverFileUpload({
  companyId,
  driverId,
  documentType,
  label,
  accept,
  onUploaded,
}: DriverFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isImageType =
    documentType === 'photo' ||
    documentType === 'cnh_front' ||
    documentType === 'cnh_back';

  const defaultAccept = isImageType
    ? ACCEPTED_IMAGE_TYPES.join(',')
    : ACCEPTED_DOC_TYPES.join(',');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const allowed = isImageType ? ACCEPTED_IMAGE_TYPES : ACCEPTED_DOC_TYPES;
    if (!allowed.includes(file.type)) {
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
      const path = buildStoragePath(companyId, driverId, documentType, ext);

      const {error: uploadError} = await supabase.storage
        .from(DRIVER_STORAGE_BUCKET)
        .upload(path, file, {upsert: true, contentType: file.type});

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {data: urlData} = supabase.storage
        .from(DRIVER_STORAGE_BUCKET)
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const result = await registerDriverFileAction({
        driverId,
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
    documentType === 'photo' || documentType === 'cnh_front' || documentType === 'cnh_back'
      ? ImageIcon
      : documentType === 'aso' || documentType === 'proof'
        ? FileText
        : Upload;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? defaultAccept}
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

export {DriverFileUpload};
