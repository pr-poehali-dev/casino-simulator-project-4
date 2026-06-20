import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import TrollPanel from '@/components/TrollPanel';

const ADMIN_URL = 'https://functions.poehali.dev/57a08ce4-8c93-467f-abf3-f89bc09f9c78';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const numColor = (n: number) => n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black';

interface SpectateData {
  login: string;
  balance: number;
  spins: number;
  wins: number;
  biggest: number;
  troll_blackb: boolean;
  troll_block: boolean;
  troll_lucky_spins: number;
  troll_unlucky_spins: number;
}

interface AdminUser {
  login: string;
  balance: number;
  spins: number;
  is_admin: boolean;
  super_admin: boolean;
}

type Step = 'select' | 'watch';

interface Props {
  isSuperAdmin: boolean;
  onClose: () => void;
}

const SpectatorMode = ({ isSuperAdmin, onClose }: Props) => {
  const [step, setStep] = useState<Step>('select');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [data, setData] = useState<SpectateData | null>(null);
  const [stealthMsg, setStealthMsg] = useState('');
  const [showTroll, setShowTroll] = useState(false);
  const [trollMsg, setTrollMsg] = useState('');
  const [trollMsgOk, setTrollMsgOk] = useState(true);

  // troll badge overlay
  const [badge, setBadge] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = localStorage.getItem('gs_token') || '';
  const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': token };

  useEffect(() => {
    fetch(`${ADMIN_URL}?action=users`, { headers })
      .then(r => r.json())
      .then(d => setUsers(d.users || []));
  }, []);

  const startWatch = (login: string) => {
    setSelected(login);
    setStep('watch');
    poll(login);
    pollRef.current = setInterval(() => poll(login), 3000);
  };

  const poll = async (login: string) => {
    const r = await fetch(`${ADMIN_URL}?action=spectate&login=${encodeURIComponent(login)}`, { headers });
    const d = await r.json();
    if (!r.ok) {
      if (d.stealth) setStealthMsg(d.error);
      return;
    }
    setStealthMsg('');
    setData(d);
  };

  const stopWatch = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('select');
    setData(null);
    setSelected('');
    setBadge('');
  };

  const handleTrollAction = (msg: string, ok = true) => {
    setTrollMsg(msg);
    setTrollMsgOk(ok);
    setTimeout(() => setTrollMsg(''), 4000);
    // badge
    if (msg.toLowerCase().includes('blackb')) setBadge('BlackB');
    if (msg.toLowerCase().includes('block ')) setBadge('Block');
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const filtered = users.filter(u => u.login.toLowerCase().includes(search.toLowerCase()));

  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0c0a] p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon name="Eye" className="text-gold" size={22} />
              <span className="font-display font-700 tracking-widest text-gold">SPECTATOR MODE</span>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <Icon name="X" size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2 mb-4 focus-within:border-gold/60">
            <Icon name="Search" className="text-white/40 shrink-0" size={15} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Найти игрока..."
              className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filtered.map(u => (
              <button
                key={u.login}
                onClick={() => startWatch(u.login)}
                className="w-full flex items-center justify-between rounded-xl border border-white/8 bg-white/5 hover:bg-white/10 px-4 py-3 transition-colors text-left"
              >
                <div>
                  <p className="text-white font-600">{u.login}</p>
                  <p className="text-xs text-white/40">{u.spins} спинов · {u.balance} 🪙</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.super_admin && <span className="text-xs bg-crimson/30 text-crimson rounded-full px-2 py-0.5">Главный</span>}
                  {!u.super_admin && u.is_admin && <span className="text-xs bg-gold/20 text-gold rounded-full px-2 py-0.5">Админ</span>}
                  <Icon name="ChevronRight" className="text-white/30" size={16} />
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-white/30 py-8 text-sm">Никого не найдено</p>}
          </div>
        </div>
      </div>
    );
  }

  // step === 'watch'
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0806]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/60">
        <div className="flex items-center gap-3">
          <button onClick={stopWatch} className="text-white/50 hover:text-white transition-colors">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <Icon name="Eye" className="text-gold" size={18} />
          <span className="font-display text-gold tracking-wide">SPECTATOR</span>
          <span className="text-white/60 text-sm">→ {selected}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="font-display font-700 tracking-widest text-xs bg-crimson/20 border border-crimson/50 text-crimson rounded-full px-3 py-1 animate-pulse">
              {badge}
            </span>
          )}
          {trollMsg && (
            <span className={`text-xs font-600 px-3 py-1 rounded-full border animate-fade-in ${trollMsgOk ? 'text-green-300 border-green-500/40 bg-green-900/20' : 'text-red-300 border-red-500/40 bg-red-900/20'}`}>
              {trollMsg}
            </span>
          )}
          <button
            onClick={() => setShowTroll(true)}
            className="flex items-center gap-1.5 rounded-full border border-crimson/60 bg-crimson/15 hover:bg-crimson/25 px-3 py-1.5 text-crimson transition-colors font-display font-700 tracking-widest text-sm"
          >
            <Icon name="Zap" size={15} /> TROLL
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {stealthMsg ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Icon name="ShieldOff" className="text-crimson" size={48} />
            <p className="font-display font-700 text-crimson text-xl tracking-widest text-center px-8">{stealthMsg}</p>
          </div>
        ) : data ? (
          <div className="flex flex-col items-center px-6 pt-8 pb-16 max-w-lg mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 w-full mb-8">
              {[
                { v: `${data.balance}🪙`, l: 'Баланс' },
                { v: data.spins, l: 'Спинов' },
                { v: data.wins, l: 'Побед' },
                { v: `${data.biggest}🪙`, l: 'Рекорд' },
              ].map(s => (
                <div key={s.l} className="rounded-xl bg-white/5 border border-white/8 py-3 text-center">
                  <p className="font-display font-700 text-gold text-lg">{s.v}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Troll indicators */}
            {(data.troll_blackb || data.troll_block || data.troll_lucky_spins > 0 || data.troll_unlucky_spins > 0) && (
              <div className="w-full mb-6 rounded-xl border border-crimson/30 bg-crimson/5 p-4 flex flex-wrap gap-2">
                {data.troll_blackb && <span className="rounded-full bg-zinc-800 border border-white/20 px-3 py-1 text-xs font-600">⬛ BlackB активен</span>}
                {data.troll_block && <span className="rounded-full bg-orange-900/40 border border-orange-500/40 text-orange-300 px-3 py-1 text-xs font-600">🔒 Block активен</span>}
                {data.troll_lucky_spins > 0 && <span className="rounded-full bg-yellow-900/30 border border-gold/40 text-gold px-3 py-1 text-xs font-600">🍀 Удача x{data.troll_lucky_spins}</span>}
                {data.troll_unlucky_spins > 0 && <span className="rounded-full bg-red-950/40 border border-red-700/40 text-red-400 px-3 py-1 text-xs font-600">💀 Неудача x{data.troll_unlucky_spins}</span>}
              </div>
            )}

            {/* Wheel preview */}
            <div className="relative mb-4 opacity-80">
              <div
                className="h-56 w-56 rounded-full border-[8px] border-gold/70 shadow-[0_0_40px_rgba(255,199,0,0.15)] pointer-events-none"
                style={{
                  background: `conic-gradient(${WHEEL_ORDER.map((n, i) => {
                    const c = numColor(n) === 'red' ? '#D11A2A' : numColor(n) === 'black' ? '#15110d' : '#0a7d34';
                    const seg = 360 / WHEEL_ORDER.length;
                    return `${c} ${i * seg}deg ${(i + 1) * seg}deg`;
                  }).join(',')})`,
                }}
              >
                <div className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-gold/70 bg-black">
                  <Icon name="Diamond" className="text-gold/70" size={28} />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 rounded-full px-4 py-2 border border-white/20">
                  <p className="text-xs text-white/60 font-display tracking-widest">LIVE PREVIEW</p>
                </div>
              </div>
            </div>
            <p className="text-white/30 text-xs">Данные обновляются каждые 3 секунды</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/30 font-display tracking-widest">ЗАГРУЗКА...</p>
          </div>
        )}
      </div>

      {/* Troll panel */}
      {showTroll && data && (
        <TrollPanel
          targetLogin={selected}
          trollBlackb={data.troll_blackb}
          trollBlock={data.troll_block}
          onClose={() => setShowTroll(false)}
          onAction={handleTrollAction}
          onRefresh={() => poll(selected)}
        />
      )}
    </div>
  );
};

export default SpectatorMode;
