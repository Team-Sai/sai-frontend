const VERIFICATION_ID_KEY = 'identityVerificationId';
const VERIFIED_PATH_KEY = 'identityVerificationReturnTo';

/** 본인인증 결과와 인증을 요청한 경로를 함께 저장한다. */
export function saveIdentityVerification(identityVerificationId: string, returnTo: string) {
  sessionStorage.setItem(VERIFICATION_ID_KEY, identityVerificationId);
  sessionStorage.setItem(VERIFIED_PATH_KEY, new URL(returnTo, window.location.origin).pathname);
}

export function clearIdentityVerification() {
  sessionStorage.removeItem(VERIFICATION_ID_KEY);
  sessionStorage.removeItem(VERIFIED_PATH_KEY);
}

export function getIdentityVerifiedPath() {
  return sessionStorage.getItem(VERIFIED_PATH_KEY);
}

export function isPathWithin(path: string, scope: string) {
  return path === scope || path.startsWith(`${scope}/`);
}

/** scope 경로(또는 그 하위 경로)에서 받은 본인인증이 있는지 확인한다. */
export function isIdentityVerifiedFor(scope: string) {
  const verifiedPath = getIdentityVerifiedPath();
  return !!sessionStorage.getItem(VERIFICATION_ID_KEY)
    && !!verifiedPath && isPathWithin(verifiedPath, scope);
}
