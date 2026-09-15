import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import AppLayout from './common/layouts/AppLayout';
import MinimalLayout from './common/layouts/MinimalLayout';
import LoginPage from './users/pages/LoginPage';
import SignupPage from './users/pages/SignupPage';
import MyPage from './users/pages/MyPage';
import IdentityTestPage from './identity/pages/IdentityTestPage';
import LinkCompletePage from './link/pages/LinkCompletePage';
import ContractDashboardPage from './contract/DashboardPage';
import ContractFormPage from './contract/ContractFormPage';
import ContractSignaturePage from './contract/ContractSignaturePage';
import ContractCompletePage from './contract/ContractCompletePage';

function App() {
    return (
      <BrowserRouter>
         <AuthProvider>
            <Routes>
                <Route
                    path="/link/complete"
                    element={<LinkCompletePage />}
                />
                <Route element={<MinimalLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                </Route>
                <Route element={<AppLayout />}>
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
                        path="/contracts/new"
                        element={
                            <ProtectedRoute>
                                <ContractFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/contracts/signature"
                        element={
                            <ProtectedRoute>
                                <ContractSignaturePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/contracts/complete"
                        element={
                            <ProtectedRoute>
                                <ContractCompletePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/contracts/dashboard"
                        element={
                            <ProtectedRoute>
                                <ContractDashboardPage />
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