import json
import pytest

from mm_db_cloud.app import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.testing = True
    return app.test_client()


def test_add_handler_happy_path(monkeypatch, client):
    # bypass auth
    monkeypatch.setattr("mm_db_cloud.handlers.add.verify_request", lambda req: None)
    # bypass real Sheets calls
    monkeypatch.setattr(
        "mm_db_cloud.handlers.add.run_ops",
        lambda ops_req: {"did": "work", "n": len(ops_req.ops)},
    )

    payload = {
        "spreadsheetId": "abc",
        "ops": [{"type": "append", "sheetName": "Database", "rowValues": ["x"]}],
    }
    r = client.post("/add", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 200
    data = r.get_json()
    assert data["ok"] is True
    assert data["result"]["did"] == "work"
    assert data["result"]["n"] == 1


def test_add_handler_validation_error(monkeypatch, client):
    monkeypatch.setattr("mm_db_cloud.handlers.add.verify_request", lambda req: None)

    # missing spreadsheetId
    payload = {"ops": []}
    r = client.post("/add", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 400
    data = r.get_json()
    assert data["ok"] is False
    assert "spreadsheetId" in data["error"]


def test_add_handler_auth_error(monkeypatch, client):
    from mm_db_cloud.models.errors import AuthError

    def boom(_):
        raise AuthError("nope")

    monkeypatch.setattr("mm_db_cloud.handlers.add.verify_request", boom)

    payload = {"spreadsheetId": "abc", "ops": []}
    r = client.post("/add", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 401
    data = r.get_json()
    assert data["ok"] is False
    assert data["error"] == "nope"
