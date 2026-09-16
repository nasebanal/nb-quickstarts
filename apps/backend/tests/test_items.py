def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_items_seeded(client):
    response = client.get("/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 3
    assert items[0]["name"] == "Cash"


def test_list_balances_sums_events_per_name(client):
    response = client.get("/items/balances")
    assert response.status_code == 200
    balances = {b["name"]: b for b in response.json()}
    # Cash has three seeded events (+100000, -30000, +50000) - the endpoint
    # must sum them, not just report the latest one.
    assert balances["Cash"]["balance"] == 120000
    assert balances["Cash"]["eventCount"] == 3
    assert balances["Sales Revenue"]["balance"] == 50000
    assert balances["Sales Revenue"]["eventCount"] == 1
    assert balances["Rent Expense"]["balance"] == 30000
    assert balances["Rent Expense"]["eventCount"] == 1


def test_create_item_requires_auth(client):
    response = client.post("/items", json={"name": "x", "quantity": 1})
    assert response.status_code == 401


def test_login_and_create_item(client):
    login_response = client.post("/auth/login", json={"employeeCode": "E001"})
    assert login_response.status_code == 200
    token = login_response.json()["token"]

    create_response = client.post(
        "/items",
        json={"name": "New Item", "quantity": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    body = create_response.json()
    assert body["name"] == "New Item"
    assert body["quantity"] == 5
    assert body["source"] == "api"


def test_graphql_query_and_mutation(client):
    query_response = client.post(
        "/graphql", json={"query": "query { items { id name quantity source } }"}
    )
    assert query_response.status_code == 200
    assert len(query_response.json()["data"]["items"]) >= 3

    mutation_response = client.post(
        "/graphql",
        json={
            "query": 'mutation { createItem(input: {name: "GQL Item", quantity: 2}) '
            "{ id name quantity source } }"
        },
    )
    assert mutation_response.status_code == 200
    created = mutation_response.json()["data"]["createItem"]
    assert created["name"] == "GQL Item"
    assert created["quantity"] == 2
