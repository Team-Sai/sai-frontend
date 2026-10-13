import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
