import json
import os
import psycopg2

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
    '''Админ-панель казино Golden Spin: удача, фишки, управление доступом'''
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

        # Список всех пользователей
        if method == 'GET' and action == 'users':
            cur.execute(
                "SELECT login, balance, spins, wins, is_admin, super_admin, luck_override FROM casino_users ORDER BY balance DESC"
            )
            rows = cur.fetchall()
            return _resp(200, {'users': [
                {'login': r[0], 'balance': r[1], 'spins': r[2], 'wins': r[3],
                 'is_admin': bool(r[4]), 'super_admin': bool(r[5]), 'luck_override': r[6]}
                for r in rows
            ]})

        # Выдать/забрать фишки
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

        # Установить удачу на следующий спин
        if method == 'POST' and action == 'luck':
            target = (body.get('login') or '').strip().replace("'", "''")
            luck = body.get('luck')  # True = удача, False = неудача, None = сброс
            if not target:
                return _resp(400, {'error': 'Укажи логин'})
            cur.execute(f"SELECT id FROM casino_users WHERE login = '{target}'")
            if not cur.fetchone():
                return _resp(404, {'error': 'Пользователь не найден'})
            if luck is True:
                val = '1'
                label = 'Удача активирована'
            elif luck is False:
                val = '0'
                label = 'Неудача активирована'
            else:
                val = 'NULL'
                label = 'Влияние удачи сброшено'
            cur.execute(f"UPDATE casino_users SET luck_override = {val} WHERE login = '{target}'")
            return _resp(200, {'ok': True, 'message': f"{label} для {target} на следующий спин"})

        # Выдать/забрать права админа (только super_admin)
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