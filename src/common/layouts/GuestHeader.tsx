import { Link } from 'react-router-dom';

type MenuKey = 'intro' | 'settlement' | 'iou' | 'calendar';

interface GuestHeaderProps {
  activeMenu?: MenuKey;
}

const NAV_ITEMS: { key: MenuKey; label: string; href: string }[] = [
  { key: 'intro', label: '서비스소개', href: '#intro' },
  { key: 'settlement', label: '정산', href: '#settlement' },
  { key: 'iou', label: '금전소비대차', href: '#iou' },
  { key: 'calendar', label: '캘린더', href: '#calendar' },
];

export default function GuestHeader({ activeMenu }: GuestHeaderProps) {
  return (
    <header className="relative z-50 flex h-20 items-center gap-6 bg-surface px-12">
      <Link
        to="/login"
        className="ml-50.5 flex min-w-40 items-center gap-2.5 font-extrabold text-text"
        aria-label="사이원장 홈"
      >
        <img
          src="/images/common/logo.png"
          alt="사이원장 로고"
          className="h-11.5 w-11.5 object-contain"
        />
        <span className="text-[28px] leading-none font-extrabold whitespace-nowrap text-text">
          사이원장
        </span>
      </Link>

      <nav
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-7.5 text-[17px] font-bold text-nav-default"
        aria-label="주요 메뉴"
      >
        {NAV_ITEMS.map((item) => (
          <a  
            key={item.key}
            href={item.href}
            className={`flex h-20 items-center border-b-2 whitespace-nowrap transition-colors ${
              activeMenu === item.key
                ? 'border-nav-active text-nav-active'
                : 'border-transparent text-nav-default hover:text-text'
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="ml-auto mr-50.5" aria-label="로그인 메뉴">
        <Link
          to="/login"
          className="flex h-10 w-25 items-center justify-center rounded-lg bg-primary text-base font-semibold text-white"
        >
          로그인
        </Link>
      </div>
    </header>
  );
}