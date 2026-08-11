"""org /api/health — add to urls.py: path("api/health", health)"""
from django.http import JsonResponse


def health(request):
    ok = True
    # [DB] check DB properly (SELECT 1) and set ok = False when down — do not include version/commit in response
    return JsonResponse({"status": "healthy" if ok else "degraded"}, status=200 if ok else 503)
