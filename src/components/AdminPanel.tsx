import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const ADMIN_URL = 'https://functions.poehali.dev/57a08ce4-8c93-467f-abf3-f89bc09f9c78';

interface User {
  login: string;
  balance: number;
  spins: number;
  wins: number;
  is_admin: boolean;
  super_admin: boolean;
}

interface Props {
  isSuperAdmin: boolean;
  onClose: () => void;
}

const AdminPanel = ({ isSuperAdmin, onClose }: Props) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);

  const [search, setSearch] = useState('');
  const [chipsTarget, setChipsTarget] = useState('');
  const [chipsAmount, setChipsAmount] = useState('');

  const [luckTarget, setLuckTarget] = useState('');
  const [adminTarget, setAdminTarget] = useState('');

  const token = localStorage.getItem('gs_token') || '';

  const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': token };

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${ADMIN_URL}?action=users`, { headers })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const notify = (text: string, ok = true) => {
    setMsg(text);
    setMsgOk(ok);
    setTimeout(() => setMsg(''), 4000);
  };

  const doChips = async (amount: number) => {
    if (!chipsTarget) return notify('Укажи логин игрока', false);
    const parsed = parseInt(chipsAmount);
    if (!parsed || isNaN(parsed)) return notify('Укажи сумму', false);
    const res = await fetch(`${ADMIN_URL}?action=chips`, {
      method: 'POST', headers,
      body: JSON.stringify({ login: chipsTarget, amount: amount * parsed }),
    });
    const d = await res.json();
    notify(d.message || d.error, res.ok);
    if (res.ok) fetchUsers();
  };

  const doLuck = async (luck: boolean | null) => {
    if (!luckTarget) return notify('Укажи логин игрока', false);
    const res = await fetch(`${ADMIN_URL}?action=luck`, {
      method: 'POST', headers,
      body: JSON.stringify({ login: luckTarget, luck }),
    });
    const d = await res.json();
    notify(d.message || d.error, res.ok);
  };

  const doAdmin = async (give: boolean) => {
    if (!adminTarget) return notify('Укажи логин игрока', false);
    const res = await fetch(`${ADMIN_URL}?action=grant_admin`, {
      method: 'POST', headers,
      body: JSON.stringify({ login: adminTarget, give }),
    });
    const d = await res.json();
    notify(d.message || d.error, res.ok);
    if (res.ok) fetchUsers();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0e0c0a] p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Icon name="ShieldCheck" className="text-gold" size={24} />
            <span className="font-display font-700 tracking-widest text-gold text-xl">АДМИН-ПАНЕЛЬ</span>
            {isSuperAdmin && (
              <span className="ml-2 rounded-full bg-crimson/20 border border-crimson/50 px-2 py-0.5 text-xs text-crimson font-600">
                ГЛАВНЫЙ
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <Icon name="X" size={22} />
          </button>
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-600 animate-fade-in ${msgOk ? 'bg-green-900/40 border border-green-500/40 text-green-300' : 'bg-crimson/20 border border-crimson/50 text-red-300'}`}>
            {msg}
          </div>
        )}

        {/* Chips */}
        <section className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-display font-600 tracking-wide text-white mb-3 flex items-center gap-2">
            <Icon name="Coins" className="text-gold" size={18} /> Фишки
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={chipsTarget}
              onChange={(e) => setChipsTarget(e.target.value)}
              placeholder="Логин игрока"
              className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/60 placeholder:text-white/30"
            />
            <input
              value={chipsAmount}
              onChange={(e) => setChipsAmount(e.target.value)}
              placeholder="Сумма"
              type="number"
              className="w-28 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/60 placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => doChips(1)}
              className="flex-1 rounded-lg bg-green-700 hover:bg-green-600 py-2 text-sm font-display font-600 transition-colors"
            >
              + Выдать
            </button>
            <button
              onClick={() => doChips(-1)}
              className="flex-1 rounded-lg bg-crimson hover:bg-red-600 py-2 text-sm font-display font-600 transition-colors"
            >
              − Забрать
            </button>
          </div>
        </section>

        {/* Luck */}
        <section className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-display font-600 tracking-wide text-white mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="text-gold" size={18} /> Удача на следующий спин
          </p>
          <input
            value={luckTarget}
            onChange={(e) => setLuckTarget(e.target.value)}
            placeholder="Логин игрока"
            className="w-full mb-3 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/60 placeholder:text-white/30"
          />
          <div className="flex gap-2">
            <button
              onClick={() => doLuck(true)}
              className="flex-1 rounded-lg bg-gold hover:bg-yellow-400 text-black py-2 text-sm font-display font-600 transition-colors"
            >
              🍀 Удача
            </button>
            <button
              onClick={() => doLuck(false)}
              className="flex-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 py-2 text-sm font-display font-600 transition-colors"
            >
              💀 Неудача
            </button>
            <button
              onClick={() => doLuck(null)}
              className="flex-1 rounded-lg bg-black/60 border border-white/20 hover:border-white/40 py-2 text-sm font-display font-600 transition-colors"
            >
              Сброс
            </button>
          </div>
        </section>

        {/* Grant Admin — только для super_admin */}
        {isSuperAdmin && (
          <section className="mb-5 rounded-xl border border-crimson/30 bg-crimson/5 p-4">
            <p className="font-display font-600 tracking-wide text-white mb-3 flex items-center gap-2">
              <Icon name="Shield" className="text-crimson" size={18} /> Управление доступом к панели
            </p>
            <input
              value={adminTarget}
              onChange={(e) => setAdminTarget(e.target.value)}
              placeholder="Логин игрока"
              className="w-full mb-3 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-crimson/60 placeholder:text-white/30"
            />
            <div className="flex gap-2">
              <button
                onClick={() => doAdmin(true)}
                className="flex-1 rounded-lg bg-crimson hover:bg-red-600 py-2 text-sm font-display font-600 transition-colors"
              >
                Выдать доступ
              </button>
              <button
                onClick={() => doAdmin(false)}
                className="flex-1 rounded-lg bg-black/60 border border-crimson/40 hover:border-crimson py-2 text-sm font-display font-600 transition-colors"
              >
                Забрать доступ
              </button>
            </div>
          </section>
        )}

        {/* User list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-600 tracking-wide text-white flex items-center gap-2">
              <Icon name="Users" className="text-gold" size={18} /> Игроки ({users.length})
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 focus-within:border-gold/60 w-48">
              <Icon name="Search" className="text-white/40 shrink-0" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/30 hover:text-white transition-colors">
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <p className="text-white/40 text-sm text-center py-4">Загружаю...</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-white/50 font-600">
                    <td className="px-3 py-2">Логин</td>
                    <td className="px-3 py-2 text-right">Фишки</td>
                    <td className="px-3 py-2 text-right">Спинов</td>
                    <td className="px-3 py-2 text-center">Роль</td>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.login.toLowerCase().includes(search.toLowerCase())).map((u) => (
                    <tr
                      key={u.login}
                      onClick={() => { setChipsTarget(u.login); setLuckTarget(u.login); setAdminTarget(u.login); }}
                      className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 text-white font-600">{u.login}</td>
                      <td className="px-3 py-2 text-right text-gold tabular-nums">{u.balance}</td>
                      <td className="px-3 py-2 text-right text-white/60 tabular-nums">{u.spins}</td>
                      <td className="px-3 py-2 text-center">
                        {u.super_admin ? (
                          <span className="text-xs bg-crimson/30 text-crimson rounded-full px-2 py-0.5">Главный</span>
                        ) : u.is_admin ? (
                          <span className="text-xs bg-gold/20 text-gold rounded-full px-2 py-0.5">Админ</span>
                        ) : (
                          <span className="text-xs text-white/30">Игрок</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;