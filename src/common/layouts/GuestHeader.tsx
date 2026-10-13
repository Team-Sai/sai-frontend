import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HeaderShell from './HeaderShell';

type MenuKey = 'intro' | 'settlement' | 'iou' | 'calendar';

const NAV_ITEMS: { key: MenuKey; label: string }[] = [
  { key: 'intro', label: '서비스소개' },
  { key: 'settlement', label: '정산' },
  { key: 'iou', label: '금전소비대차' },
  { key: 'calendar', label: '캘린더' },
];

export default function GuestHeader() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('intro');
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const id = hash.slice(1) || 'intro';
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      if (NAV_ITEMS.some((item) => item.key === id)) {
        if (id === 'intro') {
          window.scrollTo({ top: 0, behavior });
        } else {
          document.getElementById(id)?.scrollIntoView({ block: 'start', behavior });
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current: MenuKey = 'intro';
        for (const item of NAV_ITEMS) {
          const section = document.getElementById(item.key);
          if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.35)
            current = item.key;
        }
        setActiveMenu(current);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <HeaderShell
      homeTo="/intro"
      navigation={
        <>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={`/intro#${item.key}`}
              className={`app-nav__link${activeMenu === item.key ? ' is-active' : ''}`}
              aria-current={activeMenu === item.key ? 'location' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </>
      }
      actionsLabel="로그인 메뉴"
      actions={
        <Link to="/login" className="guest-header-login">
          로그인
        </Link>
      }
    />
  );
}
