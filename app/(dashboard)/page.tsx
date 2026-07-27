import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';

/** Compatibilidade: a home oficial do tenant é `/dashboard`. */
export default function HomePage() {
  redirect(ROUTES.dashboard);
}
