import { useEffect } from 'react';
import { useServerStore } from '../stores/server-store';
import ServerToggle from '../components/server/ServerToggle';
import LogPanel from '../components/server/LogPanel';

export default function Dashboard() {
  const init = useServerStore((s) => s.init);

  // Server log/status listeners are Dashboard-scoped since LogPanel only renders here
  useEffect(() => {
    const cleanupServer = init();
    return () => {
      cleanupServer();
    };
  }, [init]);

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="flex justify-center py-6">
        <ServerToggle />
      </div>

      <LogPanel />
    </div>
  );
}
