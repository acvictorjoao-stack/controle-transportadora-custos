import {Suspense} from 'react';

import {AuthCard} from '@/components/auth/auth-card';
import {LoginForm} from '@/components/auth/login-form';
import {PageLoader} from '@/components/feedback/page-loader';

export const metadata = {
  title: 'Entrar',
};

function LoginFormFallback() {
  return <PageLoader />;
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Bem-vindo de volta"
      description="Acesse o FleetControl com seu e-mail e senha."
      showLogo={false}
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
