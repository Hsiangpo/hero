# API Design Guide

1.  **Endpoint Naming**:
    - Use plural nouns for resources (e.g., `/api/v1/heroes`).
    - Use kebab-case for paths.
2.  **Standard JSON Response**:
    - **Success**: `{ "success": true, "data": { ... } }`
    - **Error**: `{ "success": false, "error": { "code": 1001, "message": "Insufficient funds." } }`
3.  **Authentication**:
    - All requests must include an `Authorization: Bearer <token>` header, except for `/login` and `/register`.