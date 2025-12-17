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

# In-memory data store for transfer vouchers
TRANSFER_VOUCHERS = {
    "1": {
        "id": "1",
        "shippingStoreCode": 2095,
        "shippingStoreName": "Tokyo Store",
        "arrivalStoreCode": 5166,
        "arrivalStoreName": "Osaka Store",
        "departmentCode": "D001",
        "departmentName": "Electronics",
        "voucherType": 30,
        "voucherTypeName": "Transfer Type A",
        "voucherNo": "V001",
        "voucherIssuedFlag": True,
        "shippingDate": "2025-11-05",
        "planDeliveryDate": "2025-11-10",
        "actualDeliveryDate": "2025-11-09",
        "printDate": "2025-11-04",
        "shippingRegistrationUnit": "Unit A",
        "totalShippingQuantity": 10,
        "totalShippingCostPrice": 8000,
        "totalShippingSellingAmount": 15000,
        "totalArrivalSellingAmount": 15000,
        "totalVariousQuantity": 2,
        "totalVariousCostPrice": 1600,
        "totalVariousShippingSellingAmount": 3000,
        "totalVariousArrivalSellingAmount": 3000,
        "transferVoucherItems": [
            {
                "voucherNo": "V001",
                "jan": "4901234567890",
                "productName": "Product A",
                "shippingQuantity": 5,
                "shippingCostPrice": 400,
                "totalShippingCostPrice": 2000,
                "shippingSellingPrice": 750,
                "arrivalSellingPrice": 750,
                "totalShippingSellingPrice": 3750,
                "totalArrivalSellingPrice": 3750,
                "confirmedFlag": True,
                "variousVoucherQuantity": 1,
                "variousVoucherCostPrice": 400,
                "variousTotalCostPrice": 400,
                "variousProductName": "Product A Variant",
                "variousTotalShippingSellingPrice": 750,
                "variousTotalArrivalSellingPrice": 750
            },
            {
                "voucherNo": "V001",
                "jan": "4901234567891",
                "productName": "Product B",
                "shippingQuantity": 5,
                "shippingCostPrice": 600,
                "totalShippingCostPrice": 3000,
                "shippingSellingPrice": 1125,
                "arrivalSellingPrice": 1125,
                "totalShippingSellingPrice": 5625,
                "totalArrivalSellingPrice": 5625,
                "confirmedFlag": True,
                "variousVoucherQuantity": 1,
                "variousVoucherCostPrice": 600,
                "variousTotalCostPrice": 600,
                "variousProductName": "Product B Variant",
                "variousTotalShippingSellingPrice": 1125,
                "variousTotalArrivalSellingPrice": 1125
            }
        ],
        "createdAt": "2025-11-01T00:00:00Z"
    },
    "2": {
        "id": "2",
        "shippingStoreCode": 2095,
        "shippingStoreName": "Tokyo Store",
        "arrivalStoreCode": 5166,
        "arrivalStoreName": "Osaka Store",
        "departmentCode": "D002",
        "departmentName": "Clothing",
        "voucherType": 30,
        "voucherTypeName": "Transfer Type A",
        "voucherNo": "V002",
        "voucherIssuedFlag": True,
        "shippingDate": "2025-11-05",
        "planDeliveryDate": "2025-11-12",
        "actualDeliveryDate": "2025-11-11",
        "printDate": "2025-11-04",
        "shippingRegistrationUnit": "Unit B",
        "totalShippingQuantity": 25,
        "totalShippingCostPrice": 20000,
        "totalShippingSellingAmount": 37500,
        "totalArrivalSellingAmount": 37500,
        "totalVariousQuantity": 5,
        "totalVariousCostPrice": 4000,
        "totalVariousShippingSellingAmount": 7500,
        "totalVariousArrivalSellingAmount": 7500,
        "transferVoucherItems": [
            {
                "voucherNo": "V002",
                "jan": "4902345678901",
                "productName": "Shirt A",
                "shippingQuantity": 15,
                "shippingCostPrice": 800,
                "totalShippingCostPrice": 12000,
                "shippingSellingPrice": 1500,
                "arrivalSellingPrice": 1500,
                "totalShippingSellingPrice": 22500,
                "totalArrivalSellingPrice": 22500,
                "confirmedFlag": True,
                "variousVoucherQuantity": 3,
                "variousVoucherCostPrice": 800,
                "variousTotalCostPrice": 2400,
                "variousProductName": "Shirt A Variant",
                "variousTotalShippingSellingPrice": 4500,
                "variousTotalArrivalSellingPrice": 4500
            },
            {
                "voucherNo": "V002",
                "jan": "4902345678902",
                "productName": "Pants A",
                "shippingQuantity": 10,
                "shippingCostPrice": 1000,
                "totalShippingCostPrice": 10000,
                "shippingSellingPrice": 2000,
                "arrivalSellingPrice": 2000,
                "totalShippingSellingPrice": 20000,
                "totalArrivalSellingPrice": 20000,
                "confirmedFlag": True,
                "variousVoucherQuantity": 2,
                "variousVoucherCostPrice": 1000,
                "variousTotalCostPrice": 2000,
                "variousProductName": "Pants A Variant",
                "variousTotalShippingSellingPrice": 4000,
                "variousTotalArrivalSellingPrice": 4000
            }
        ],
        "createdAt": "2025-11-02T00:00:00Z"
    },
    "3": {
        "id": "3",
        "shippingStoreCode": 2095,
        "shippingStoreName": "Tokyo Store",
        "arrivalStoreCode": 3000,
        "arrivalStoreName": "Nagoya Store",
        "departmentCode": "D003",
        "departmentName": "Food",
        "voucherType": 20,
        "voucherTypeName": "Transfer Type B",
        "voucherNo": "V003",
        "voucherIssuedFlag": False,
        "shippingDate": "2025-11-06",
        "planDeliveryDate": "2025-11-15",
        "actualDeliveryDate": None,
        "printDate": "2025-11-05",
        "shippingRegistrationUnit": "Unit C",
        "totalShippingQuantity": 5,
        "totalShippingCostPrice": 4000,
        "totalShippingSellingAmount": 8000,
        "totalArrivalSellingAmount": 8000,
        "totalVariousQuantity": 1,
        "totalVariousCostPrice": 800,
        "totalVariousShippingSellingAmount": 1600,
        "totalVariousArrivalSellingAmount": 1600,
        "transferVoucherItems": [
            {
                "voucherNo": "V003",
                "jan": "4903456789012",
                "productName": "Snack A",
                "shippingQuantity": 5,
                "shippingCostPrice": 400,
                "totalShippingCostPrice": 2000,
                "shippingSellingPrice": 800,
                "arrivalSellingPrice": 800,
                "totalShippingSellingPrice": 4000,
                "totalArrivalSellingPrice": 4000,
                "confirmedFlag": False,
                "variousVoucherQuantity": 1,
                "variousVoucherCostPrice": 400,
                "variousTotalCostPrice": 400,
                "variousProductName": "Snack A Variant",
                "variousTotalShippingSellingPrice": 800,
                "variousTotalArrivalSellingPrice": 800
            }
        ],
        "createdAt": "2025-11-03T00:00:00Z"
    },
}

