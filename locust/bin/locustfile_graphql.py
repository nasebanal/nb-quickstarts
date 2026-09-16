import os

from locust import HttpUser, between, tag, task


class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("HTTP_HOST", "http://localhost:8080")
    debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"

    @task
    @tag('graphql-query')
    def graphql_query(self):
        """GraphQL: Query items (read operation)"""
        response = self.client.post("/graphql", name="/graphql (query)", json={
            "query": """
                query {
                    items {
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
                items = data.get("data", {}).get("items")
                if items is not None:
                    print(f"✅ [GraphQL Query] Retrieved {len(items)} item(s)", flush=True)
                    for item in items[:3]:  # Show first 3 only
                        print(f"  - Item:{item.get('name')} Qty:{item.get('quantity')}", flush=True)
                    if len(items) > 3:
                        print(f"  ... and {len(items) - 3} more", flush=True)
            except Exception as e:
                print(f"⚠️  [GraphQL Query] Failed to parse response: {e}", flush=True)

    @task
    @tag('graphql-mutation')
    def graphql_mutation(self):
        """GraphQL: Mutation - Register item (write operation)"""
        import random
        suffix = random.randint(1000, 9999)
        self.client.post("/graphql", name="/graphql (mutation)", json={
            "query": f"""
                mutation {{
                    createItem(input: {{
                        name: "Load Test Item {suffix}"
                        quantity: {suffix % 100}
                    }}) {{
                        id
                        name
                        source
                    }}
                }}
            """
        })
