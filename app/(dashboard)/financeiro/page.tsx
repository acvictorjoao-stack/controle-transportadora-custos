import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';

/** RC 26.4.1 — Home do Financeiro é o Dashboard; rota legada só redireciona. */
export default function FinanceiroPage() {
  redirect(ROUTES.financeiroDashboard);
}
