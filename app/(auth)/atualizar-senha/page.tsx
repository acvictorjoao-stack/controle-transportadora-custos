import {AuthCard} from '@/components/auth/auth-card';
import {RecoverySessionGate} from '@/components/auth/recovery-session-gate';

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
      <RecoverySessionGate />
    </AuthCard>
  );
}
