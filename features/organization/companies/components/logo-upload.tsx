'use client';

import {ImageIcon, Loader2, Trash2, Upload} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {createClient} from '@/supabase/client';

import {updateCompanyLogoAction} from '../actions';
import {COMPANY_LOGOS_STORAGE_BUCKET} from '../constants';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024;

export interface LogoUploadProps {
  companyId: string;
  logoUrl: string | null;
  onUploaded: (logoUrl: string | null) => void;
}

function LogoUpload({companyId, logoUrl, onUploaded}: LogoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const preview = localPreview ?? logoUrl;
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato inválido. Use JPEG, PNG, WebP ou SVG.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. Máximo 5 MB.');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${companyId}/logo.${ext}`;

      const {data: existing} = await supabase.storage
        .from(COMPANY_LOGOS_STORAGE_BUCKET)
        .list(companyId, {limit: 100});
      const stalePaths =
        existing
          ?.filter((item) => item.name.startsWith('logo.') && item.name !== `logo.${ext}`)
          .map((item) => `${companyId}/${item.name}`) ?? [];
      if (stalePaths.length > 0) {
        await supabase.storage.from(COMPANY_LOGOS_STORAGE_BUCKET).remove(stalePaths);
      }

      const {error: uploadError} = await supabase.storage
        .from(COMPANY_LOGOS_STORAGE_BUCKET)
        .upload(path, file, {upsert: true, contentType: file.type});

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {data: urlData} = supabase.storage
        .from(COMPANY_LOGOS_STORAGE_BUCKET)
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const result = await updateCompanyLogoAction({logoUrl: publicUrl});

      if (!result.success) {
        throw new Error(result.error);
      }

      setLocalPreview(publicUrl);
      onUploaded(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar logo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);

    try {
      const result = await updateCompanyLogoAction({logoUrl: null});
      if (!result.success) {
        throw new Error(result.error);
      }
      setLocalPreview(null);
      onUploaded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover logo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
          {preview ? (
            <Image
              src={preview}
              alt="Logo da empresa"
              width={96}
              height={96}
              className="size-full object-contain"
              unoptimized
            />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
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
              <Upload className="size-4" />
            )}
            {preview ? 'Alterar logo' : 'Enviar logo'}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={handleRemove}
            >
              <Trash2 className="size-4" />
              Remover
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP ou SVG. Máximo 5 MB.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export {LogoUpload};
