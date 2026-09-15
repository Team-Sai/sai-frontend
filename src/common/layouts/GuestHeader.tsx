import { Link } from 'react-router-dom';
import BrandLink from './BrandLink';

type MenuKey = 'intro' | 'settlement' | 'iou' | 'calendar';

interface GuestHeaderProps {
  activeMenu?: MenuKey;
}

const NAV_ITEMS: { key: MenuKey; label: string }[] = [
  { key: 'intro', label: '서비스소개' },
  { key: 'settlement', label: '정산' },
  { key: 'iou', label: '금전소비대차' },
  { key: 'calendar', label: '캘린더' },
];

export default function GuestHeader({ activeMenu }: GuestHeaderProps) {
  return (
    <header className="app-header app-header--guest">
      <div className="app-header__inner">
        <BrandLink to="/login" />
        <nav className="app-nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <span
              key={item.key}
              className={`app-nav__link${activeMenu === item.key ? ' is-active' : ''} app-nav__link--disabled`}
              aria-disabled="true"
              title="소개 페이지 준비 중입니다"
            >
              {item.label}
            </span>
          ))}
        </nav>
        <div className="app-header-actions" aria-label="로그인 메뉴">
          <Link to="/login" className="guest-header-login">로그인</Link>
        </div>
      </div>
    </header>
  );
}
