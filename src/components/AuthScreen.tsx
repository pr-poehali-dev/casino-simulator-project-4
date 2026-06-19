import { useState } from 'react';
import Icon from '@/components/ui/icon';

const AUTH_URL = 'https://functions.poehali.dev/561e5c79-8f63-49cc-920d-094a9a6ce650';

export interface Account {
  login: string;
  balance: number;
  spins: number;
  wins: number;
  biggest: number;
  token: string;
}

interface Props {
  onAuth: (acc: Account) => void;
}

const AuthScreen = ({ onAuth }: Props) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка');
        return;
      }
      localStorage.setItem('gs_token', data.token);
      onAuth(data as Account);
    } catch {
      setError('Не удалось соединиться с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen felt-texture bg-felt text-white flex flex-col items-center justify-center px-6">
      <div className="absolute top-1/4 h-72 w-72 rounded-full bg-crimson/30 blur-[120px]" />
      <div className="absolute bottom-1/4 h-72 w-72 rounded-full bg-gold/20 blur-[120px]" />

      <div className="relative flex items-center gap-2 font-display font-700 tracking-widest text-3xl mb-2">
        <Icon name="Diamond" className="text-gold" size={32} />
        <span className="text-gold-shimmer">GOLDEN SPIN</span>
      </div>
      <p className="relative text-white/50 text-sm mb-8 tracking-wide">
        {mode === 'login' ? 'Войди в свой аккаунт' : 'Создай новый аккаунт'}
      </p>

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-7 animate-fade-in">
        <div className="flex rounded-full bg-white/5 p-1 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 rounded-full py-2 text-sm font-display tracking-wide transition-all ${
                mode === m ? 'bg-gold text-black font-600' : 'text-white/60'
              }`}
            >
              {m === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        <label className="block text-xs text-white/50 mb-1.5">Логин</label>
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 mb-4 focus-within:border-gold/60">
          <Icon name="User" className="text-white/40" size={18} />
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="например, lucky_jack"
            className="w-full bg-transparent py-3 text-white placeholder:text-white/30 outline-none"
          />
        </div>

        <label className="block text-xs text-white/50 mb-1.5">Пароль</label>
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 mb-2 focus-within:border-gold/60">
          <Icon name="Lock" className="text-white/40" size={18} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••••"
            className="w-full bg-transparent py-3 text-white placeholder:text-white/30 outline-none"
          />
        </div>

        {error && <p className="text-crimson text-sm mt-2 mb-1">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !login || !password}
          className="mt-5 w-full rounded-full bg-gold py-3.5 font-display font-700 tracking-widest text-black transition-transform enabled:hover:scale-[1.02] disabled:opacity-40 shadow-[0_0_30px_rgba(255,199,0,0.3)]"
        >
          {loading ? 'ПОДОЖДИ...' : mode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
