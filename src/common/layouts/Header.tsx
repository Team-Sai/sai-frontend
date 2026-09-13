import { Link, useLocation } from 'react-router-dom';

interface NavItem {
    key: string;
    label: string;
    to: string;
    implemented: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { key: 'dashboard', label: '대시보드', to: '/integration/dashboard', implemented: true },
    { key: 'settlement', label: '정산', to: '/settlements', implemented: false },
    { key: 'contract', label: '금전소비대차', to: '/contract', implemented: false },
    { key: 'calendar', label: '캘린더', to: '/calendar', implemented: false },
];

export default function Header() {
    const location = useLocation();

    return (
        <header className="relative z-50 flex h-20 items-center gap-6 bg-surface px-12">
            <Link
                to="/integration/dashboard"
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
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);

                    if (!item.implemented) {
                        return (
                            <span
                                key={item.key}
                                className="flex h-20 cursor-not-allowed items-center whitespace-nowrap text-nav-default/40"
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
                            className={`flex h-20 items-center border-b-2 whitespace-nowrap transition-colors ${
                                isActive
                                    ? 'border-nav-active text-nav-active'
                                    : 'border-transparent text-nav-default hover:text-text'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="ml-auto mr-50.5 flex items-center gap-2.5" aria-label="사용자 메뉴">
        <span
            className="flex h-13.5 w-13.5 cursor-not-allowed items-center justify-center rounded-lg opacity-40"
            aria-label="보관함 (준비 중)"
            title="준비 중입니다"
        >
          <img src="/images/common/archive.svg" alt="" className="h-8.5 w-8.5" />
        </span>
                <span
                    className="flex h-13.5 w-13.5 cursor-not-allowed items-center justify-center rounded-lg opacity-40"
                    aria-label="알림 (준비 중)"
                    title="준비 중입니다"
                >
          <img src="/images/common/notification.svg" alt="" className="h-8.5 w-8.5" />
        </span>
                <Link
                    to="/mypage"
                    className="flex h-13.5 w-13.5 items-center justify-center rounded-lg transition hover:bg-[#f2f2f2]"
                >
                    <img src="/images/common/profile.svg" alt="" className="h-8.5 w-8.5" />
                </Link>
            </div>
        </header>
    );
}