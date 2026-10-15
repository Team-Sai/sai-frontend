import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clearIdentityVerification,
  getIdentityVerifiedPath,
  isPathWithin,
} from '../../identity/identityVerificationStorage';

const DEBTOR_APPROVAL_SCOPE = /^\/contracts\/\d+\/approve/;

/** 채무자 서명 화면(/contracts/:id/approve/*)을 벗어나면 받아둔 본인인증을 비워 재진입 시 다시 인증받게 한다. */
export default function DebtorApprovalIdentityGuard() {
  const { pathname } = useLocation();

  useEffect(() => {
    const scope = getIdentityVerifiedPath()?.match(DEBTOR_APPROVAL_SCOPE)?.[0];
    if (scope && pathname !== '/identity-test' && !isPathWithin(pathname, scope)) {
      clearIdentityVerification();
    }
  }, [pathname]);

  return null;
}
