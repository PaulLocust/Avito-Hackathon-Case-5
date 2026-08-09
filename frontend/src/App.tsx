import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from './shared/components/AppLayout';
import { LoadingState } from './shared/components/LoadingState';

const HomePage = lazy(() => import('./pages/Home/HomePage').then((m) => ({ default: m.HomePage })));
const SessionPage = lazy(() =>
  import('./pages/Session/SessionPage').then((m) => ({ default: m.SessionPage })),
);
const ResultPage = lazy(() =>
  import('./pages/Result/ResultPage').then((m) => ({ default: m.ResultPage })),
);
const ReferencePage = lazy(() =>
  import('./pages/Reference/ReferencePage').then((m) => ({ default: m.ReferencePage })),
);
const SignalDetailPage = lazy(() =>
  import('./pages/Reference/SignalDetailPage').then((m) => ({ default: m.SignalDetailPage })),
);
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState text="Загружаем страницу…" />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/signals" element={<ReferencePage />} />
            <Route path="/signals/:code" element={<SignalDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/session/:sessionId" element={<SessionPage />} />
            <Route path="/session/:sessionId/result" element={<ResultPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
