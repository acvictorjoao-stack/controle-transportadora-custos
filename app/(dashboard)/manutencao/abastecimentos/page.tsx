import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';

export default function LegacyAbastecimentosPage() {
  redirect(ROUTES.abastecimentos);
}
