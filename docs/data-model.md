# QuickNotes Data Model

## 1. Database selection

QuickNotes will use PostgreSQL, a relational SQL database.

The application has structured entities, clear ownership rules, and
relationships between users, notes, and tags. PostgreSQL supports
foreign keys, transactions, unique constraints, indexing, and
consistent updates to related records.

These features are valuable when a note is created, assigned tags,
updated, or deleted. A document database could also work, but the
relational model avoids duplicating tag information across many notes
and makes integrity constraints easier to enforce.

## 2. Entity overview

The database contains four primary entities:

1. `users`: accounts that own notes and tags.
2. `notes`: individual notes created by users.
3. `tags`: labels owned by users.
4. `note_tags`: junction table connecting notes and tags.

PostgreSQL `BIGINT GENERATED ALWAYS AS IDENTITY` is used for numeric
primary keys. `TIMESTAMPTZ` stores timezone-aware timestamps.

## 3. Relationships

### Users and notes: one-to-many

One user can create many notes, but each note belongs to exactly one
user. `notes.user_id` references `users.id`.

### Users and tags: one-to-many

One user can define many tags, but each tag belongs to one user.
`tags.user_id` references `users.id`.

### Notes and tags: many-to-many

One note can have multiple tags, and one tag can be applied to multiple
notes. The `note_tags` junction table represents this relationship.

Its composite primary key `(note_id, tag_id)` prevents duplicate
assignments of the same tag to the same note.

## 4. SQL table definitions

The following statements target PostgreSQL. Create the tables in the
order shown because foreign keys depend on earlier tables.

### 4.1 Users

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Columns:

- `id`: unique primary key.
- `email`: required, unique account email.
- `password_hash`: securely generated password hash.
- `display_name`: public display name.
- `created_at`: account creation timestamp.
- `updated_at`: last account update timestamp.

### 4.2 Notes

```sql
CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_title_not_blank
        CHECK (LENGTH(BTRIM(title)) > 0),

    CONSTRAINT notes_unique_user_id_id
        UNIQUE (user_id, id)
);
```

Columns:

- `id`: unique note primary key.
- `user_id`: owner of the note; foreign key to `users.id`.
- `title`: required, non-blank title of at most 100 characters.
- `body`: optional note content represented as an empty string when omitted.
- `created_at`: note creation timestamp.
- `updated_at`: last note update timestamp.

### 4.3 Tags

```sql
CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tags_name_not_blank
        CHECK (LENGTH(BTRIM(name)) > 0),

    CONSTRAINT tags_unique_name_per_user
        UNIQUE (user_id, name),

    CONSTRAINT tags_unique_user_id_id
        UNIQUE (user_id, id)
);
```

Columns:

- `id`: unique tag primary key.
- `user_id`: owner of the tag.
- `name`: tag label, unique for each user.
- `created_at`: tag creation timestamp.

### 4.4 Note-tags junction table

```sql
CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    PRIMARY KEY (note_id, tag_id),

    CONSTRAINT note_tags_note_owner_fk
        FOREIGN KEY (user_id, note_id)
        REFERENCES notes(user_id, id)
        ON DELETE CASCADE,

    CONSTRAINT note_tags_tag_owner_fk
        FOREIGN KEY (user_id, tag_id)
        REFERENCES tags(user_id, id)
        ON DELETE CASCADE
);
```

Columns:

- `note_id`: referenced note.
- `tag_id`: referenced tag.
- `user_id`: common owner of the note and tag.

The composite foreign keys ensure that a tag cannot be assigned to a
note belonging to a different user. The referenced composite keys are
declared in the parent tables.

## 5. Example SQL queries

### Query 1: List a user's notes

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC, id DESC
LIMIT 20;
```

`$1` is a parameter supplied by the database driver. The application
must obtain the user ID from the authenticated identity.

### Query 2: Retrieve one note and verify ownership

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE id = $1
  AND user_id = $2;
```

If no row is returned, the application can return `404 Not Found`
without revealing whether another user's note exists.

### Query 3: JOIN notes, tags, and note_tags

```sql
SELECT
    n.id AS note_id,
    n.title,
    t.id AS tag_id,
    t.name AS tag_name
FROM notes AS n
JOIN note_tags AS nt
    ON nt.note_id = n.id
   AND nt.user_id = n.user_id
JOIN tags AS t
    ON t.id = nt.tag_id
   AND t.user_id = nt.user_id
WHERE n.user_id = $1
ORDER BY n.id, t.name;
```

This JOIN retrieves each note with its assigned tags. Notes without
tags are omitted; a `LEFT JOIN` can be used to include them.

### Query 4: Create a note

```sql
INSERT INTO notes (user_id, title, body)
VALUES ($1, $2, $3)
RETURNING id, user_id, title, body, created_at, updated_at;
```

The application validates the input before execution and derives the
owner ID from the authenticated user.

### Query 5: Assign a tag to a note

```sql
INSERT INTO note_tags (note_id, tag_id, user_id)
VALUES ($1, $2, $3)
ON CONFLICT (note_id, tag_id) DO NOTHING;
```

The composite foreign keys verify that the note and tag have the same
owner. The conflict clause makes repeated assignment safe.

## 6. Indexes

```sql
CREATE INDEX idx_notes_user_updated
ON notes (user_id, updated_at DESC, id DESC);
```

Reason: the main notes-listing query filters by `user_id` and sorts
by `updated_at` and `id`. This index can reduce the amount of data
PostgreSQL must scan and sort for common list requests.

The unique constraints also create indexes for users' email addresses
and users' tag names. PostgreSQL automatically indexes primary keys.

The `note_tags` primary key starts with `note_id`. Add a reverse index
to efficiently find all notes associated with a particular tag:

```sql
CREATE INDEX idx_note_tags_tag_note
ON note_tags (tag_id, note_id);
```

Indexes speed up relevant reads but consume storage and add overhead
to inserts, updates, and deletes. Monitor query plans before adding
more indexes.

## 7. Data integrity and operational considerations

- Use transactions when multiple database operations must succeed together.
- Set `updated_at` when a note is modified, using application logic or a trigger.
- Validate titles in the API as well as enforcing the database constraints.
- Use parameterized queries rather than string concatenation.
- Back up the database and test restoration procedures.
- Apply schema changes through reviewed database migrations.
- Keep database credentials outside source control.
- Restrict access so application users cannot query other users' private notes.
- Define retention and recovery policies before production launch.

The foreign-key cascades ensure that deleting a user removes the user's
notes, tags, and note-tag assignments. This is a deliberate lifecycle
decision and should be covered by tests.

## 8. SQL versus NoSQL: final justification

PostgreSQL is the preferred starting point because QuickNotes requires
reliable ownership constraints, unique values, joins, and transactional
writes across related entities. Its indexes and read-replica support
also fit the anticipated read-heavy workload. PostgreSQL can scale
through query optimization, caching, read replicas, and vertical
scaling before more complex distributed database designs are needed.
A NoSQL database could become appropriate if future requirements
include highly variable document structures or a different distribution
model, but that complexity is not justified for the initial system.
