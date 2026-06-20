import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const UC_URL = 'https://functions.poehali.dev/ea8459f7-0d53-41bc-b691-fcc0ea62fd19';

interface Props {
  onBalanceChange: (newBalance: number) => void;
}

type Tab = 'chips' | 'luck' | 'stealth';

const fmt = (secs: number) => {
  if (secs <= 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
};

const UltraCheat = ({ onBalanceChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chips');
  const [pos, setPos] = useState({ x: 20, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const [chips, setChips] = useState(1000);
  const [cd, setCd] = useState({ chips_cd: 0, luck_cd: 0, stealth_cd: 0 });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);
  const [loading, setLoading] = useState('');

  const token = localStorage.getItem('gs_token') || '';
  const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': token };

  const fetchCd = useCallback(() => {
    fetch(`${UC_URL}?action=status`, { headers })
      .then(r => r.json())
      .then(d => setCd({ chips_cd: d.chips_cd || 0, luck_cd: d.luck_cd || 0, stealth_cd: d.stealth_cd || 0 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCd();
    const iv = setInterval(() => {
      setCd(prev => ({
        chips_cd: Math.max(0, prev.chips_cd - 1),
        luck_cd: Math.max(0, prev.luck_cd - 1),
        stealth_cd: Math.max(0, prev.stealth_cd - 1),
      }));
    }, 1000);
    return () => clearInterval(iv);
  }, [fetchCd]);

  const notify = (text: string, ok = true) => {
    setMsg(text);
    setMsgOk(ok);
    setTimeout(() => setMsg(''), 4000);
  };

  const doChips = async () => {
    setLoading('chips');
    const res = await fetch(`${UC_URL}?action=chips`, { method: 'POST', headers, body: JSON.stringify({ amount: chips }) });
    const d = await res.json();
    if (res.ok) {
      onBalanceChange(d.balance);
      setCd(prev => ({ ...prev, chips_cd: d.cd }));
      notify(`+${chips} фишек начислено!`);
    } else {
      notify(d.error, false);
    }
    setLoading('');
  };

  const doLuck = async () => {
    setLoading('luck');
    const res = await fetch(`${UC_URL}?action=luck`, { method: 'POST', headers, body: JSON.stringify({}) });
    const d = await res.json();
    if (res.ok) {
      setCd(prev => ({ ...prev, luck_cd: d.cd }));
      notify('Удача на следующий спин!');
    } else {
      notify(d.error, false);
    }
    setLoading('');
  };

  const doStealth = async () => {
    setLoading('stealth');
    const res = await fetch(`${UC_URL}?action=stealth`, { method: 'POST', headers, body: JSON.stringify({}) });
    const d = await res.json();
    if (res.ok) {
      setCd(prev => ({ ...prev, stealth_cd: d.cd }));
      notify('Stealth активирован на 30 минут!');
    } else {
      notify(d.error, false);
    }
    setLoading('');
  };

  // Drag logic
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.uc-inner')) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging]);

  // Touch drag
  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.uc-inner')) return;
    const t = e.touches[0];
    setDragging(true);
    dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  };
  useEffect(() => {
    const move = (e: TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      setPos({ x: t.clientX - dragOffset.current.x, y: t.clientY - dragOffset.current.y });
    };
    const up = () => setDragging(false);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [dragging]);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'chips', label: 'Фишки', icon: 'Coins' },
    { id: 'luck', label: 'Удача', icon: 'Sparkles' },
    { id: 'stealth', label: 'Скрытие', icon: 'EyeOff' },
  ];

  return (
    <div
      ref={widgetRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 80, userSelect: 'none', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Widget button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 font-display font-900 text-xs tracking-widest shadow-[0_0_20px_rgba(255,100,0,0.4)] transition-all select-none
          ${open ? 'border-orange-400 bg-orange-500/30 text-orange-300' : 'border-orange-500/60 bg-black/80 text-orange-400 hover:border-orange-400'}`}
        title="UltraCheat"
      >
        UC
      </button>

      {/* Panel */}
      {open && (
        <div
          className="uc-inner absolute top-14 left-0 w-72 rounded-2xl border border-orange-500/30 bg-[#110a00] shadow-[0_0_40px_rgba(255,100,0,0.15)] animate-fade-in"
          style={{ minWidth: 270 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <span className="font-display font-900 text-orange-400 tracking-widest text-sm">ULTRA</span>
              <span className="font-display font-900 text-orange-300 tracking-widest text-sm">CHEAT</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-orange-500/15">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-display transition-colors ${
                  tab === t.id ? 'text-orange-400 border-b-2 border-orange-400' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon name={t.icon as Parameters<typeof Icon>[0]['name']} size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {msg && (
            <div className={`mx-3 mt-3 rounded-lg px-3 py-2 text-xs font-600 ${msgOk ? 'bg-green-900/40 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {msg}
            </div>
          )}

          {/* Tab content */}
          <div className="p-4">
            {tab === 'chips' && (
              <div className="space-y-3">
                <p className="text-white/50 text-xs">Выдать себе фишки (1–20000)</p>
                <input
                  type="range" min={1} max={20000} step={100}
                  value={chips}
                  onChange={e => setChips(+e.target.value)}
                  className="w-full accent-orange-500"
                />
                <div className="flex items-center justify-between">
                  <input
                    type="number" min={1} max={20000}
                    value={chips}
                    onChange={e => setChips(Math.max(1, Math.min(20000, +e.target.value)))}
                    className="w-24 bg-black/40 border border-white/15 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-orange-500/60 tabular-nums"
                  />
                  <span className="text-orange-400 font-display font-700">{chips} 🪙</span>
                </div>
                {cd.chips_cd > 0 ? (
                  <div className="rounded-lg bg-white/5 border border-white/10 py-3 text-center">
                    <p className="text-white/40 text-xs">Перезарядка:</p>
                    <p className="font-display font-700 text-orange-400">{fmt(cd.chips_cd)}</p>
                  </div>
                ) : (
                  <button
                    onClick={doChips}
                    disabled={!!loading}
                    className="w-full rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 py-2.5 font-display font-700 text-black tracking-wider transition-colors"
                  >
                    {loading === 'chips' ? '...' : 'ПОЛУЧИТЬ'}
                  </button>
                )}
                <p className="text-white/25 text-xs text-center">Перезарядка: 6 часов</p>
              </div>
            )}

            {tab === 'luck' && (
              <div className="space-y-3">
                <p className="text-white/50 text-xs">Удача на следующий спин — гарантированная победа</p>
                {cd.luck_cd > 0 ? (
                  <div className="rounded-lg bg-white/5 border border-white/10 py-4 text-center">
                    <p className="text-white/40 text-xs mb-1">Перезарядка:</p>
                    <p className="font-display font-700 text-orange-400 text-xl">{fmt(cd.luck_cd)}</p>
                  </div>
                ) : (
                  <button
                    onClick={doLuck}
                    disabled={!!loading}
                    className="w-full rounded-xl bg-gold hover:bg-yellow-400 disabled:opacity-50 py-3 font-display font-700 text-black tracking-wider transition-colors"
                  >
                    {loading === 'luck' ? '...' : '🍀 АКТИВИРОВАТЬ'}
                  </button>
                )}
                <p className="text-white/25 text-xs text-center">Перезарядка: 10 часов</p>
              </div>
            )}

            {tab === 'stealth' && (
              <div className="space-y-3">
                <p className="text-white/50 text-xs">Скрыть себя от SPECTATOR MODE обычных админов на 30 минут</p>
                <p className="text-orange-400/60 text-xs">Супер-администратор всё равно видит тебя</p>
                {cd.stealth_cd > 0 ? (
                  <div className="rounded-lg bg-white/5 border border-white/10 py-4 text-center">
                    <p className="text-white/40 text-xs mb-1">Перезарядка:</p>
                    <p className="font-display font-700 text-orange-400 text-xl">{fmt(cd.stealth_cd)}</p>
                  </div>
                ) : (
                  <button
                    onClick={doStealth}
                    disabled={!!loading}
                    className="w-full rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 py-3 font-display font-700 text-white tracking-wider transition-colors"
                  >
                    {loading === 'stealth' ? '...' : '👻 АКТИВИРОВАТЬ'}
                  </button>
                )}
                <p className="text-white/25 text-xs text-center">Перезарядка: 48 часов</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UltraCheat;
