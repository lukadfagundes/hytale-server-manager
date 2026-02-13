import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ToastContainer from './components/layout/ToastContainer';
import Dashboard from './pages/Dashboard';
import ModManager from './pages/ModManager';
import Players from './pages/Players';
import Warps from './pages/Warps';

export default function App() {
  return (
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
            </Routes>
          </main>
        </div>
        <ToastContainer />
      </div>
    </HashRouter>
  );
}
