export default function Footer() {
  return (
    <footer className="flex min-h-30 items-center justify-between gap-6 bg-footer-bg px-12 py-6 text-white">
      <div>
        <strong className="block text-[15px] font-extrabold text-white">
          사이원장
        </strong>
        <p className="mt-2 text-[13px] leading-relaxed text-footer-text">
          정산과 차용증 거래를 한 곳에서 확인하세요.
        </p>
      </div>

      <nav
        aria-label="푸터 메뉴"
        className="flex items-center gap-4.5 text-[13px] font-bold text-footer-link"
      >
        <a href="#" className="transition-colors hover:text-white">
          이용약관
        </a>
        <a href="#" className="transition-colors hover:text-white">
          개인정보처리방침
        </a>
        <a href="#" className="transition-colors hover:text-white">
          고객센터
        </a>
      </nav>
    </footer>
  );
}