"""org /api/health — รวมเข้าแอปด้วย: app.include_router(health_router)"""
from fastapi import APIRouter, Response

health_router = APIRouter()


@health_router.get("/api/health")
def health(response: Response):
    ok = True
    # [DB] เช็ค DB แบบถูก (SELECT 1) แล้ว ok = False เมื่อพัง — ห้ามใส่ version/commit ใน response
    response.status_code = 200 if ok else 503
    return {"status": "healthy" if ok else "degraded"}
