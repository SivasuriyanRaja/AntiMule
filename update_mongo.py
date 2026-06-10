with open('c:/Users/sivas/Downloads/AntiMule/db/mongo.py', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'async def async_save_prediction(input_data: dict, result: dict, alerts: list = None) -> str:',
    'async def async_save_prediction(input_data: dict, result: dict, alerts: list = None, user_id: str = None) -> str:'
)
code = code.replace(
    '"source": "api",',
    '"source": "api",\n        "user_id": user_id,'
)

code = code.replace(
    'def save_prediction(input_data: dict, result: dict, alerts: list = None) -> str:',
    'def save_prediction(input_data: dict, result: dict, alerts: list = None, user_id: str = None) -> str:'
)

code = code.replace(
    'async def async_save_batch_scan(scan_id: str, summary: dict) -> str:',
    'async def async_save_batch_scan(scan_id: str, summary: dict, user_id: str = None) -> str:'
)

code = code.replace(
    'def save_batch_scan(scan_id: str, summary: dict) -> str:',
    'def save_batch_scan(scan_id: str, summary: dict, user_id: str = None) -> str:'
)

code = code.replace(
    'async def async_get_recent(limit: int = 50) -> list:',
    'async def async_get_recent(limit: int = 50, user_id: str = None) -> list:'
)
code = code.replace(
    'cursor = db.predictions.find().sort("created_at", DESCENDING).limit(limit)',
    'query = {"user_id": user_id} if user_id else {}\n    cursor = db.predictions.find(query).sort("created_at", DESCENDING).limit(limit)'
)

code = code.replace(
    'def sync_get_recent(limit: int = 50) -> list:',
    'def sync_get_recent(limit: int = 50, user_id: str = None) -> list:'
)

code = code.replace(
    'async def async_get_stats() -> dict:',
    'async def async_get_stats(user_id: str = None) -> dict:'
)
code = code.replace(
    'total  = await db.predictions.count_documents({})',
    'query = {"user_id": user_id} if user_id else {}\n    total  = await db.predictions.count_documents(query)'
)
code = code.replace(
    'mules  = await db.predictions.count_documents({"prediction": 1})',
    'query_mule = {"prediction": 1}\n    if user_id: query_mule["user_id"] = user_id\n    mules  = await db.predictions.count_documents(query_mule)'
)

with open('c:/Users/sivas/Downloads/AntiMule/db/mongo.py', 'w', encoding='utf-8') as f:
    f.write(code)
