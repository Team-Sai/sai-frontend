const FOOTER_ITEMS = ['이용약관', '개인정보처리방침', '고객센터'];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div>
          <strong className="app-footer__brand">사이원장</strong>
          <p className="app-footer__description">정산과 차용증 거래를 한 곳에서 확인하세요.</p>
        </div>
        <nav className="app-footer__nav" aria-label="푸터 메뉴">
          {FOOTER_ITEMS.map((label) => (
            <span key={label} aria-disabled="true" title="준비 중입니다">
              {label}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
