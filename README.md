# QuickNotes

QuickNotes is a lightweight note-taking application and system-design
project. It demonstrates how a browser client communicates with a REST
API and documents a proposed backend architecture for a service
targeting one million registered users.

## Features

- Load notes from JSONPlaceholder using GET.
- Create notes using POST with JSON request bodies.
- Delete notes using DELETE.
- Validate required titles and enforce a 100-character maximum.
- Disable action buttons while requests are running.
- Display loading, success, error, and empty states.
- Render note content safely using `textContent`.
- Document a production REST API, relational data model, and scalable
  system architecture.

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- JSONPlaceholder practice API
- PostgreSQL proposed for production
- Markdown and Mermaid for design documentation
- Git and GitHub

## Project structure

```text
quicknotes-app/
├── index.html
├── api.js
├── style.css
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## How to run the API client

1. Clone this repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/quicknotes-app.git
   ```

2. Enter the project directory:

   ```bash
   cd quicknotes-app
   ```

3. Open the folder in Visual Studio Code:

   ```bash
   code .
   ```

4. Install the Live Server extension in VS Code if needed.

5. Right-click `index.html` and select **Open with Live Server**.

6. Click **Load notes** to retrieve posts. Use the form to create a
   note and each note's Delete button to simulate deletion.

An internet connection is required for the practice API.

## API client behavior

The client uses:

`https://jsonplaceholder.typicode.com/posts`

- GET loads up to 10 practice posts.
- POST sends a title, body, and `userId: 1`.
- DELETE sends a request for the selected post.
- Errors display a user-friendly message.
- The interface disables action buttons during active requests.
- The title must not be blank and cannot exceed 100 characters.

**Important:** JSONPlaceholder is a mock API. Its successful POST and
DELETE responses do not permanently modify its stored data. The client
updates its local in-memory collection after successful responses, so
changes are temporary and are lost when the page is refreshed.

The client is a demonstration, not a production persistence layer.

## System design documents

- [API Design](docs/api-design.md) — endpoints, HTTP methods, request
  and response examples, status codes, and API conventions.
- [Data Model](docs/data-model.md) — entities, SQL schema, relationships,
  queries, indexes, and database selection.
- [Architecture](docs/architecture.md) — requirements, one-million-user
  load estimates, architecture diagram, request flows, trade-offs, and
  resilience.

## Production architecture

The proposed production system uses authenticated REST endpoints,
stateless application servers, Redis caching, PostgreSQL with a read
replica, a durable job queue, and background workers.

The documents describe the proposed design. These backend components
are not implemented by the browser-only practice client.

## What I learned

1. **API integration:** How to use JavaScript `fetch()` with GET, POST,
   and DELETE requests, JSON request bodies, and HTTP response statuses.
2. **Asynchronous programming:** How `async`/`await`, error handling,
   and `finally` keep the interface responsive and restore button states.
3. **Input validation and safe rendering:** Why validation is required
   on both client and server, and why `textContent` is safer than
   inserting untrusted text through `innerHTML`.
4. **REST API design:** How HTTP methods, resource paths, status codes,
   pagination, and consistent error responses create a predictable API.
5. **Relational database design:** How primary keys, foreign keys,
   constraints, indexes, and junction tables preserve data integrity.
6. **Scalable architecture:** How caching, read replicas, queues,
   monitoring, and redundant instances help address performance and
   reliability requirements.
7. **Git workflow:** How meaningful commits record development stages
   and make changes easier to review.

## Limitations and future improvements

- Replace JSONPlaceholder with a real backend and persistent database.
- Add user registration, authentication, and authorization.
- Add automated tests for validation, rendering, API failures, and
  loading states.
- Add tag management, pagination, and server-side search.
- Add CI checks, deployment automation, monitoring, and alerting.

## License

This project is intended for educational use. Add a license file if
you intend to distribute it under a specific open-source license.
