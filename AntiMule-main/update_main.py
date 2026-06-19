with open('c:/Users/sivas/Downloads/AntiMule/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

deps_import = '''from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
import jwt
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
'''
code = code.replace('# ── Auth Endpoints', deps_import + '\n# ── Auth Endpoints')

code = code.replace(
    'async def predict_single(account: AccountData):',
    'async def predict_single(account: AccountData, current_user: dict = Depends(get_current_user)):'
)
code = code.replace(
    'await _db.async_save_prediction(account.model_dump(), result, source="api")',
    'await _db.async_save_prediction(account.model_dump(), result, source="api", user_id=current_user.get("sub"))'
)

code = code.replace(
    'async def predict_batch(file: UploadFile = File(...)):',
    'async def predict_batch(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):'
)
code = code.replace(
    'await _db.async_save_batch(scan_id, accounts_list, results_list, source="api")',
    'await _db.async_save_batch(scan_id, accounts_list, results_list, source="api") # user_id will be added to batch_scans'
)

code = code.replace(
    'async def db_stats():',
    'async def db_stats(current_user: dict = Depends(get_current_user)):'
)
code = code.replace(
    'stats = await _db.async_get_stats()',
    'stats = await _db.async_get_stats(user_id=current_user.get("sub"))'
)

code = code.replace(
    'async def db_recent(limit: int = Query(default=50, le=500)):',
    'async def db_recent(limit: int = Query(default=50, le=500), current_user: dict = Depends(get_current_user)):'
)
code = code.replace(
    'rows = await _db.async_get_recent(limit)',
    'rows = await _db.async_get_recent(limit, user_id=current_user.get("sub"))'
)

with open('c:/Users/sivas/Downloads/AntiMule/main.py', 'w', encoding='utf-8') as f:
    f.write(code)
