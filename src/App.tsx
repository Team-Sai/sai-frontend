import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import AppLayout from './common/layouts/AppLayout';
import MinimalLayout from './common/layouts/MinimalLayout';
import LoginPage from './users/pages/LoginPage';
import SignupPage from './users/pages/SignupPage';
import MyPage from './users/pages/MyPage';
import IdentityTestPage from './identity/pages/IdentityTestPage';
import AccountsPage from './accounts/pages/AccountsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<MinimalLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
          <Route element={<AppLayout />}>
            <Route
              path="/integration/dashboard"
              element={
                <ProtectedRoute>
                    <DashboardPage/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mypage"
              element={
                <ProtectedRoute>
                  <MyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/identity-test"
              element={
                <ProtectedRoute>
                  <IdentityTestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;