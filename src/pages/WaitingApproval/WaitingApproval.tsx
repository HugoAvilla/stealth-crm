import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWaitingApprovalRedirects } from './hooks/useWaitingApprovalRedirects';
import { WaitingApprovalCard } from './components/WaitingApprovalCard';

export default function WaitingApproval() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();

  // Polling checks and route forwarding logic
  useWaitingApprovalRedirects(user, refreshUser);

  const userName = user?.profile?.name || user?.email?.split('@')[0] || '';
  const userEmail = user?.email || '';

  const whatsappMessage = encodeURIComponent(
    `Olá, fiz o pagamento da plataforma CRM WFE, segue o comprovante do pagamento e aguardo a liberação para uso da plataforma.\nNome: ${userName}\nEmail: ${userEmail}`
  );
  const whatsappUrl = `https://wa.me/5517992573141?text=${whatsappMessage}`;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <WaitingApprovalCard
        onSignOut={handleSignOut}
        whatsappUrl={whatsappUrl}
      />
    </div>
  );
}
