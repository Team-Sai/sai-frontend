const FOOTER_ITEMS = [
  {
    label: '이용약관',
    href: 'https://app.notion.com/p/3e5df8d6088d806f920dd994afc2f2f9',
    external: true,
  },
  {
    label: '개인정보처리방침',
    href: 'https://app.notion.com/p/3e5df8d6088d80b0a04bf1849fa96385',
    external: true,
  },
];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div>
          <strong className="app-footer__brand">사이원장</strong>
          <p className="app-footer__description">정산과 차용증 거래를 한 곳에서 확인하세요.</p>
        </div>
        <nav className="app-footer__nav" aria-label="푸터 메뉴">
          {FOOTER_ITEMS.map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