VOUCHER_ID_COUNTER = 4

# In-memory store for auth tokens
AUTH_TOKENS = {}


def resolve_graphql_query(query, variables=None):
    """Simple GraphQL query resolver"""
    global POST_ID_COUNTER, VOUCHER_ID_COUNTER

    query = query.strip()

    # Query: variousTransferVoucherPrints
    if "variousTransferVoucherPrints" in query and "query" in query.lower():
        # Extract query parameters
        vouchers = list(TRANSFER_VOUCHERS.values())

        # Filter by shippingStoreCode
        shipping_store_match = re.search(r'shippingStoreCode:\s*(\d+)', query)
        if shipping_store_match:
            shipping_store_code = int(shipping_store_match.group(1))
            vouchers = [v for v in vouchers if v["shippingStoreCode"] == shipping_store_code]

        # Filter by arrivalStoreCode
        arrival_store_match = re.search(r'arrivalStoreCode:\s*(\d+)', query)
        if arrival_store_match:
            arrival_store_code = int(arrival_store_match.group(1))
            vouchers = [v for v in vouchers if v["arrivalStoreCode"] == arrival_store_code]

        # Filter by shippingDate
        shipping_date_match = re.search(r'shippingDate:\s*"([^"]+)"', query)
        if shipping_date_match:
            shipping_date = shipping_date_match.group(1)
            vouchers = [v for v in vouchers if v["shippingDate"] == shipping_date]

        # Filter by voucherType
        voucher_type_match = re.search(r'voucherType:\s*(\d+)', query)
        if voucher_type_match:
            voucher_type = int(voucher_type_match.group(1))
            vouchers = [v for v in vouchers if v["voucherType"] == voucher_type]

        # Filter by voucherIssuedFlag
        voucher_issued_match = re.search(r'voucherIssuedFlag:\s*(true|false)', query, re.IGNORECASE)
        if voucher_issued_match:
            voucher_issued_flag = voucher_issued_match.group(1).lower() == "true"
            vouchers = [v for v in vouchers if v["voucherIssuedFlag"] == voucher_issued_flag]

        return {"data": {"variousTransferVoucherPrints": vouchers}}

    # Mutation: createTransferVouchers
    if "createTransferVouchers" in query and "mutation" in query.lower():
        # Extract input array from mutation
        # This is a simplified parser - in production, use a proper GraphQL library
        created_vouchers = []

        # Find all input objects in the mutation
        input_pattern = r'\{[^}]*shippingStoreCode:\s*(\d+)[^}]*arrivalStoreCode:\s*(\d+)[^}]*shippingDate:\s*"([^"]+)"[^}]*planDeliveryDate:\s*"([^"]+)"[^}]*shippingQuantity:\s*"([^"]+)"[^}]*shippingSellingPrice:\s*"([^"]+)"[^}]*jan:\s*"([^"]+)"[^}]*\}'
        matches = re.finditer(input_pattern, query)

        for match in matches:
            new_voucher = {
                "id": str(VOUCHER_ID_COUNTER),
                "shippingStoreCode": int(match.group(1)),
                "shippingStoreName": "Test Store",
                "arrivalStoreCode": int(match.group(2)),
                "arrivalStoreName": "Destination Store",
                "departmentCode": "D999",
                "departmentName": "General",
                "voucherType": 30,
                "voucherTypeName": "Transfer Type A",
                "voucherNo": f"V{VOUCHER_ID_COUNTER:03d}",
                "voucherIssuedFlag": False,
                "shippingDate": match.group(3),
                "planDeliveryDate": match.group(4),
                "actualDeliveryDate": None,
                "printDate": datetime.now().strftime("%Y-%m-%d"),
                "shippingRegistrationUnit": "Unit Auto",
                "totalShippingQuantity": int(match.group(5)),
                "totalShippingCostPrice": int(match.group(6)) * 0.6,  # 60% of selling price
                "totalShippingSellingAmount": int(match.group(6)),
                "totalArrivalSellingAmount": int(match.group(6)),
                "totalVariousQuantity": 0,
                "totalVariousCostPrice": 0,
                "totalVariousShippingSellingAmount": 0,
                "totalVariousArrivalSellingAmount": 0,
                "transferVoucherItems": [
                    {
                        "voucherNo": f"V{VOUCHER_ID_COUNTER:03d}",
                        "jan": match.group(7),
                        "productName": f"Product {match.group(7)}",
                        "shippingQuantity": int(match.group(5)),
                        "shippingCostPrice": int(match.group(6)) * 0.6 / int(match.group(5)),
                        "totalShippingCostPrice": int(match.group(6)) * 0.6,
                        "shippingSellingPrice": int(match.group(6)) / int(match.group(5)),
                        "arrivalSellingPrice": int(match.group(6)) / int(match.group(5)),
                        "totalShippingSellingPrice": int(match.group(6)),
                        "totalArrivalSellingPrice": int(match.group(6)),
                        "confirmedFlag": False,
                        "variousVoucherQuantity": 0,
                        "variousVoucherCostPrice": 0,
                        "variousTotalCostPrice": 0,
                        "variousProductName": "",
                        "variousTotalShippingSellingPrice": 0,
                        "variousTotalArrivalSellingPrice": 0
                    }
                ],
                "createdAt": datetime.now().isoformat() + "Z"
            }
            TRANSFER_VOUCHERS[str(VOUCHER_ID_COUNTER)] = new_voucher
            created_vouchers.append(new_voucher)
            VOUCHER_ID_COUNTER += 1

        return {"data": {"createTransferVouchers": created_vouchers}}

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
                "createdAt": datetime.now().isoformat() + "Z"
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
        if self.path == '/api/login' or self.path == '/api/auth/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                employee_code = data.get('employeeCode')

                # Simple validation - accept any employee code
                if employee_code:
                    # Generate a simple token (in production, use proper JWT)
                    token = f"token_{employee_code}_{datetime.now().timestamp()}"
                    AUTH_TOKENS[token] = {
                        "employeeCode": employee_code,
                        "createdAt": datetime.now().isoformat()
                    }

                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('X-Auth-New-Token', token)
                    self.end_headers()
                    response = {'status': 'success', 'message': 'Login successful', 'employeeCode': employee_code}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                else:
                    self.send_response(401)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'status': 'error', 'message': 'Employee code required'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': 'Invalid JSON'}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == '/api/graphql':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                # Check for auth token (support both header names)
                auth_token = self.headers.get('X-Auth-Token') or self.headers.get('X-Auth-New-Token', '')
                if not auth_token or auth_token not in AUTH_TOKENS:
                    self.send_response(401)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'errors': [{'message': 'Unauthorized - invalid or missing auth token'}]}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    return

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

        elif self.path == '/login':
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

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """Multi-threaded TCP server for handling concurrent connections"""
    # Increase the request queue size for high concurrency
    request_queue_size = 1000
    # Allow socket reuse
    allow_reuse_address = True
    # Daemon threads (they will terminate when the main program exits)
    daemon_threads = True

if __name__ == "__main__":
    with ThreadedTCPServer(("", PORT), RequestHandler) as httpd:
        print(f"Serving HTTP on port {PORT}")
        print(f"Document root: {os.path.abspath(DOCUMENT_ROOT)}")
        print(f"Access at: http://localhost:{PORT}")
        print(f"Multi-threaded server ready for high concurrency (queue size: {httpd.request_queue_size})")
        print(f"Endpoints:")
        print(f"  - /api/auth/login (POST) - Employee authentication")
        print(f"  - /api/graphql (POST) - GraphQL API with auth (transfer vouchers)")
        print(f"  - /login (POST) - Basic login")
        print(f"  - /graphql (POST) - GraphQL API (posts)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()