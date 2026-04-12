import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import PasswordStrengthIndicator from '../components/common/PasswordStrengthIndicator';

export default function RegisterPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('homeowner');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await registerUser({ email, password, role });

      if (result.success && result.data) {
        login(result.data.user, result.data.token);
        navigate('/');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            BidWork
          </Link>
          <h2 className="mt-4 text-2xl font-semibold text-white">Create your account</h2>
          <p className="mt-2 text-slate-400">Get started with AI-powered project scoping</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Min 8 chars, uppercase, number, special"
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-1">
              I am a
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="homeowner">Homeowner</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="mt-4 text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
