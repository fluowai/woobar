import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-stone-900">Woobar</h1>
          <p className="text-stone-500 mt-1">Management System 360°</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-stone-100 p-8 space-y-6">
          <h2 className="text-xl font-bold text-stone-900 text-center">Acessar Plataforma</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              placeholder="seu@email.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Senha</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="Sua senha" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-xs text-stone-400 text-center mt-4">
            Woobar Management System
          </p>
        </form>
      </div>
    </div>
  );
}
