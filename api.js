'use strict';

const API_BASE_URL = 'https://jsonplaceholder.typicode.com/posts';

const noteForm = document.querySelector('#note-form');
const titleInput = document.querySelector('#note-title');
const bodyInput = document.querySelector('#note-body');
const titleCount = document.querySelector('#title-count');
const createButton = document.querySelector('#create-button');
const loadButton = document.querySelector('#load-button');
const notesList = document.querySelector('#notes-list');
const statusMessage = document.querySelector('#status-message');

let notes = [];
let activeRequests = 0;

function setStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.hidden = false;
}

function clearStatus() {
    statusMessage.textContent = '';
    statusMessage.hidden = true;
    statusMessage.className = 'status-message';
}

function updateButtons() {
    const isBusy = activeRequests > 0;

    createButton.disabled = isBusy;
    loadButton.disabled = isBusy;

    document.querySelectorAll('.delete-button').forEach((button) => {
        button.disabled = isBusy;
    });

    createButton.textContent = isBusy ? 'Please wait...' : 'Create note';
    loadButton.textContent = isBusy ? 'Loading...' : 'Load notes';
}

function startRequest() {
    activeRequests += 1;
    updateButtons();
}

function finishRequest() {
    activeRequests = Math.max(0, activeRequests - 1);
    updateButtons();
}

function getErrorMessage(error) {
    if (error instanceof TypeError) {
        return 'Unable to reach the server. Check your internet connection and try again.';
    }

    return error.message || 'Something went wrong. Please try again.';
}

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = new Error(
            `The server returned an error (HTTP ${response.status}). Please try again.`
        );
        error.status = response.status;
        throw error;
    }

    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const data = await response.json();
    return { data, status: response.status };
}

function renderEmptyState(message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '✎';

    const heading = document.createElement('h3');
    heading.textContent = 'No notes to show';

    const description = document.createElement('p');
    description.textContent = message;

    emptyState.append(icon, heading, description);
    notesList.replaceChildren(emptyState);
}

function renderNotes() {
    if (notes.length === 0) {
        renderEmptyState('Your collection is empty. Create a note to get started.');
        return;
    }

    const fragment = document.createDocumentFragment();

    notes.forEach((note) => {
        const card = document.createElement('article');
        card.className = 'note-card';

        const heading = document.createElement('h3');
        // Use textContent, never innerHTML, for API or user-supplied text.
        heading.textContent = note.title || 'Untitled note';

        const body = document.createElement('p');
        body.className = 'note-body';
        body.textContent = note.body || 'No body provided.';

        const footer = document.createElement('div');
        footer.className = 'note-footer';

        const id = document.createElement('span');
        id.className = 'note-id';
        id.textContent = `Note ID: ${String(note.id)}`;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.setAttribute('aria-label', `Delete note ${String(note.id)}`);
        deleteButton.addEventListener('click', () => deleteNote(note.id));

        footer.append(id, deleteButton);
        card.append(heading, body, footer);
        fragment.append(card);
    });

    notesList.replaceChildren(fragment);
    updateButtons();
}

async function loadNotes() {
    startRequest();
    setStatus('Loading notes...', 'info');

    try {
        const result = await request(`${API_BASE_URL}?_limit=10`);

        notes = Array.isArray(result.data) ? result.data : [];
        renderNotes();

        if (notes.length === 0) {
            setStatus('The server returned no notes.', 'info');
        } else {
            setStatus(`Loaded ${notes.length} notes from the server.`, 'success');
        }
    } catch (error) {
        setStatus(getErrorMessage(error), 'error');
    } finally {
        finishRequest();
    }
}

async function createNote(event) {
    event.preventDefault();
    clearStatus();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        setStatus('Please enter a title for your note.', 'error');
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        setStatus('The title cannot exceed 100 characters.', 'error');
        titleInput.focus();
        return;
    }

    startRequest();
    setStatus('Creating your note...', 'info');

    try {
        const result = await request(API_BASE_URL, {
            method: 'POST',
            body: JSON.stringify({
                title,
                body,
                userId: 2
            })
        });

        const createdNote = result.data;

        // JSONPlaceholder simulates POST responses but does not persist new records.
        // Keep the returned note in local UI state so the demo remains usable.
        notes = [createdNote, ...notes];
        renderNotes();

        noteForm.reset();
        titleCount.textContent = '0/100';

        setStatus(
            `Note created (status ${result.status}, id ${createdNote.id}).`,
            'success'
        );
    } catch (error) {
        setStatus(getErrorMessage(error), 'error');
    } finally {
        finishRequest();
    }
}

async function deleteNote(noteId) {
    startRequest();
    setStatus(`Deleting note ${String(noteId)}...`, 'info');

    try {
        const result = await request(`${API_BASE_URL}/${encodeURIComponent(noteId)}`, {
            method: 'DELETE'
        });

        // JSONPlaceholder simulates deletion without changing its stored data.
        // Remove the note locally only after the simulated request succeeds.
        notes = notes.filter((note) => String(note.id) !== String(noteId));
        renderNotes();

        const detail = result.status === 204
            ? 'The server confirmed deletion.'
            : 'The demo server accepted the deletion request.';

        setStatus(`Note ${String(noteId)} deleted. ${detail}`, 'success');
    } catch (error) {
        setStatus(getErrorMessage(error), 'error');
    } finally {
        finishRequest();
    }
}

titleInput.addEventListener('input', () => {
    titleCount.textContent = `${titleInput.value.length}/100`;
});

noteForm.addEventListener('submit', createNote);
loadButton.addEventListener('click', loadNotes);

// Display the initial empty state before the first request.
renderEmptyState('Select “Load notes” to retrieve notes from the server.');