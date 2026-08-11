"""org /api/health — include in app: app.include_router(health_router)"""
from fastapi import APIRouter, Response

health_router = APIRouter()


@health_router.get("/api/health")
def health(response: Response):
    ok = True
    # [DB] check DB properly (SELECT 1) and set ok = False when down — do not include version/commit in response
    response.status_code = 200 if ok else 503
    return {"status": "healthy" if ok else "degraded"}
