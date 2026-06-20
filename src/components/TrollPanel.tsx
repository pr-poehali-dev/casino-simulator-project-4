import { useState } from 'react';
import Icon from '@/components/ui/icon';

const ADMIN_URL = 'https://functions.poehali.dev/57a08ce4-8c93-467f-abf3-f89bc09f9c78';

interface Props {
  targetLogin: string;
  trollBlackb: boolean;
  trollBlock: boolean;
  onClose: () => void;
  onAction: (msg: string, ok?: boolean) => void;
  onRefresh: () => void;
}

const TrollPanel = ({ targetLogin, trollBlackb, trollBlock, onClose, onAction, onRefresh }: Props) => {
  const [loading, setLoading] = useState('');
  const token = localStorage.getItem('gs_token') || '';
  const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': token };

  const troll = async (t: string) => {
    setLoading(t);
    const res = await fetch(`${ADMIN_URL}?action=troll`, {
      method: 'POST', headers,
      body: JSON.stringify({ login: targetLogin, troll: t }),
    });
    const d = await res.json();
    onAction(d.message || d.error, res.ok);
    onRefresh();
    setLoading('');
  };

  const btn = (label: string, key: string, color: string, desc: string) => (
    <button
      key={key}
      disabled={!!loading}
      onClick={() => troll(key)}
      className={`flex flex-col items-center justify-center rounded-xl p-4 gap-1 border transition-all disabled:opacity-50 ${color}`}
    >
      <span className="font-display font-700 tracking-widest text-sm">{label}</span>
      <span className="text-xs text-white/50 text-center leading-tight">{desc}</span>
      {loading === key && <span className="text-xs text-white/60 mt-1">...</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-crimson/40 bg-[#110808] p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="Zap" className="text-crimson" size={20} />
            <span className="font-display font-700 tracking-widest text-crimson">TROLL</span>
            <span className="text-white/50 text-sm">→ {targetLogin}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {btn(
            trollBlackb ? 'BlackB OFF' : 'BlackB',
            trollBlackb ? 'blackb_off' : 'blackb',
            trollBlackb ? 'border-white/20 bg-white/5 text-white' : 'border-zinc-700 bg-zinc-900 text-white hover:border-white/40',
            trollBlackb ? 'Отключить чёрный экран' : 'Чёрный экран игроку'
          )}
          {btn(
            'Good',
            'good',
            'border-blue-500/40 bg-blue-900/20 text-blue-300 hover:border-blue-400/60',
            'Выбросить из аккаунта'
          )}
          {btn(
            trollBlock ? 'Block OFF' : 'Block',
            trollBlock ? 'block_off' : 'block',
            trollBlock ? 'border-white/20 bg-white/5 text-white' : 'border-orange-500/40 bg-orange-900/20 text-orange-300 hover:border-orange-400/60',
            trollBlock ? 'Разблокировать экран' : 'Заблокировать экран'
          )}
          {btn(
            'LuckyPlay',
            'luckyplay',
            'border-gold/40 bg-yellow-900/20 text-gold hover:border-gold/60',
            '3 спина удачи'
          )}
          {btn(
            'LuckyNo',
            'luckyno',
            'border-red-800/50 bg-red-950/30 text-red-400 hover:border-red-500/50',
            '3 спина неудачи'
          )}
        </div>
      </div>
    </div>
  );
};

export default TrollPanel;
