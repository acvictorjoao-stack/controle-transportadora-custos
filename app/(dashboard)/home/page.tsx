import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';

/** Alias de compatibilidade: a home oficial é `/`. */
export default function HomeAliasPage() {
  redirect(ROUTES.home);
}
