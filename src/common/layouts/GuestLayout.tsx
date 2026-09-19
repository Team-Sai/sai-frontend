import { Outlet } from 'react-router-dom';
import GuestHeader from './GuestHeader';
import Footer from './Footer';

export default function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <GuestHeader />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
