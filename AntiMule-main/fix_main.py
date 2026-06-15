with open('c:/Users/sivas/Downloads/AntiMule/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

bad_block = '''from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")'''

code = code.replace(bad_block, '')

good_block = '''from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
JWT_SECRET = 'your-super-secret-key-please-change-in-prod'
JWT_ALGORITHM = 'HS256'

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
'''

code = code.replace("JWT_SECRET = 'your-super-secret-key-please-change-in-prod'", "")
code = code.replace("JWT_ALGORITHM = 'HS256'", "")

insert_target = 'from fastapi.responses import StreamingResponse\nfrom pydantic import BaseModel'
code = code.replace(insert_target, insert_target + '\n\n' + good_block)

with open('c:/Users/sivas/Downloads/AntiMule/main.py', 'w', encoding='utf-8') as f:
    f.write(code)
