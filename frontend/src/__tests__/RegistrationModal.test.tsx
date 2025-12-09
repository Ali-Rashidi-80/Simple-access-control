import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RegistrationModal } from '../features/users/components/RegistrationModal';
import { LanguageProvider } from '../contexts/LanguageContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

// Mock dependencies using vi.hoisted to avoid hoisting issues
const { mockUseWebSocket, mockToast } = vi.hoisted(() => {
    return {
        mockUseWebSocket: {
            lastUnknownTag: { uid: '12345', timestamp: '2023-01-01' },
            clearUnknownTag: vi.fn(),
            sendMessage: vi.fn(),
            isConnected: true,
            logs: []
        },
        mockToast: {
            success: vi.fn(),
            error: vi.fn(),
        }
    }
});

vi.mock('../contexts/WebSocketContext', async () => {
    const actual = await vi.importActual('../contexts/WebSocketContext');
    return {
        ...actual,
        useWebSocket: () => mockUseWebSocket,
        WebSocketProvider: ({ children }: any) => <div>{children}</div>
    };
});

// Toaster
vi.mock('sonner', () => ({
    toast: mockToast
}));

const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <LanguageProvider>
            {component}
        </LanguageProvider>
    );
};

describe('RegistrationModal Component', () => {
    it('renders correctly when open', () => {
        renderWithProviders(
            <RegistrationModal
                isOpen={true}
                onClose={() => { }}
                onSuccess={() => { }}
            />
        );

        expect(screen.getByText(/Register New Card|ثبت کارت جدید/i)).toBeInTheDocument();
        // Check if initial RFID from mock context is displayed
        expect(screen.getByText('12345')).toBeInTheDocument();
    });

    it('validates form inputs', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <RegistrationModal
                isOpen={true}
                onClose={() => { }}
                onSuccess={() => { }}
            />
        );

        // Wait for RFID from WebSocket mock to populate
        await screen.findByText('12345');

        // Attempt save with empty name (RFID is present from mock)
        const saveButton = screen.getByRole('button', { name: /save|ثبت/i });
        expect(saveButton).not.toBeDisabled();

        // Name is empty by default
        await user.click(saveButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/required|وارد کنید|نام/i));
        });
    });

    it('submits data successfully', async () => {
        const user = userEvent.setup();
        const mockOnSuccess = vi.fn();
        const mockOnClose = vi.fn();

        renderWithProviders(
            <RegistrationModal
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
                initialRfid="12345"
            />
        );

        // Wait for RFID to render
        await screen.findByText('12345');

        screen.debug(); // Debug DOM to see button state

        // Fill Name
        const nameInput = screen.getByPlaceholderText(/enter name|نام را وارد کنید/i);
        await user.type(nameInput, 'John Doe');

        // Click Save
        const saveButton = screen.getByRole('button', { name: /save|ثبت/i });
        expect(saveButton).not.toBeDisabled();
        await user.click(saveButton);

        // Wait for API call (handled by MSW)
        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
            // Using mockClearUnknownTag from global mock setup logic if accessible,
            // or relying on onSuccess as primary indicator.
            // logic in component: if (lastUnknownTag && lastUnknownTag.uid === rfid) clearUnknownTag()
        });
    });
});
