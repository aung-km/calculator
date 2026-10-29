from datetime import datetime

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.main import app
from app.routers import calculator, history

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_history_between_tests():
    client.delete("/history")
    yield
    client.delete("/history")

def test_basic_division():
    r = client.post("/calculate", json={"expr": "30/4"})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert abs(data["result"] - 7.5) < 1e-9


def test_database_connectivity_returns_one():
    response = client.get("/test-db")

    assert response.status_code == 200
    assert response.json() == {"db_result": 1}


@pytest.mark.parametrize(
    ("expr", "expected"),
    [("8 × 7", 56), ("30 ÷ 4", 7.5), ("9 − 2", 7)],
)
def test_calculate_accepts_client_display_operators(expr, expected):
    response = client.post("/calculate", json={"expr": expr})

    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["result"] == expected
    assert data["expr"] == expr

def test_percent_subtraction():
    r = client.post("/calculate", json={"expr": "100 - 6%"})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert abs(data["result"] - 94.0) < 1e-9

def test_standalone_percent():
    r = client.post("/calculate", json={"expr": "6%"})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert abs(data["result"] - 0.06) < 1e-9

def test_invalid_expr_returns_ok_false():
    r = client.post("/calculate", json={"expr": "2**(3"})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is False
    assert "error" in data and data["error"] != ""


def test_get_history_returns_empty_list_before_any_calculation():
    response = client.get("/history")

    assert response.status_code == 200
    assert response.json() == []


def test_get_history_returns_successful_calculations_newest_first():
    client.post("/calculate", json={"expr": "23 - 6"})
    client.post("/calculate", json={"expr": "17 + 10"})

    response = client.get("/history")

    assert response.status_code == 200
    entries = response.json()
    assert [entry["expr"] for entry in entries] == ["17 + 10", "23 - 6"]
    assert [entry["result"] for entry in entries] == [27, 17]
    assert all(set(entry) == {"timestamp", "expr", "result"} for entry in entries)
    assert all(datetime.fromisoformat(entry["timestamp"]) for entry in entries)


def test_get_history_respects_limit():
    for expr in ("1 + 1", "2 + 2", "3 + 3"):
        client.post("/calculate", json={"expr": expr})

    response = client.get("/history", params={"limit": 2})

    assert response.status_code == 200
    assert [entry["expr"] for entry in response.json()] == ["3 + 3", "2 + 2"]


def test_get_history_rejects_negative_limit():
    response = client.get("/history", params={"limit": -1})

    assert response.status_code == 422


def test_delete_history_clears_existing_entries():
    client.post("/calculate", json={"expr": "8 * 7"})

    response = client.delete("/history")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "cleared": True}
    assert client.get("/history").json() == []


def test_delete_history_is_idempotent_when_history_is_empty():
    first_response = client.delete("/history")
    second_response = client.delete("/history")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json() == {"ok": True, "cleared": True}
    assert second_response.json() == {"ok": True, "cleared": True}


def test_history_accepts_new_calculations_after_delete():
    client.post("/calculate", json={"expr": "9 + 1"})
    client.delete("/history")
    client.post("/calculate", json={"expr": "4 * 5"})

    response = client.get("/history")

    assert response.status_code == 200
    assert [entry["expr"] for entry in response.json()] == ["4 * 5"]


def test_calculate_accepts_expression_request_body():
    operation = app.openapi()["paths"]["/calculate"]["post"]

    request_schema = operation.get("requestBody", {}).get("content", {}).get(
        "application/json", {}
    ).get("schema")

    assert request_schema == {"$ref": "#/components/schemas/ExpressionIn"}


def test_history_returns_expression_out_objects():
    operation = app.openapi()["paths"]["/history"]["get"]

    response_schema = operation["responses"]["200"]["content"][
        "application/json"
    ]["schema"]

    assert response_schema["type"] == "array"
    assert response_schema["items"] == {
        "$ref": "#/components/schemas/ExpressionOut"
    }


def test_failed_calculation_does_not_enter_history():
    response = client.post("/calculate", json={"expr": "2**(3"})

    assert response.status_code == 200
    assert response.json()["ok"] is False
    assert client.get("/history").json() == []


def test_endpoints_are_owned_by_the_expected_router_modules():
    endpoint_modules = {
        (route.path, method): route.endpoint.__module__
        for router in (calculator.router, history.router)
        for route in router.routes
        if isinstance(route, APIRoute)
        for method in route.methods
    }

    assert endpoint_modules[("/calculate", "POST")] == "app.routers.calculator"
    assert endpoint_modules[("/history", "GET")] == "app.routers.history"
    assert endpoint_modules[("/history", "DELETE")] == "app.routers.history"
