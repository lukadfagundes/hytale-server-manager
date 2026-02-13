import { useEffect } from 'react';
import { useServerStore } from '../stores/server-store';
import { useUniverseStore } from '../stores/universe-store';
import { useModStore } from '../stores/mod-store';
import ServerToggle from '../components/server/ServerToggle';
import LogPanel from '../components/server/LogPanel';

export default function Dashboard() {
  const init = useServerStore((s) => s.init);
  const initUniverseRefresh = useUniverseStore((s) => s.initRefreshListener);
  const initModRefresh = useModStore((s) => s.initRefreshListener);

  useEffect(() => {
    const cleanupServer = init();
    const cleanupUniverse = initUniverseRefresh();
    const cleanupMod = initModRefresh();
    return () => {
      cleanupServer();
      cleanupUniverse();
      cleanupMod();
    };
  }, [init, initUniverseRefresh, initModRefresh]);

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
