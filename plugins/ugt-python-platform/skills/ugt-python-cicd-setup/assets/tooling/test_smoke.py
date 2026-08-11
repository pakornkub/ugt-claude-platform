# smoke test minimum for pipeline to pass — not a real test suite
# new code after this must have paired tests per Quality Gate (new code coverage >= 60%)
import importlib


def test_app_importable():
    assert importlib.import_module("__APP_MODULE__")
