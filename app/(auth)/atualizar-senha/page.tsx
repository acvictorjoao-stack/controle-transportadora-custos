import {AuthCard} from '@/components/auth/auth-card';
import {UpdatePasswordForm} from '@/components/auth/update-password-form';

export const metadata = {
  title: 'Redefinir senha',
};

export default function AtualizarSenhaPage() {
  return (
    <AuthCard
      title="Redefinir senha"
      description="Escolha uma nova senha para acessar o FleetControl."
      showLogo={false}
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
