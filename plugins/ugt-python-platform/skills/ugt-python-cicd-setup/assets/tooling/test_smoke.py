# smoke test ขั้นต่ำให้ pipeline รันผ่าน — ไม่ใช่ test suite จริง
# โค้ดใหม่หลังจากนี้ต้องมี test คู่กันตาม Quality Gate (coverage โค้ดใหม่ ≥ 60%)
import importlib


def test_app_importable():
    assert importlib.import_module("__APP_MODULE__")
