from locust import HttpUser, task, between, tag
import os

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("HTTP_HOST", "http://localhost:8080")
    debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"

    @task
    @tag('graphql-query')
    def graphql_query(self):
        """GraphQL: Query posts (read operation)"""
        response = self.client.post("/graphql", name="/graphql (query)", json={
            "query": """
                query {
                    posts {
                        id
                        title
                        content
                        authorId
                        createdAt
                        author {
                            id
                            name
                            email
                        }
                    }
                }
            """
        })

        # Debug logging
        if self.debug_mode and response.status_code == 200:
            try:
                data = response.json()
                if "data" in data and "posts" in data["data"]:
                    posts = data["data"]["posts"]
                    print(f"✅ [GraphQL Query] Retrieved {len(posts)} post(s)", flush=True)
                    for post in posts[:3]:  # Show first 3 only
                        print(f"  - Post ID:{post.get('id')} Title:{post.get('title')} Author:{post.get('author', {}).get('name', 'N/A')}", flush=True)
                    if len(posts) > 3:
                        print(f"  ... and {len(posts) - 3} more", flush=True)
            except Exception as e:
                print(f"⚠️  [GraphQL Query] Failed to parse response: {e}", flush=True)

    @task
    @tag('graphql-mutation')
    def graphql_mutation(self):
        """GraphQL: Mutation - Create post (write operation)"""
        import random
        author_id = random.choice(["1", "2", "3"])
        self.client.post("/graphql", name="/graphql (mutation)", json={
            "query": f"""
                mutation {{
                    createPost(
                        title: "Load Test Post",
                        content: "This is a test post from Locust",
                        authorId: "{author_id}"
                    ) {{
                        id
                        title
                        content
                        authorId
                        createdAt
                    }}
                }}
            """
        })
