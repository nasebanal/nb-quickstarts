from locust import HttpUser, task, between, tag
import os

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("LOCUST_HTTP_HOST", "http://localhost:8080")

    @task
    @tag('graphql-query')
    def graphql_query(self):
        """GraphQL: Query posts (read operation)"""
        self.client.post("/graphql", name="/graphql (query)", json={
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
