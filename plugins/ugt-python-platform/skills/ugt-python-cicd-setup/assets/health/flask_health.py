"""org /api/health — รวมเข้าแอปด้วย: app.register_blueprint(health_bp)"""
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    ok = True
    # [DB] เช็ค DB แบบถูก (SELECT 1) แล้ว ok = False เมื่อพัง — ห้ามใส่ version/commit ใน response
    return jsonify({"status": "healthy" if ok else "degraded"}), 200 if ok else 503
