import { Link, useLocation } from 'react-router-dom';
import BrandLink from './BrandLink';

const NAV_ITEMS = [
  { key: 'dashboard', label: '대시보드', to: '/integration/dashboard', activeOn: ['/integration/dashboard'] },
  { key: 'settlement', label: '정산', to: '/settlements', activeOn: ['/settlements'] },
  { key: 'contract', label: '금전소비대차', to: '/contract', activeOn: ['/contract', '/contracts'] },
  { key: 'calendar', label: '캘린더', to: '/calendar', activeOn: ['/calendar'] },
];

const IMPLEMENTED_PATHS = new Set(['/integration/dashboard', '/settlements']);

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <BrandLink to="/integration/dashboard" />

        <nav className="app-nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => {
            const isActive = item.activeOn.some((path) => pathname === path || pathname.startsWith(`${path}/`));

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
        </nav>

        <div className="app-header-actions" aria-label="사용자 메뉴">
          <span className="app-header-actions__disabled" aria-disabled="true" title="보관함: 준비 중입니다">
            <img src="/images/common/archive.svg" alt="" />
            <span className="sr-only">보관함 (준비 중)</span>
          </span>
          <span className="app-header-actions__disabled" aria-disabled="true" title="알림: 준비 중입니다">
            <img src="/images/common/notification.svg" alt="" />
            <span className="sr-only">알림 (준비 중)</span>
          </span>
          <Link to="/mypage" className="app-header-profile" aria-label="마이페이지">
            <img src="/images/common/profile.svg" alt="" />
          </Link>
        </div>
      </div>
    </header>
  );
}
