import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const { signOut } = useAppAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <ShieldOff className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Your account does not have admin privileges.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}