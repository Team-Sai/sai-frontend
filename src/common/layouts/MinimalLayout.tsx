import { Outlet } from 'react-router-dom';
import MinimalHeader from './MinimalHeader';
import Footer from './Footer';

export default function MinimalLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <MinimalHeader />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}