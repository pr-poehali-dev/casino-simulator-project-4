import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

def _conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def _resp(status: int, body: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        },
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False),
    }

def _secs(ts):
    '''Секунды до окончания cooldown, 0 если готов'''
    if not ts:
        return 0
    now = datetime.now(timezone.utc)
    end = ts.replace(tzinfo=timezone.utc)
    return max(0, int((end - now).total_seconds()))

def handler(event: dict, context) -> dict:
    '''UltraCheat: фишки, удача, stealth — с cooldown'''
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
        cur.execute(
            f"SELECT login, uc_cheat, uc_chips_at, uc_luck_at, uc_stealth_at "
            f"FROM casino_users WHERE token = '{token_esc}'"
        )
        row = cur.fetchone()
        if not row:
            return _resp(401, {'error': 'Сессия истекла'})
        login, has_uc, chips_at, luck_at, stealth_at = row
        if not has_uc:
            return _resp(403, {'error': 'Нет UltraCheat'})

        login_esc = login.replace("'", "''")

        # Статус cooldown
        if method == 'GET' and action == 'status':
            return _resp(200, {
                'chips_cd': _secs(chips_at),
                'luck_cd': _secs(luck_at),
                'stealth_cd': _secs(stealth_at),
            })

        # Выдать себе фишки (cooldown 6ч)
        if method == 'POST' and action == 'chips':
            cd = _secs(chips_at)
            if cd > 0:
                return _resp(429, {'error': f'Перезарядка: {cd} сек', 'cd': cd})
            amount = max(1, min(20000, int(body.get('amount', 1000))))
            next_cd = (datetime.now(timezone.utc) + timedelta(hours=6)).strftime('%Y-%m-%d %H:%M:%S')
            cur.execute(
                f"UPDATE casino_users SET balance = balance + {amount}, uc_chips_at = '{next_cd}' "
                f"WHERE login = '{login_esc}' RETURNING balance"
            )
            new_bal = cur.fetchone()[0]
            return _resp(200, {'ok': True, 'balance': new_bal, 'cd': 6*3600})

        # Выдать себе удачу (cooldown 10ч)
        if method == 'POST' and action == 'luck':
            cd = _secs(luck_at)
            if cd > 0:
                return _resp(429, {'error': f'Перезарядка: {cd} сек', 'cd': cd})
            next_cd = (datetime.now(timezone.utc) + timedelta(hours=10)).strftime('%Y-%m-%d %H:%M:%S')
            cur.execute(
                f"UPDATE casino_users SET luck_override = 1, uc_luck_at = '{next_cd}' "
                f"WHERE login = '{login_esc}'"
            )
            return _resp(200, {'ok': True, 'cd': 10*3600})

        # Stealth (cooldown 48ч)
        if method == 'POST' and action == 'stealth':
            cd = _secs(stealth_at)
            if cd > 0:
                return _resp(429, {'error': f'Перезарядка: {cd} сек', 'cd': cd})
            stealth_end = (datetime.now(timezone.utc) + timedelta(minutes=30)).strftime('%Y-%m-%d %H:%M:%S')
            next_cd = (datetime.now(timezone.utc) + timedelta(hours=48)).strftime('%Y-%m-%d %H:%M:%S')
            cur.execute(
                f"UPDATE casino_users SET spectator_stealth_until = '{stealth_end}', uc_stealth_at = '{next_cd}' "
                f"WHERE login = '{login_esc}'"
            )
            return _resp(200, {'ok': True, 'stealth_until': stealth_end, 'cd': 48*3600})

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()
