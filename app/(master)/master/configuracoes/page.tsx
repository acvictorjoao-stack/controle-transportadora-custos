import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {PlatformSettingsForm} from '@/features/master/settings/components/platform-settings-form';
import {getPlatformSettings} from '@/features/master/settings/queries/platform-settings';
import {createClient} from '@/supabase/server';

export default async function MasterConfiguracoesPage() {
  let settings = null;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    settings = await getPlatformSettings(supabase);
  } catch (fetchError) {
    error =
      fetchError instanceof Error
        ? fetchError.message
        : 'Erro ao carregar configurações.';
  }

  return (
    <PageTemplate
      title="Configurações"
      description="Configurações globais da plataforma"
    >
      <Section>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {settings && <PlatformSettingsForm settings={settings} />}
      </Section>
    </PageTemplate>
  );
}
