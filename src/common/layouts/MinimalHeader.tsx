import { Link } from 'react-router-dom';

export default function MinimalHeader() {
  return (
    <header className="relative z-50 flex h-20 items-center gap-6 bg-surface px-12">
      <Link
        to="/intro"
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
    </header>
  );
}