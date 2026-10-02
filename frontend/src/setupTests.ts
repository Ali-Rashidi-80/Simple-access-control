import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Define handlers (can be moved to a handlers.ts file)
export const handlers = [
    http.get('*/users', () => {
        return HttpResponse.json([
            { id: 1, name: 'Test User', role: 'admin' }
        ])
    }),
    // Match both /users and /users/
    http.post('*/users/', async () => {
        return HttpResponse.json({ success: true }, { status: 200 })
    }),
    http.post('*/users', async () => {
        return HttpResponse.json({ success: true }, { status: 200 })
    }),
]

const server = setupServer(...handlers);

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
