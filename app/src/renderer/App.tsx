import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ToastContainer from './components/layout/ToastContainer';
import UpdateNotification from './components/updates/UpdateNotification';
import ServerSetup from './components/setup/ServerSetup';
import Dashboard from './pages/Dashboard';
import ModManager from './pages/ModManager';
import Players from './pages/Players';
import Warps from './pages/Warps';
import Docs from './pages/Docs';
import './utils/docs-loader';
import { useUpdaterStore } from './stores/updater-store';
import { useConfigStore } from './stores/config-store';
import { useAssetStore } from './stores/asset-store';
import { useUniverseStore } from './stores/universe-store';
import { useModStore } from './stores/mod-store';

export default function App() {
  const configStatus = useConfigStore((s) => s.status);

  useEffect(() => {
    const cleanupUpdater = useUpdaterStore.getState().init();
    const cleanupConfig = useConfigStore.getState().init();
    const cleanupAssets = useAssetStore.getState().init();
    // App-scoped refresh listeners for universe and mod data
    const cleanupUniverse = useUniverseStore.getState().initRefreshListener();
    const cleanupMod = useModStore.getState().initRefreshListener();
    return () => {
      cleanupUpdater();
      cleanupConfig();
      cleanupAssets();
      cleanupUniverse();
      cleanupMod();
    };
  }, []);

  // Loading state while config is being fetched
  if (configStatus === 'loading') {
    return (
      <ErrorBoundary>
        <div className="flex h-screen items-center justify-center bg-hytale-darker">
          <p className="text-hytale-muted text-sm">Loading...</p>
        </div>
      </ErrorBoundary>
    );
  }

  // Setup screen when server path is invalid
  if (configStatus === 'invalid') {
    return (
      <ErrorBoundary>
        <ServerSetup />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/mods" element={<ModManager />} />
                <Route path="/players" element={<Players />} />
                <Route path="/warps" element={<Warps />} />
                <Route path="/docs/*" element={<Docs />} />
              </Routes>
            </main>
          </div>
          <ToastContainer />
          <UpdateNotification />
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}
