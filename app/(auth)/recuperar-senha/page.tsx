import {AuthCard} from '@/components/auth/auth-card';
import {ForgotPasswordForm} from '@/components/auth/forgot-password-form';

export const metadata = {
  title: 'Recuperar senha',
};

export default function RecuperarSenhaPage() {
  return (
    <AuthCard
      title="Esqueci minha senha"
      description="Informe seu e-mail para receber o link de redefinição de senha."
      showLogo={false}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
