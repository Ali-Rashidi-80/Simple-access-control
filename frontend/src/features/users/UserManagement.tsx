import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { api } from '../../utils/api';

interface User {
    id: number;
    name: string;
    role: string;
    rfid_tag: string;
    avatar_url?: string;
    created_at: string;
}

const UserManagement = () => {
    const { lastUnknownTag, clearUnknownTag } = useWebSocket();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [rfid, setRfid] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Fetch Users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.get<User[]>('/users/');
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle Live Registration
    useEffect(() => {
        if (lastUnknownTag) {
            toast('New Card Detected!', {
                description: `UID: ${lastUnknownTag.uid}`,
                action: {
                    label: 'Register User',
                    onClick: () => {
                        setRfid(lastUnknownTag.uid);
                        setIsFormOpen(true);
                        clearUnknownTag();
                    }
                },
                duration: 10000, // Stay longer
            });
        }
    }, [lastUnknownTag, clearUnknownTag]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users/', {
                name,
                role: 'user', // Default role
                rfid_tag: rfid
            });

            toast.success("User created successfully");
            setIsFormOpen(false);
            setName("");
            setRfid("");
            fetchUsers();
        } catch (error: any) {
            toast.error(`Error: ${error.message || 'Failed to create'}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success("User deleted");
            fetchUsers();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">User Management</h1>
                <Button onClick={() => setIsFormOpen(true)}>Add User</Button>
            </div>

            {/* Add User Modal/Form (Simple Inline for now) */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg w-full max-w-md space-y-4">
                        <h2 className="text-xl font-bold text-white">Add New User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400">Name</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400">RFID Tag</label>
                                <div className="flex gap-2">
                                    <input
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-mono"
                                        value={rfid}
                                        onChange={e => setRfid(e.target.value)}
                                        required
                                    />
                                    <Button type="button" variant="secondary" onClick={() => setRfid(lastUnknownTag?.uid || "")} disabled={!lastUnknownTag}>
                                        Auto-Fill
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Scan a tag to auto-detect or wait for notification.</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                                <Button type="submit">Create User</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Table */}
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-black/40">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50">
                        <tr className="text-slate-400">
                            <th className="p-3">ID</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">RFID Tag</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-800/20">
                                <td className="p-3 text-slate-500">{user.id}</td>
                                <td className="p-3 font-medium text-white">{user.name}</td>
                                <td className="p-3">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">{user.role}</span>
                                </td>
                                <td className="p-3 font-mono text-slate-400">{user.rfid_tag}</td>
                                <td className="p-3 text-right">
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)} className="h-8">Delete</Button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
