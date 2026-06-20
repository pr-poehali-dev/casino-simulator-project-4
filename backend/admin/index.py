import json
import os
import psycopg2
from datetime import datetime, timezone

def _conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def _resp(status: int, body: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        },
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False),
    }

def _get_admin(cur, token_esc):
    cur.execute(
        f"SELECT login, is_admin, super_admin FROM casino_users WHERE token = '{token_esc}'"
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    '''Админ-панель казино Golden Spin: удача, фишки, troll, spectator, UC'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return _resp(200, {})

    token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token')
    if not token:
        return _resp(401, {'error': 'Нет авторизации'})

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}

    conn = _conn()
    conn.autocommit = True
    cur = conn.cursor()

    try:
        token_esc = token.replace("'", "''")
        admin = _get_admin(cur, token_esc)
        if not admin or not admin[1]:
            return _resp(403, {'error': 'Нет доступа к админ-панели'})

        admin_login, _, is_super = admin

        # ── Список пользователей ──────────────────────────────────────────
        if method == 'GET' and action == 'users':
            cur.execute(
                "SELECT login, balance, spins, wins, is_admin, super_admin, luck_override, "
                "troll_blackb, troll_block, troll_lucky_spins, troll_unlucky_spins, uc_cheat, "
                "spectator_stealth_until "
                "FROM casino_users ORDER BY balance DESC"
            )
            rows = cur.fetchall()
            now = datetime.now(timezone.utc)
            return _resp(200, {'users': [
                {
                    'login': r[0], 'balance': r[1], 'spins': r[2], 'wins': r[3],
                    'is_admin': bool(r[4]), 'super_admin': bool(r[5]), 'luck_override': r[6],
                    'troll_blackb': bool(r[7]), 'troll_block': bool(r[8]),
                    'troll_lucky_spins': r[9], 'troll_unlucky_spins': r[10],
                    'uc_cheat': bool(r[11]),
                    'stealth_until': r[12].isoformat() if r[12] and r[12].replace(tzinfo=timezone.utc) > now else None,
                }
                for r in rows
            ]})

        # ── Состояние конкретного игрока (spectator polling) ──────────────
        if method == 'GET' and action == 'spectate':
            target = (params.get('login') or '').strip().replace("'", "''")
            if not target:
                return _resp(400, {'error': 'Укажи логин'})
            # Проверяем stealth
            cur.execute(
                f"SELECT login, balance, spins, wins, biggest, troll_blackb, troll_block, "
                f"troll_lucky_spins, troll_unlucky_spins, super_admin, spectator_stealth_until "
                f"FROM casino_users WHERE login = '{target}'"
            )
            row = cur.fetchone()
            if not row:
                return _resp(404, {'error': 'Игрок не найден'})
            now = datetime.now(timezone.utc)
            stealth_until = row[10]
            if stealth_until:
                su = stealth_until.replace(tzinfo=timezone.utc)
                if su > now and not is_super:
                    return _resp(403, {'error': 'ЗАБЛОКИРОВАНО ПОКА НЕ ПРОЙДЕТ 30 МИН!', 'stealth': True})
            return _resp(200, {
                'login': row[0], 'balance': row[1], 'spins': row[2], 'wins': row[3],
                'biggest': row[4], 'troll_blackb': bool(row[5]), 'troll_block': bool(row[6]),
                'troll_lucky_spins': row[7], 'troll_unlucky_spins': row[8],
            })

        # ── Фишки ─────────────────────────────────────────────────────────
        if method == 'POST' and action == 'chips':
            target = (body.get('login') or '').strip().replace("'", "''")
            amount = int(body.get('amount', 0))
            if not target:
                return _resp(400, {'error': 'Укажи логин'})
            cur.execute(f"SELECT id FROM casino_users WHERE login = '{target}'")
            if not cur.fetchone():
                return _resp(404, {'error': 'Пользователь не найден'})
            cur.execute(
                f"UPDATE casino_users SET balance = GREATEST(0, balance + {amount}) "
                f"WHERE login = '{target}' RETURNING balance"
            )
            row = cur.fetchone()
            action_word = 'начислено' if amount >= 0 else 'снято'
            return _resp(200, {'ok': True, 'message': f"{abs(amount)} фишек {action_word} игроку {target}. Баланс: {row[0]}", 'balance': row[0]})

        # ── Удача (обычная) ───────────────────────────────────────────────
        if method == 'POST' and action == 'luck':
            target = (body.get('login') or '').strip().replace("'", "''")
            luck = body.get('luck')
            if not target:
                return _resp(400, {'error': 'Укажи логин'})
            cur.execute(f"SELECT id FROM casino_users WHERE login = '{target}'")
            if not cur.fetchone():
                return _resp(404, {'error': 'Пользователь не найден'})
            if luck is True:
                val, label = '1', 'Удача активирована'
            elif luck is False:
                val, label = '0', 'Неудача активирована'
            else:
                val, label = 'NULL', 'Влияние удачи сброшено'
            cur.execute(f"UPDATE casino_users SET luck_override = {val} WHERE login = '{target}'")
            return _resp(200, {'ok': True, 'message': f"{label} для {target}"})

        # ── Троллинг ──────────────────────────────────────────────────────
        if method == 'POST' and action == 'troll':
            target = (body.get('login') or '').strip().replace("'", "''")
            troll = body.get('troll')   # 'blackb' | 'good' | 'block' | 'luckyplay' | 'luckyno'
            if not target or not troll:
                return _resp(400, {'error': 'Укажи логин и troll'})
            cur.execute(f"SELECT id, super_admin FROM casino_users WHERE login = '{target}'")
            row = cur.fetchone()
            if not row:
                return _resp(404, {'error': 'Пользователь не найден'})
            if troll == 'blackb':
                cur.execute(f"UPDATE casino_users SET troll_blackb = TRUE WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"BlackB активирован для {target}"})
            if troll == 'blackb_off':
                cur.execute(f"UPDATE casino_users SET troll_blackb = FALSE WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"BlackB отключён для {target}"})
            if troll == 'good':
                # Выкинуть из аккаунта — сбрасываем токен
                cur.execute(f"UPDATE casino_users SET token = NULL WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"Игрок {target} выброшен из аккаунта"})
            if troll == 'block':
                cur.execute(f"UPDATE casino_users SET troll_block = TRUE WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"Block активирован для {target}"})
            if troll == 'block_off':
                cur.execute(f"UPDATE casino_users SET troll_block = FALSE WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"Block снят с {target}"})
            if troll == 'luckyplay':
                cur.execute(f"UPDATE casino_users SET troll_lucky_spins = 3 WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"LuckyPlay x3 спина для {target}"})
            if troll == 'luckyno':
                cur.execute(f"UPDATE casino_users SET troll_unlucky_spins = 3 WHERE login = '{target}'")
                return _resp(200, {'ok': True, 'message': f"LuckyNo x3 спина для {target}"})
            return _resp(400, {'error': 'Неизвестный troll-тип'})

        # ── UltraCheat: выдать/забрать ────────────────────────────────────
        if method == 'POST' and action == 'grant_uc':
            if not is_super:
                return _resp(403, {'error': 'Только главный администратор'})
            target = (body.get('login') or '').strip().replace("'", "''")
            give = bool(body.get('give', True))
            if not target:
                return _resp(400, {'error': 'Укажи логин'})
            cur.execute(f"SELECT id FROM casino_users WHERE login = '{target}'")
            if not cur.fetchone():
                return _resp(404, {'error': 'Пользователь не найден'})
            cur.execute(f"UPDATE casino_users SET uc_cheat = {str(give).upper()} WHERE login = '{target}'")
            label = 'получил UltraCheat' if give else 'лишён UltraCheat'
            return _resp(200, {'ok': True, 'message': f"Игрок {target} {label}"})

        # ── Выдать/забрать права админа ───────────────────────────────────
        if method == 'POST' and action == 'grant_admin':
            if not is_super:
                return _resp(403, {'error': 'Только главный администратор может управлять правами'})
            target = (body.get('login') or '').strip().replace("'", "''")
            give = bool(body.get('give', True))
            if not target:
                return _resp(400, {'error': 'Укажи логин'})
            cur.execute(f"SELECT super_admin FROM casino_users WHERE login = '{target}'")
            row = cur.fetchone()
            if not row:
                return _resp(404, {'error': 'Пользователь не найден'})
            if row[0]:
                return _resp(400, {'error': 'Нельзя изменить права главного администратора'})
            cur.execute(f"UPDATE casino_users SET is_admin = {str(give).upper()} WHERE login = '{target}'")
            label = 'получил доступ к админ-панели' if give else 'лишён доступа к админ-панели'
            return _resp(200, {'ok': True, 'message': f"Игрок {target} {label}"})

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()
