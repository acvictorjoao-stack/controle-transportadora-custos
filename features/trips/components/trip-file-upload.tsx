'use client';

import {FileText, ImageIcon, Loader2, Upload} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {createClient} from '@/supabase/client';

import {registerTripFileAction} from '../actions';
import {TRIP_STORAGE_BUCKET} from '../constants';
import type {TripDocumentType} from '../types';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/xml',
  'text/xml',
];
const MAX_SIZE = 10 * 1024 * 1024;

export interface TripFileUploadProps {
  companyId: string;
  tripId: string;
  documentType: TripDocumentType;
  label: string;
  accept?: string;
  onUploaded: () => void;
}

function buildStoragePath(
  companyId: string,
  tripId: string,
  documentType: TripDocumentType,
  ext: string,
): string {
  return `${companyId}/${tripId}/${documentType}-${Date.now()}.${ext}`;
}

function TripFileUpload({
  companyId,
  tripId,
  documentType,
  label,
  accept,
  onUploaded,
}: TripFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isImageType = documentType === 'photo' || documentType === 'canhoto';

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
      const path = buildStoragePath(companyId, tripId, documentType, ext);

      const {error: uploadError} = await supabase.storage
        .from(TRIP_STORAGE_BUCKET)
        .upload(path, file, {upsert: true, contentType: file.type});

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {data: urlData} = supabase.storage
        .from(TRIP_STORAGE_BUCKET)
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const result = await registerTripFileAction({
        tripId,
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
    documentType === 'photo' || documentType === 'canhoto'
      ? ImageIcon
      : documentType === 'receipt' || documentType === 'checklist'
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

export {TripFileUpload};
