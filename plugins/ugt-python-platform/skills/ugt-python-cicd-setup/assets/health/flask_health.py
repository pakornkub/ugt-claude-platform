"""org /api/health — include in app: app.register_blueprint(health_bp)"""
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    ok = True
    # [DB] check DB properly (SELECT 1) and set ok = False when down — do not include version/commit in response
    return jsonify({"status": "healthy" if ok else "degraded"}), 200 if ok else 503
