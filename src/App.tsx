import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import AppLayout from "./common/layouts/AppLayout";
import MinimalLayout from "./common/layouts/MinimalLayout";
import LoginPage from "./users/pages/LoginPage";
import SignupPage from "./users/pages/SignupPage";
import MyPage from "./users/pages/MyPage";
import IdentityTestPage from "./identity/pages/IdentityTestPage";
import LinkCompletePage from "./link/pages/LinkCompletePage";
import DashboardPage from "./pages/DashboardPage";
import ContractDashboardPage from "./contract/pages/DashboardPage";

import NotificationCenter from "./notification/NotificationCenter";
import ContractFormPage from "./contract/pages/ContractFormPage";
import ContractSignaturePage from "./contract/pages/ContractSignaturePage";
import ContractCompletePage from "./contract/pages/ContractCompletePage";
import SchedulePage from "./contract/pages/SchedulePage";
import DebtorContractFormPage from "./contract/pages/DebtorContractFormPage";
import DebtorSignaturePage from "./contract/pages/DebtorSignaturePage";
import ArchivePage from "./archive/ArchivePage";
import SettlementArchivePreviewPage from "./archive/pages/SettlementArchivePreviewPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/link/complete" element={<LinkCompletePage />} />
          <Route element={<MinimalLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
          <Route element={<AppLayout />}>
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integration/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
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
              path="/contracts/dashboard"
              element={
                <ProtectedRoute>
                  <ContractDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId/schedule"
              element={
                <ProtectedRoute>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId/approve"
              element={
                <ProtectedRoute>
                  <DebtorContractFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId/approve/signature"
              element={
                <ProtectedRoute>
                  <DebtorSignaturePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/archive"
              element={
                <ProtectedRoute>
                  <ArchivePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/archive/settlements/:settlementId"
              element={
                <ProtectedRoute>
                  <SettlementArchivePreviewPage />
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
