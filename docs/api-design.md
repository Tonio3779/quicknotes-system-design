# QuickNotes REST API Design

## 1. Overview

QuickNotes is a note-taking service that allows authenticated users to
create, read, update, delete, and organize notes with tags.

- API style: REST over HTTPS
- Base URL: `https://api.quicknotes.example/v1`
- Data format: JSON
- Authentication: Bearer access tokens
- Character encoding: UTF-8
- Dates: ISO 8601 in UTC
- API version: v1

The example domain is a placeholder and must be replaced before deployment.

## 2. Authentication

Protected endpoints require the following header:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

Users may access only resources they own or are explicitly authorized
to access. The backend must verify ownership on every protected request.

## 3. Endpoint definitions

| Method | Path                              | Description                         | Success status |
| ------ | --------------------------------- | ----------------------------------- | -------------- |
| POST   | `/v1/auth/register`               | Register a user                     | 201 Created    |
| POST   | `/v1/auth/login`                  | Authenticate and issue a token      | 200 OK         |
| GET    | `/v1/notes`                       | List the authenticated user's notes | 200 OK         |
| POST   | `/v1/notes`                       | Create a note                       | 201 Created    |
| GET    | `/v1/notes/{noteId}`              | Retrieve a specific note            | 200 OK         |
| PATCH  | `/v1/notes/{noteId}`              | Update selected note fields         | 200 OK         |
| DELETE | `/v1/notes/{noteId}`              | Delete a note                       | 204 No Content |
| GET    | `/v1/tags`                        | List the user's tags                | 200 OK         |
| POST   | `/v1/tags`                        | Create a tag                        | 201 Created    |
| PUT    | `/v1/notes/{noteId}/tags/{tagId}` | Assign a tag to a note              | 204 No Content |
| DELETE | `/v1/notes/{noteId}/tags/{tagId}` | Remove a tag from a note            | 204 No Content |

## 4. Request and response: create a note

### Request

```http
POST /v1/notes HTTP/1.1
Host: api.quicknotes.example
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "title": "Meeting notes",
  "body": "Discuss the product launch timeline."
}
```

The title is required, must not be blank, and must contain no more than
100 characters. The body is optional.

The server obtains the user ID from the authenticated identity rather
than trusting a user ID supplied in the request body.

### Successful response

Status: `201 Created`

```json
{
  "data": {
    "id": "note_101",
    "userId": "user_42",
    "title": "Meeting notes",
    "body": "Discuss the product launch timeline.",
    "createdAt": "2026-10-10T12:00:00Z",
    "updatedAt": "2026-10-10T12:00:00Z"
  }
}
```

The server generates the ID and timestamps. The actual values depend
on the stored record.

The response should also include a `Location` header pointing to the
new resource, for example `/v1/notes/note_101`.

## 5. Request and response: list notes

### Request

```http
GET /v1/notes?limit=20&cursor=eyJpZCI6MTAwfQ==
Authorization: Bearer <access_token>
Accept: application/json
```

The `limit` parameter specifies the maximum number of records returned.
The `cursor` parameter is optional and identifies the next page.

### Successful response

Status: `200 OK`

```json
{
  "data": [
    {
      "id": "note_101",
      "userId": "user_42",
      "title": "Meeting notes",
      "body": "Discuss the product launch timeline.",
      "createdAt": "2026-10-10T12:00:00Z",
      "updatedAt": "2026-10-10T12:00:00Z"
    },
    {
      "id": "note_100",
      "userId": "user_42",
      "title": "Shopping list",
      "body": "Milk, bread, and eggs.",
      "createdAt": "2026-10-09T10:00:00Z",
      "updatedAt": "2026-10-09T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

An empty collection returns `200 OK` with `"data": []`, not `404`.

## 6. Updating a note

Request:

```http
PATCH /v1/notes/note_101
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "title": "Updated meeting notes"
}
```

Success: `200 OK`, with the updated note in the response body.

Only supplied fields are changed. The server validates the title,
updates `updatedAt`, and verifies note ownership.

## 7. Deleting a note

Request:

```http
DELETE /v1/notes/note_101
Authorization: Bearer <access_token>
```

Success: `204 No Content`. The response has no JSON body.

The operation is scoped to the authenticated user. A note belonging
to another user must never be deleted.

## 8. Authentication endpoints

### Register

`POST /v1/auth/register`

Example request:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password"
}
```

Success: `201 Created`. Return the new user's public profile and
appropriate authentication information. Never return the password
or password hash.

### Login

`POST /v1/auth/login`

Example request:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password"
}
```

Success: `200 OK`.

Example response:

```json
{
  "data": {
    "accessToken": "<access_token>",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

Passwords must be stored using an appropriate password-hashing
algorithm, never as plain text. Production authentication should
include rate limiting and secure token handling.

## 9. Error status codes

| Status | Name                   | When it is returned                                  |
| ------ | ---------------------- | ---------------------------------------------------- |
| 400    | Bad Request            | Malformed JSON, missing title, or invalid fields     |
| 401    | Unauthorized           | Missing, invalid, or expired authentication token    |
| 403    | Forbidden              | Authenticated user lacks permission for an operation |
| 404    | Not Found              | Requested resource does not exist                    |
| 409    | Conflict               | Duplicate email or conflicting resource operation    |
| 413    | Content Too Large      | Request exceeds the configured size limit            |
| 415    | Unsupported Media Type | Request is not sent as supported JSON                |
| 422    | Unprocessable Entity   | Valid JSON fails semantic validation                 |
| 429    | Too Many Requests      | Rate limit exceeded                                  |
| 500    | Internal Server Error  | Unexpected server failure                            |
| 503    | Service Unavailable    | Service is temporarily unavailable                   |

The backend must distinguish authentication failures from authorization
failures and must not disclose private records through error messages.

## 10. Example error response

Status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must not exceed 100 characters."
      }
    ],
    "requestId": "req_abc123"
  }
}
```

The `requestId` allows support staff to correlate a client error with
server logs. Internal stack traces, SQL statements, credentials, and
other sensitive information must never be exposed to clients.

## 11. API conventions and security

- Require HTTPS in production.
- Validate all request fields on the server, even if the client validates them.
- Enforce resource ownership on every read, update, and delete.
- Use pagination for collection endpoints.
- Apply request size limits and rate limiting.
- Return consistent JSON error envelopes for non-empty error responses.
- Log operational details without logging passwords or access tokens.
- Use parameterized SQL statements to prevent SQL injection.
- Define and test a stable API contract before releasing changes.
- Use appropriate CORS rules when the browser client is hosted separately.
- Consider idempotency keys for retried operations that create resources.

## 12. Implementation notes

The API client in the project root uses JSONPlaceholder as a practice
service. Its `/posts` routes are not the production endpoints documented
here. A real backend must implement authentication, ownership checks,
database persistence, validation, pagination, and the documented
response formats before this contract can be used in production.
