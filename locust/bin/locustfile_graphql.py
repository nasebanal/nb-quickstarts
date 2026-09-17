import os

from locust import HttpUser, between, tag, task


class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("HTTP_HOST", "http://localhost:8080")
    debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"

    @task
    @tag('graphql-query')
    def graphql_query(self):
        """GraphQL: Query accounts (read operation)"""
        response = self.client.post("/graphql", name="/graphql (query)", json={
            "query": """
                query {
                    accounts {
                        id
                        name
                        quantity
                        source
                    }
                }
            """
        })

        # Debug logging
        if self.debug_mode and response.status_code == 200:
            try:
                data = response.json()
                accounts = data.get("data", {}).get("accounts")
                if accounts is not None:
                    print(f"✅ [GraphQL Query] Retrieved {len(accounts)} account(s)", flush=True)
                    for account in accounts[:3]:  # Show first 3 only
                        print(f"  - Account:{account.get('name')} Qty:{account.get('quantity')}", flush=True)
                    if len(accounts) > 3:
                        print(f"  ... and {len(accounts) - 3} more", flush=True)
            except Exception as e:
                print(f"⚠️  [GraphQL Query] Failed to parse response: {e}", flush=True)

    @task
    @tag('graphql-mutation')
    def graphql_mutation(self):
        """GraphQL: Mutation - Register account (write operation)"""
        import random
        suffix = random.randint(1000, 9999)
        self.client.post("/graphql", name="/graphql (mutation)", json={
            "query": f"""
                mutation {{
                    createAccount(input: {{
                        name: "Load Test Account {suffix}"
                        quantity: {suffix % 100}
                    }}) {{
                        id
                        name
                        source
                    }}
                }}
            """
        })
