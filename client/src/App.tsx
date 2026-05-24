import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isShortcutSafeEvent } from './lib/keyboard';
import { HostDashboardPage } from './pages/HostDashboardPage';
import { HostEditPage } from './pages/HostEditPage';
import { HostLandingPage } from './pages/HostLandingPage';
import { HostLobbyPage } from './pages/HostLobbyPage';
import { JoinPage } from './pages/JoinPage';
import { LandingPage } from './pages/LandingPage';
import { RoomUnavailablePage } from './pages/RoomUnavailablePage';
import { TeamPage } from './pages/TeamPage';

/**
 * Prevent Space/Enter from activating focused buttons while typing in fields
 * (some browsers bubble key events oddly). Never call preventDefault in inputs.
 */
function useFormTypingGuard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isShortcutSafeEvent(event)) {
        return;
      }
      // Do not preventDefault — allow normal typing including space.
      event.stopPropagation();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
}

export function App() {
  useFormTypingGuard();

  return (
    <div className="app-shell w-full max-w-full min-w-0 overflow-x-hidden isolate">
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/host" element={<HostLandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/rom-utilgjengelig" element={<RoomUnavailablePage />} />
        <Route path="/host/:roomId" element={<HostDashboardPage />} />
        <Route path="/host/:roomId/present" element={<HostLobbyPage />} />
        <Route path="/host/:roomId/edit" element={<HostEditPage />} />
        <Route path="/team/:roomId" element={<TeamPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BrowserRouter>
    </div>
  );
}
