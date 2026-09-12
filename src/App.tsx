import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: '10px', padding: '10px' }}>
        <Link to="/login">login</Link>
        <Link to="/signup">signup</Link>
        <Link to="/mypage">mypage</Link>
        <Link to="/identity-test">identity-test</Link>
        <Link to="/accounts">accounts</Link>
      </nav>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;