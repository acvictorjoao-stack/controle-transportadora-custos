import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';

export default function ConfiguracoesPage() {
  redirect(`${ROUTES.empresas}?tab=configuracoes`);
}
