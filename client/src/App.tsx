import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HostDashboardPage } from './pages/HostDashboardPage';
import { HostEditPage } from './pages/HostEditPage';
import { JoinPage } from './pages/JoinPage';
import { LandingPage } from './pages/LandingPage';
import { TeamPage } from './pages/TeamPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/host/:roomId" element={<HostDashboardPage />} />
        <Route path="/host/:roomId/edit" element={<HostEditPage />} />
        <Route path="/team/:roomId" element={<TeamPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
