import { useEffect } from 'react';
import { useServerStore } from '../stores/server-store';
import ServerToggle from '../components/server/ServerToggle';
import LogPanel from '../components/server/LogPanel';

export default function Dashboard() {
  const init = useServerStore((s) => s.init);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex justify-center py-8">
        <ServerToggle />
      </div>

      <LogPanel />
    </div>
  );
}
