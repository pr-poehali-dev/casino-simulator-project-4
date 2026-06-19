import json
import os
import hashlib
import secrets
import psycopg2

def _hash(password: str) -> str:
    salt = 'golden_spin_salt_v1'
    return hashlib.sha256((salt + password).encode()).hexdigest()

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
        'body': json.dumps(body),
    }

def _user_dict(row) -> dict:
    return {
        'login': row[0],
        'balance': row[1],
        'spins': row[2],
        'wins': row[3],
        'biggest': row[4],
        'token': row[5],
    }

def handler(event: dict, context) -> dict:
    '''Регистрация, вход и сохранение прогресса игрока казино Golden Spin'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return _resp(200, {})

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
        if method == 'POST' and action == 'register':
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            if len(login) < 3 or len(password) < 4:
                return _resp(400, {'error': 'Логин от 3 символов, пароль от 4 символов'})
            login_esc = login.replace("'", "''")
            cur.execute(f"SELECT id FROM casino_users WHERE login = '{login_esc}'")
            if cur.fetchone():
                return _resp(409, {'error': 'Такой логин уже занят'})
            token = secrets.token_hex(24)
            ph = _hash(password)
            cur.execute(
                f"INSERT INTO casino_users (login, password_hash, token) "
                f"VALUES ('{login_esc}', '{ph}', '{token}') "
                f"RETURNING login, balance, spins, wins, biggest, token"
            )
            return _resp(200, _user_dict(cur.fetchone()))

        if method == 'POST' and action == 'login':
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            login_esc = login.replace("'", "''")
            ph = _hash(password)
            cur.execute(
                f"SELECT login, balance, spins, wins, biggest, token, password_hash "
                f"FROM casino_users WHERE login = '{login_esc}'"
            )
            row = cur.fetchone()
            if not row or row[6] != ph:
                return _resp(401, {'error': 'Неверный логин или пароль'})
            token = secrets.token_hex(24)
            cur.execute(f"UPDATE casino_users SET token = '{token}' WHERE login = '{login_esc}'")
            return _resp(200, {
                'login': row[0], 'balance': row[1], 'spins': row[2],
                'wins': row[3], 'biggest': row[4], 'token': token,
            })

        token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token')
        if not token:
            return _resp(401, {'error': 'Нужна авторизация'})
        token_esc = token.replace("'", "''")

        if method == 'GET' and action == 'me':
            cur.execute(
                f"SELECT login, balance, spins, wins, biggest, token "
                f"FROM casino_users WHERE token = '{token_esc}'"
            )
            row = cur.fetchone()
            if not row:
                return _resp(401, {'error': 'Сессия истекла'})
            return _resp(200, _user_dict(row))

        if method == 'POST' and action == 'save':
            balance = int(body.get('balance', 0))
            spins = int(body.get('spins', 0))
            wins = int(body.get('wins', 0))
            biggest = int(body.get('biggest', 0))
            cur.execute(
                f"UPDATE casino_users SET balance = {balance}, spins = {spins}, "
                f"wins = {wins}, biggest = {biggest} WHERE token = '{token_esc}' "
                f"RETURNING login, balance, spins, wins, biggest, token"
            )
            row = cur.fetchone()
            if not row:
                return _resp(401, {'error': 'Сессия истекла'})
            return _resp(200, _user_dict(row))

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()
