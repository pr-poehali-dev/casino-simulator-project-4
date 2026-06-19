import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

type Stage = 'home' | 'game';
type BetType = 'red' | 'black' | 'green' | null;

const numColor = (n: number) =>
  n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black';

const Index = () => {
  const [stage, setStage] = useState<Stage>('home');
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(50);
  const [bet, setBet] = useState<BetType>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ spins: 0, wins: 0, biggest: 0 });
  const wheelRef = useRef<HTMLDivElement>(null);

  const spin = () => {
    if (spinning || !bet || betAmount <= 0 || betAmount > balance) return;
    setSpinning(true);
    setMessage('');
    setBalance((b) => b - betAmount);

    const winningNumber = Math.floor(Math.random() * 37);
    const idx = WHEEL_ORDER.indexOf(winningNumber);
    const slice = 360 / WHEEL_ORDER.length;
    const target = 360 * 6 + (360 - idx * slice);
    setRotation((r) => r - (r % 360) + target);

    setTimeout(() => {
      const color = numColor(winningNumber);
      const won = color === bet;
      const payout = won ? (bet === 'green' ? betAmount * 35 : betAmount * 2) : 0;
      setResult(winningNumber);
      setSpinning(false);
      setBalance((b) => b + payout);
      setStats((s) => ({
        spins: s.spins + 1,
        wins: s.wins + (won ? 1 : 0),
        biggest: Math.max(s.biggest, payout),
      }));
      setMessage(
        won
          ? `Выпало ${winningNumber} (${color === 'red' ? 'красное' : color === 'black' ? 'чёрное' : 'зеро'}) — выигрыш ${payout} 🪙`
          : `Выпало ${winningNumber} (${color === 'red' ? 'красное' : color === 'black' ? 'чёрное' : 'зеро'}) — увы`,
      );
    }, 4200);
  };

  return (
    <div className="min-h-screen felt-texture bg-felt text-white overflow-x-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 md:px-10 py-5 border-b border-white/10">
        <button
          onClick={() => setStage('home')}
          className="flex items-center gap-2 font-display font-700 tracking-widest text-xl"
        >
          <Icon name="Diamond" className="text-gold" size={24} />
          <span className="text-gold-shimmer">GOLDEN SPIN</span>
        </button>
        <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-black/40 px-4 py-1.5">
          <Icon name="Coins" className="text-gold" size={18} />
          <span className="font-display font-600 text-gold tabular-nums">{balance}</span>
        </div>
      </header>

      {stage === 'home' ? (
        <main className="relative flex flex-col items-center text-center px-6 pt-20 pb-24">
          <div className="absolute top-10 h-72 w-72 rounded-full bg-crimson/30 blur-[120px]" />
          <div className="absolute top-40 h-72 w-72 rounded-full bg-gold/20 blur-[120px]" />
          <p className="relative font-display tracking-[0.4em] text-gold/80 text-sm mb-4 animate-fade-in">
            ДОБРО ПОЖАЛОВАТЬ В
          </p>
          <h1 className="relative font-display font-700 leading-none text-6xl md:text-8xl animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <span className="text-gold-shimmer">GOLDEN</span>
            <br />
            <span className="text-crimson drop-shadow-[0_0_30px_rgba(209,26,42,0.6)]">SPIN</span>
          </h1>
          <p className="relative mt-6 max-w-md text-white/60 animate-fade-in" style={{ animationDelay: '0.25s', opacity: 0 }}>
            Классическая рулетка с красными и чёрными ячейками. Делай ставку,
            крути колесо и испытай удачу.
          </p>

          <div className="relative my-12 animate-glow-pulse">
            <div className="flex h-44 w-44 items-center justify-center rounded-full border-[6px] border-gold bg-gradient-to-br from-crimson to-black shadow-[0_0_60px_rgba(255,199,0,0.3)]">
              <Icon name="CircleDot" className="text-gold" size={80} />
            </div>
          </div>

          <button
            onClick={() => setStage('game')}
            className="relative group rounded-full bg-gold px-10 py-4 font-display font-600 tracking-widest text-black text-lg transition-transform hover:scale-105 shadow-[0_0_40px_rgba(255,199,0,0.4)] animate-fade-in"
            style={{ animationDelay: '0.4s', opacity: 0 }}
          >
            ВОЙТИ В КАЗИНО
          </button>

          <div className="relative mt-20 grid grid-cols-3 gap-6 md:gap-12 w-full max-w-lg animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0 }}>
            {[
              { v: stats.spins, l: 'Спинов' },
              { v: stats.wins, l: 'Побед' },
              { v: stats.biggest, l: 'Макс. выигрыш' },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-white/10 bg-black/30 py-5">
                <p className="font-display font-700 text-3xl text-gold tabular-nums">{s.v}</p>
                <p className="text-xs text-white/50 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="flex flex-col items-center px-6 pt-10 pb-24 max-w-3xl mx-auto">
          {/* Wheel */}
          <div className="relative">
            <div className="absolute left-1/2 -top-3 z-20 -translate-x-1/2">
              <Icon name="Triangle" className="rotate-180 text-gold drop-shadow" size={28} />
            </div>
            <div
              ref={wheelRef}
              className="h-72 w-72 md:h-80 md:w-80 rounded-full border-[10px] border-gold shadow-[0_0_60px_rgba(255,199,0,0.25)]"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4.1s cubic-bezier(0.16,1,0.3,1)' : 'none',
                background: `conic-gradient(${WHEEL_ORDER.map((n, i) => {
                  const c = numColor(n) === 'red' ? '#D11A2A' : numColor(n) === 'black' ? '#15110d' : '#0a7d34';
                  const seg = 360 / WHEEL_ORDER.length;
                  return `${c} ${i * seg}deg ${(i + 1) * seg}deg`;
                }).join(',')})`,
              }}
            >
              <div className="absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-gold bg-black">
                <Icon name="Diamond" className="text-gold" size={32} />
              </div>
            </div>
          </div>

          {message && (
            <p className="mt-6 text-center font-display tracking-wide text-lg animate-fade-in">
              {message}
            </p>
          )}

          {/* Bet selection */}
          <div className="mt-8 w-full">
            <p className="text-center text-white/50 text-sm mb-3">Выбери цвет</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { t: 'red', label: 'Красное', cls: 'bg-crimson', mult: 'x2' },
                { t: 'black', label: 'Чёрное', cls: 'bg-black border border-white/30', mult: 'x2' },
                { t: 'green', label: 'Зеро', cls: 'bg-[#0a7d34]', mult: 'x35' },
              ] as const).map((o) => (
                <button
                  key={o.t}
                  disabled={spinning}
                  onClick={() => setBet(o.t)}
                  className={`rounded-xl py-4 font-display font-600 tracking-wide transition-all ${o.cls} ${
                    bet === o.t ? 'ring-4 ring-gold scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {o.label}
                  <span className="block text-xs text-white/60 mt-1">{o.mult}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bet amount */}
          <div className="mt-6 w-full">
            <p className="text-center text-white/50 text-sm mb-3">Сумма ставки</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[10, 50, 100, 250].map((v) => (
                <button
                  key={v}
                  disabled={spinning}
                  onClick={() => setBetAmount(v)}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border-2 font-display font-600 transition-all ${
                    betAmount === v
                      ? 'border-gold bg-gold text-black scale-110'
                      : 'border-white/20 bg-black/40 text-white/70 hover:border-gold/50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={spin}
            disabled={spinning || !bet || betAmount > balance}
            className="mt-8 w-full max-w-xs rounded-full bg-gold py-4 font-display font-700 tracking-widest text-black text-lg transition-transform enabled:hover:scale-105 disabled:opacity-40 shadow-[0_0_40px_rgba(255,199,0,0.35)]"
          >
            {spinning ? 'КРУТИТСЯ...' : balance < betAmount ? 'НЕТ ФИШЕК' : 'КРУТИТЬ'}
          </button>

          {/* Player profile */}
          <section className="mt-12 w-full rounded-2xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold to-crimson">
                <Icon name="User" className="text-black" size={24} />
              </div>
              <div>
                <p className="font-display font-600 tracking-wide">Игрок</p>
                <p className="text-xs text-white/50">Профиль и статистика</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: `${balance} 🪙`, l: 'Баланс фишек' },
                { v: stats.spins, l: 'Сыграно' },
                { v: stats.wins, l: 'Побед' },
                { v: `${stats.biggest} 🪙`, l: 'Макс. выигрыш' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/5 py-4 text-center">
                  <p className="font-display font-700 text-xl text-gold">{s.v}</p>
                  <p className="text-xs text-white/50 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
};

export default Index;
