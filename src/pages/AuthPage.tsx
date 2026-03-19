import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, googleLogin, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng.');
      } else {
        setError('Lỗi xác thực: ' + (err.message || 'Vui lòng thử lại.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    
    // Check for placeholders
    if (import.meta.env.VITE_FIREBASE_API_KEY === 'YOUR_API_KEY' || !import.meta.env.VITE_FIREBASE_API_KEY) {
      // In this case, I'll check the hardcoded file since we aren't using env yet
      // But let's just check the error message in the catch block or a simple check
    }

    setLoading(true);
    try {
      await googleLogin();
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('api-key-not-valid')) {
        setError('Cấu hình Firebase chưa hoàn tất. Vui lòng dán API Key vào file src/lib/firebase.ts');
      } else {
        setError('Lỗi đăng nhập Google: ' + (err.message || 'Vui lòng thử lại.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Aurora Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      
      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/20 mb-4 rotate-3">
              <span className="text-3xl">✨</span>
           </div>
           <h1 className="text-4xl font-black tracking-tight text-white mb-2">JustLife</h1>
           <p className="text-slate-400 font-medium">Làm chủ cuộc sống với Firebase Auth</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl shadow-black/50">
           <div className="flex bg-black/40 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Đăng nhập
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Đăng ký
              </button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                   <label className="text-[11px] uppercase font-black text-slate-500 ml-1 tracking-widest">Họ tên</label>
                   <input 
                     type="text" required value={name} onChange={e=>setName(e.target.value)}
                     placeholder="VD: Justin Nguyen"
                     disabled={loading}
                     className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium disabled:opacity-50" 
                   />
                </div>
              )}
              <div className="space-y-1.5">
                 <label className="text-[11px] uppercase font-black text-slate-500 ml-1 tracking-widest">Email</label>
                 <input 
                   type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                   placeholder="name@example.com"
                   disabled={loading}
                   className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium disabled:opacity-50" 
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[11px] uppercase font-black text-slate-500 ml-1 tracking-widest">Mật khẩu</label>
                 <input 
                   type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                   placeholder="••••••••"
                   disabled={loading}
                   className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium disabled:opacity-50" 
                 />
              </div>

              {error && <p className="text-red-400 text-xs font-bold text-center px-2 bg-red-400/10 py-2 rounded-xl border border-red-500/20">{error}</p>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isLogin ? 'ĐĂNG NHẬP HỆ THỐNG' : 'TẠO TÀI KHOẢN'}
              </button>
           </form>

           <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-600 bg-transparent px-2">Hoặc đăng nhập bằng</div>
           </div>

           <button 
             onClick={handleGoogle}
             disabled={loading}
             className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
           >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.44 0 2.74.49 3.76 1.45l2.82-2.82C16.82 2.13 14.54 1 12 1 7.73 1 4.14 3.39 2.38 6.89l3.3 2.56C6.46 7.15 9 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.56-.19-2.3H12v4.35h6.44c-.28 1.5-1.13 2.76-2.4 3.6l3.3 2.56c1.93-1.78 3.15-4.4 3.15-8.21z" />
                <path fill="#FBBC05" d="M5.68 14.55c-.24-.71-.38-1.47-.38-2.27s.14-1.56.38-2.27L2.38 7.45C1.61 8.95 1.25 10.63 1.25 12.42c0 1.79.36 3.47 1.13 4.97l3.3-2.84z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.3-2.56c-1.1.74-2.5 1.18-4.63 1.18-3 0-5.54-2.11-6.44-4.94l-3.3 2.84C4.14 20.61 7.73 23 12 23z" />
              </svg>
              Google Account
           </button>
        </div>

        <p className="text-center mt-8 text-[11px] text-slate-600 font-bold uppercase tracking-widest">JustLife Security Protocol • v16.0 (Firebase)</p>
      </div>
    </div>
  );
}
