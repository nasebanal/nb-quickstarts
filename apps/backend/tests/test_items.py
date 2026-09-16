def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_items_seeded(client):
    response = client.get("/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 3
    assert items[0]["name"] == "Sample Item A"


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
