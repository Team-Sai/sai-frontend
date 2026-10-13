import { Link } from 'react-router-dom';
import AppImage from '../components/AppImage';

interface BrandLinkProps {
  to: string;
}

export default function BrandLink({ to }: BrandLinkProps) {
  return (
    <Link to={to} className="app-brand" aria-label="사이원장 홈">
      <AppImage
        src="/images/common/logo.avif"
        width={46}
        height={46}
        alt=""
        className="app-brand__logo"
      />
      <span className="app-brand__name">사이원장</span>
    </Link>
  );
}
