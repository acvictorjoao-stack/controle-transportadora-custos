import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';

export default function ManutencaoPneusRedirectPage() {
  redirect(ROUTES.pneus);
}
