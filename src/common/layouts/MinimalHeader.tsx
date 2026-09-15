import BrandLink from './BrandLink';

export default function MinimalHeader() {
  return (
    <header className="app-header app-header--minimal">
      <div className="app-header__inner">
        <BrandLink to="/login" />
      </div>
    </header>
  );
}
