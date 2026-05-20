import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { AuthScreen } from './components/auth/AuthScreen';
import { BootScreen } from './components/BootScreen';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <BootScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppProvider user={user}>
      <AppShell />
    </AppProvider>
  );
}
