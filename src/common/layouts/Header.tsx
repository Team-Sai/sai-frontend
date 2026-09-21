import { Link, useLocation } from 'react-router-dom';
import HeaderShell from './HeaderShell';

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: '대시보드',
    to: '/integration/dashboard',
    activeOn: ['/integration/dashboard'],
  },
  { key: 'settlement', label: '정산', to: '/settlements', activeOn: ['/settlements'] },
  {
    key: 'contract',
    label: '금전소비대차',
    to: '/contracts/dashboard',
    activeOn: ['/contract', '/contracts'],
  },
  { key: 'calendar', label: '캘린더', to: '/calendar', activeOn: ['/calendar'] },
];

const IMPLEMENTED_PATHS = new Set([
  '/integration/dashboard',
  '/settlements',
  '/contracts/dashboard',
  '/calendar',
]);

export default function Header() {
  const { pathname } = useLocation();

  return (
    <HeaderShell
      homeTo="/integration/dashboard"
      navigation={
        <>
          {NAV_ITEMS.map((item) => {
            const isActive = item.activeOn.some(
              (path) => pathname === path || pathname.startsWith(`${path}/`),
            );

            if (!IMPLEMENTED_PATHS.has(item.to)) {
              return (
                <span
                  key={item.key}
                  className={`app-nav__link app-nav__link--disabled${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  aria-disabled="true"
                  title="준비 중입니다"
                >
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.to}
                className={`app-nav__link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </>
      }
      actionsLabel="사용자 메뉴"
      actions={
        <>
          <Link
            to="/archive"
            className="app-header-profile"
            aria-label="보관함"
            aria-current={
              pathname === '/archive' ||
              pathname.startsWith('/archive/')
                ? 'page'
                : undefined
            }
            title="보관함"
          >
            <img
              src="/images/common/archive.svg"
              alt=""
            />
          </Link>
          <Link
            to="/notifications"
            className="app-header-profile"
            aria-label="알림"
            aria-current={pathname === '/notifications' ? 'page' : undefined}
          >
            <img src="/images/common/notification.svg" alt="" />
          </Link>
          <Link to="/mypage" className="app-header-profile" aria-label="마이페이지">
            <img src="/images/common/profile.svg" alt="" />
          </Link>
        </>
      }
    />
  );
}
