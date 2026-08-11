"""org /api/health — เพิ่มใน urls.py: path("api/health", health)"""
from django.http import JsonResponse


def health(request):
    ok = True
    # [DB] เช็ค DB แบบถูก (SELECT 1) แล้ว ok = False เมื่อพัง — ห้ามใส่ version/commit ใน response
    return JsonResponse({"status": "healthy" if ok else "degraded"}, status=200 if ok else 503)
