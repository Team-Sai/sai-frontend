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
import DashboardPage from './pages/DashboardPage';
import ContractFormPage from './contract/ContractFormPage';
import ContractSignaturePage from './contract/ContractSignaturePage';
import ContractCompletePage from './contract/ContractCompletePage';
import SettlementListPage from './settlement/pages/SettlementListPage';
import SettlementCreatePage from './settlement/pages/SettlementCreatePage';
import SettlementDetailPage from './settlement/pages/SettlementDetailPage';
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
                        path="/settlements"
                        element={
                            <ProtectedRoute>
                                <SettlementListPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/settlements/new"
                        element={
                            <ProtectedRoute>
                                <SettlementCreatePage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/settlements/:settlementId"
                        element={
                            <ProtectedRoute>
                                <SettlementDetailPage />
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