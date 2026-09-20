import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GuestLayout from './common/layouts/GuestLayout';
import IntroPage from './guest/IntroPage';

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

import ContractDashboardPage from './contract/pages/DashboardPage';
import ContractDocumentPage from './contract/pages/ContractDocumentPage';
import ContractFormPage from './contract/pages/ContractFormPage';
import ContractSignaturePage from './contract/pages/ContractSignaturePage';
import ContractCompletePage from './contract/pages/ContractCompletePage';
import SchedulePage from './contract/pages/SchedulePage';
import ContractChangeFormPage from './contract/pages/ContractChangeFormPage';
import ContractChangeRequestDetailPage from './contract/pages/ContractChangeRequestDetailPage';
import ContractChangeApprovalFormPage from './contract/pages/ContractChangeApprovalFormPage';
import ContractChangeApprovalSignaturePage from './contract/pages/ContractChangeApprovalSignaturePage';
import ContractChangeRequestSentPage from './contract/pages/ContractChangeRequestSentPage';
import ContractChangeSignaturePage from './contract/pages/ContractChangeSignaturePage';
import DebtorContractFormPage from './contract/pages/DebtorContractFormPage';
import DebtorSignaturePage from './contract/pages/DebtorSignaturePage';

import NotificationCenter from './notification/NotificationCenter';

import ArchivePage from './archive/ArchivePage';
import SettlementArchivePreviewPage from './archive/pages/SettlementArchivePreviewPage';
import ContractArchivePreviewPage from './archive/pages/ContractArchivePreviewPage';

import SettlementListPage from './settlement/pages/SettlementListPage';
import SettlementCreatePage from './settlement/pages/SettlementCreatePage';
import SettlementDetailPage from './settlement/pages/SettlementDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/intro" replace />} />
          <Route element={<GuestLayout />}>
            <Route path="/intro" element={<IntroPage />} />
          </Route>
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
              path="/contracts/:contractId/contract-detail"
              element={
                <ProtectedRoute>
                  <ContractDocumentPage />
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
              path="/contracts/:contractId/change-request"
              element={
                <ProtectedRoute>
                  <ContractChangeFormPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/contracts/:contractId/change-requests/sent"
              element={
                <ProtectedRoute>
                  <ContractChangeRequestSentPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/contracts/:contractId/change-requests/:changeRequestId/signature"
              element={
                <ProtectedRoute>
                  <ContractChangeSignaturePage />
                </ProtectedRoute>
              }
            />

                        <Route
              path="/contracts/:contractId/change-requests/:changeRequestId"
              element={
                <ProtectedRoute>
                  <ContractChangeRequestDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/contracts/:contractId/change-approval"
              element={
                <ProtectedRoute>
                  <ContractChangeApprovalFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId/change-approval/signature"
              element={
                <ProtectedRoute>
                  <ContractChangeApprovalSignaturePage />
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
            <Route
              path="/archive/contracts/:contractId"
              element={
                <ProtectedRoute>
                  <ContractArchivePreviewPage />
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
