import { Link } from 'react-router-dom';
import { LEGAL_LINKS } from '../../legal/constants';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div>
          <strong className="app-footer__brand">사이원장</strong>
          <p className="app-footer__description">정산과 차용증 거래를 한 곳에서 확인하세요.</p>
        </div>
        <nav className="app-footer__nav" aria-label="푸터 메뉴">
          {LEGAL_LINKS.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
