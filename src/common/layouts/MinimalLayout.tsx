import { Outlet } from 'react-router-dom';
import MinimalHeader from './MinimalHeader';
import Footer from './Footer';

export default function MinimalLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <MinimalHeader />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
