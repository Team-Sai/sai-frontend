import { Link } from 'react-router-dom';

interface BrandLinkProps {
  to: string;
}

export default function BrandLink({ to }: BrandLinkProps) {
  return (
    <Link to={to} className="app-brand" aria-label="사이원장 홈">
      <img
        src="/images/common/logo.png"
        alt=""
        className="app-brand__logo"
      />
      <span className="app-brand__name">사이원장</span>
    </Link>
  );
}
