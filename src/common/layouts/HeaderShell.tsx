import type { ReactNode } from 'react';
import BrandLink from './BrandLink';

interface HeaderShellProps {
  homeTo: string;
  navigation?: ReactNode;
  actions?: ReactNode;
  actionsLabel?: string;
}

export default function HeaderShell({
  homeTo,
  navigation,
  actions,
  actionsLabel,
}: HeaderShellProps) {
  return (
    <header className={`app-header${navigation ? '' : ' app-header--minimal'}`}>
      <div className="app-header__inner">
        <BrandLink to={homeTo} />
        {navigation && (
          <nav className="app-nav" aria-label="주요 메뉴">
            {navigation}
          </nav>
        )}
        {actions && (
          <div className="app-header-actions" aria-label={actionsLabel}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
