import pytest


def _login(client):
    response = client.post("/auth/login", json={"username": "demo", "password": "demo"})
    return response.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def token(client):
    """A logged-in demo user; the profile is put back as seeded afterwards, so
    tests that change it don't leak into the next one (there is one user)."""
    token = _login(client)
    yield token
    client.put("/me/profile", json={"displayName": "Demo User", "language": "ja"}, headers=_auth(token))


def test_me_requires_a_token(client):
    assert client.get("/me").status_code == 401
    assert client.put("/me/profile", json={"language": "en"}).status_code == 401


def test_me_returns_the_seeded_profile(client, token):
    body = client.get("/me", headers=_auth(token)).json()
    assert body == {
        "username": "demo",
        "email": "demo@nasebanal.com",
        "displayName": "Demo User",
        "language": "ja",
        "provider": "demo",
    }


def test_update_profile_changes_display_name_and_language_only(client, token):
    response = client.put(
        "/me/profile",
        json={"displayName": "Second Name", "language": "en", "email": "hacker@example.com"},
        headers=_auth(token),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["displayName"] == "Second Name"
    assert body["language"] == "en"
    # The email is recorded but not editable - a sent value is ignored.
    assert body["email"] == "demo@nasebanal.com"
    # And it stuck.
    assert client.get("/me", headers=_auth(token)).json()["displayName"] == "Second Name"


def test_update_profile_leaves_omitted_fields_alone(client, token):
    client.put("/me/profile", json={"language": "en"}, headers=_auth(token))
    body = client.get("/me", headers=_auth(token)).json()
    assert body["language"] == "en"
    assert body["displayName"] == "Demo User"


def test_update_profile_rejects_an_unknown_language(client, token):
    response = client.put("/me/profile", json={"language": "fr"}, headers=_auth(token))
    assert response.status_code == 422
