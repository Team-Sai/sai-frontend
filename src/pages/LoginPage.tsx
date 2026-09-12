import { authFetch } from '../api/authFetch';

function LoginPage() {
  const handleTestClick = async () => {
    try {
      const res = await authFetch('/api/users/me');
      console.log('status:', res.status);
      const data = await res.text();
      console.log('response:', data);
    } catch (err) {
      console.error('caught error:', err);
    }
  };

  return (
    <div>
      <div>Login Page</div>
      <button onClick={handleTestClick}>authFetch 테스트</button>
    </div>
  );
}

export default LoginPage;