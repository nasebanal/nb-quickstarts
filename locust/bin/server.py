#!/usr/bin/env python3
import http.server
import socketserver
import urllib.parse
import json
import os
import re
from functools import partial
from datetime import datetime

PORT = 8080
DOCUMENT_ROOT = "."

# In-memory data store for GraphQL
USERS = {
    "1": {"id": "1", "name": "Alice", "email": "alice@example.com"},
    "2": {"id": "2", "name": "Bob", "email": "bob@example.com"},
    "3": {"id": "3", "name": "Charlie", "email": "charlie@example.com"},
}

POSTS = {
    "1": {"id": "1", "title": "First Post", "content": "Hello World", "authorId": "1", "createdAt": "2024-01-01T00:00:00Z"},
    "2": {"id": "2", "title": "Second Post", "content": "GraphQL is great", "authorId": "2", "createdAt": "2024-01-02T00:00:00Z"},
    "3": {"id": "3", "title": "Third Post", "content": "Load testing with Locust", "authorId": "1", "createdAt": "2024-01-03T00:00:00Z"},
}

POST_ID_COUNTER = 4


def resolve_graphql_query(query, variables=None):
    """Simple GraphQL query resolver"""
    global POST_ID_COUNTER

    query = query.strip()

    # Query: posts
    if "posts" in query and "query" in query.lower():
        posts = list(POSTS.values())
        # Add author info if requested
        if "author" in query:
            posts_with_authors = []
            for post in posts:
                post_with_author = post.copy()
                post_with_author["author"] = USERS.get(post["authorId"])
                posts_with_authors.append(post_with_author)
            return {"data": {"posts": posts_with_authors}}
        return {"data": {"posts": posts}}

    # Mutation: createPost
    if "createPost" in query and "mutation" in query.lower():
        title_match = re.search(r'title:\s*"([^"]+)"', query)
        content_match = re.search(r'content:\s*"([^"]+)"', query)
        author_id_match = re.search(r'authorId:\s*"(\d+)"', query)

        if title_match and content_match and author_id_match:
            title = title_match.group(1)
            content = content_match.group(1)
            author_id = author_id_match.group(1)

            new_post = {
                "id": str(POST_ID_COUNTER),
                "title": title,
                "content": content,
                "authorId": author_id,
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }
            POSTS[str(POST_ID_COUNTER)] = new_post
            POST_ID_COUNTER += 1

            return {"data": {"createPost": new_post}}

    return {"errors": [{"message": "Query not recognized"}]}


class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DOCUMENT_ROOT, **kwargs)
    
    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if mimetype and mimetype.startswith('text/'):
            return mimetype + '; charset=utf-8'
        return mimetype
    
    def do_POST(self):
        if self.path == '/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username')
                password = data.get('password')

                if username == 'admin' and password == 'password':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'status': 'success', 'message': 'Login successful'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                else:
                    self.send_response(401)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'status': 'error', 'message': 'Invalid credentials'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': 'Invalid JSON'}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == '/graphql':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query', '')
                variables = data.get('variables')

                # Execute GraphQL query
                result = resolve_graphql_query(query, variables)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'errors': [{'message': 'Invalid JSON'}]}
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'errors': [{'message': str(e)}]}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
        print(f"Serving HTTP on port {PORT}")
        print(f"Document root: {os.path.abspath(DOCUMENT_ROOT)}")
        print(f"Access at: http://localhost:{PORT}")
        print(f"Endpoints: /login, /graphql")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()