def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_transactions_seeded(client):
    response = client.get("/transactions")
    assert response.status_code == 200
    transactions = response.json()
    assert len(transactions) >= 3
    assert transactions[0]["name"] == "Cash"


def test_list_accounts_sums_transactions_per_name(client):
    response = client.get("/accounts")
    assert response.status_code == 200
    balances = {b["name"]: b for b in response.json()}
    # Cash has three seeded transactions (+100000, -30000, +50000) - the
    # endpoint must sum them, not just report the latest one.
    assert balances["Cash"]["balance"] == 120000
    assert balances["Cash"]["eventCount"] == 3
    assert balances["Sales Revenue"]["balance"] == 50000
    assert balances["Sales Revenue"]["eventCount"] == 1
    assert balances["Rent Expense"]["balance"] == 30000
    assert balances["Rent Expense"]["eventCount"] == 1


def test_create_transaction_requires_auth(client):
    response = client.post("/transactions", json={"name": "x", "quantity": 1})
    assert response.status_code == 401


def test_login_and_create_transaction(client):
    login_response = client.post("/auth/login", json={"username": "demo", "password": "demo"})
    assert login_response.status_code == 200
    token = login_response.json()["token"]

    create_response = client.post(
        "/transactions",
        json={"name": "New Account", "quantity": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    body = create_response.json()
    assert body["name"] == "New Account"
    assert body["quantity"] == 5
    assert body["source"] == "api"


def test_graphql_query_and_mutation(client):
    query_response = client.post(
        "/graphql", json={"query": "query { transactions { id name quantity source } }"}
    )
    assert query_response.status_code == 200
    assert len(query_response.json()["data"]["transactions"]) >= 3

    mutation_response = client.post(
        "/graphql",
        json={
            "query": 'mutation { createTransaction(input: {name: "GQL Account", quantity: 2}) '
            "{ id name quantity source } }"
        },
    )
    assert mutation_response.status_code == 200
    created = mutation_response.json()["data"]["createTransaction"]
    assert created["name"] == "GQL Account"
    assert created["quantity"] == 2


def test_login_rejects_a_wrong_password(client):
    response = client.post("/auth/login", json={"username": "demo", "password": "wrong"})
    assert response.status_code == 401
    assert response.json() == {"detail": "invalid username or password"}


def test_login_rejects_an_unknown_user_with_the_same_message(client):
    response = client.post("/auth/login", json={"username": "nobody", "password": "demo"})
    assert response.status_code == 401
    assert response.json() == {"detail": "invalid username or password"}


def test_login_requires_a_password(client):
    assert client.post("/auth/login", json={"username": "demo"}).status_code == 422


def test_a_token_with_a_forged_signature_is_rejected(client):
    token = client.post("/auth/login", json={"username": "demo", "password": "demo"}).json()["token"]
    version, payload, _signature = token.split("~")
    forged = f"{version}~{payload}~not-the-signature"
    response = client.post("/transactions", json={"name": "x", "quantity": 1}, headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_a_token_cannot_be_reused_for_another_username(client):
    # The username is part of what is signed: swapping it invalidates the token.
    import base64

    token = client.post("/auth/login", json={"username": "demo", "password": "demo"}).json()["token"]
    version, _payload, signature = token.split("~")
    other = base64.urlsafe_b64encode(b"someone-else").rstrip(b"=").decode()
    response = client.post(
        "/transactions", json={"name": "x", "quantity": 1}, headers={"Authorization": f"Bearer {version}~{other}~{signature}"}
    )
    assert response.status_code == 401


def test_created_at_has_a_utc_offset(client):
    # An OpenAPI `date-time` must carry an offset (RFC 3339). MySQL's DATETIME
    # has no time zone, so createdAt has to be tagged as UTC on the way out.
    transactions = client.get("/transactions").json()
    assert transactions
    for transaction in transactions:
        assert transaction["createdAt"].endswith("Z")
