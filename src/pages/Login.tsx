import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LogIn, Mail, Lock, AlertCircle, BarChart3, Users, Package, ChefHat, 
  Eye, EyeOff, ArrowRight, Utensils
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await login(email, password);
      if (error) {
        console.error('Login error:', error);
        setError(error.message || 'Email ou senha inválidos');
      }
      // Se tiver sucesso, o próprio AppRoutes vai redirecionar porque o estado user será atualizado!
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Login com Google será implementado em breve!");
  };

  return (
    <div className="min-h-screen flex bg-stone-50 overflow-hidden font-sans">
      
      {/* Left Column - Branding & Features */}
      <div 
        className="hidden lg:flex flex-col relative w-[55%] xl:w-[60%] text-white p-12 xl:p-20 justify-center z-10"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)',
          backgroundImage: 'url("https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1920")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1A2C] via-[#0A192F]/90 to-[#0055FF]/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-slate-900/60" />

        <div className="relative z-10 max-w-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic">
              W
            </div>
            <span className="text-2xl font-bold tracking-tight">Woodesk</span>
            <span className="text-stone-300 font-light border-l border-stone-500 pl-3 ml-1 text-sm">Bar & Restaurantes</span>
          </div>

          <div className="mb-10 space-y-4">
            <p className="text-stone-300 text-xs font-bold tracking-[0.2em] uppercase">Tecnologia que serve resultados</p>
            <h1 className="text-5xl xl:text-6xl font-black leading-tight">
              Mais controle <br/> para o seu <span className="text-blue-500">negócio</span>
            </h1>
            <p className="text-stone-300 text-lg max-w-xl leading-relaxed">
              Gestão completa para bares e restaurantes em uma única plataforma. Simplifique processos, 
              aumente a eficiência e ofereça experiências inesquecíveis aos seus clientes.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-8 mb-16">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Controle de vendas</h3>
                <p className="text-xs text-stone-400 mt-1">Acompanhe em tempo real</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Gestão de mesas</h3>
                <p className="text-xs text-stone-400 mt-1">Mais agilidade no atendimento</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Estoque inteligente</h3>
                <p className="text-xs text-stone-400 mt-1">Evite perdas e faltas</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Pedidos integrados</h3>
                <p className="text-xs text-stone-400 mt-1">Cozinha e salão em sincronia</p>
              </div>
            </div>
          </div>

          <div className="font-['Brush_Script_MT',cursive] text-4xl text-white/80 -rotate-2">
            Negócios que alimentam<br/>boas histórias
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex flex-col relative">
        {/* Language selector */}
        <div className="absolute top-6 right-8 flex items-center gap-2 text-sm text-stone-600 font-medium cursor-pointer hover:text-stone-900 transition-colors">
          <span>🇧🇷 PT-BR</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] p-8 lg:p-10 border border-stone-100 relative"
          >
            {/* Mobile Logo (only shows on mobile) */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white italic">
                W
              </div>
              <span className="text-2xl font-bold tracking-tight text-stone-900">Woodesk</span>
            </div>

            {/* Desktop logo inside card */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-2 mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white italic text-lg">
                  W
                </div>
                <span className="text-2xl font-bold tracking-tight text-stone-900">Woodesk</span>
              </div>
              <span className="text-stone-400 text-xs font-medium">Bar & Restaurantes</span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-1">Olá!</h2>
              <p className="text-stone-500 text-sm">Faça seu login para continuar</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 bg-white focus:bg-stone-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm outline-none placeholder:text-stone-400"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 rounded-2xl border border-stone-200 bg-white focus:bg-stone-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm outline-none placeholder:text-stone-400"
                    placeholder="Sua senha"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-4 h-4 rounded border border-stone-300 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                    {/* Fake Checkbox logic can go here */}
                  </div>
                  <span className="text-xs font-bold text-stone-700 select-none">Lembrar de mim</span>
                </label>
                <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Esqueceu sua senha?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-[#0055FF] text-white rounded-2xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_rgba(0,85,255,0.3)] flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    Entrar
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 relative flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-stone-100" />
              <span className="relative bg-white px-4 text-xs text-stone-400 uppercase tracking-widest font-medium">ou</span>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full mt-8 py-3.5 bg-white border border-stone-200 text-stone-700 rounded-2xl font-bold text-sm hover:bg-stone-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </button>

            <p className="mt-8 text-center text-xs text-stone-400 font-medium">
              Use suas credenciais do Supabase Auth
            </p>
          </motion.div>
        </div>

        {/* Bottom Right Decoration */}
        <div className="hidden lg:flex absolute bottom-8 right-8 flex-col items-center gap-3">
          <Utensils className="w-6 h-6 text-stone-400" />
          <p className="text-xs text-stone-500 font-medium text-center w-28">
            Boa gestão também abre bons momentos.
          </p>
          <div className="w-6 h-1 bg-blue-500 rounded-full mt-1" />
        </div>
      </div>
      
    </div>
  );
}
