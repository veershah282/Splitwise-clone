import React, { useState, useContext } from 'react';
import { ArrowLeft, Plus, X, Users, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function CreateEntity() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [members, setMembers] = useState([]);
    const [currentMember, setCurrentMember] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const addMember = () => {
        const trimmed = currentMember.trim().toLowerCase();
        if (trimmed) {
            if (trimmed === user?.email?.toLowerCase()) {
                setError('You are already the creator of this group');
                return;
            }
            if (members.includes(trimmed)) {
                setError('This user is already added');
                return;
            }
            setMembers([...members, trimmed]);
            setCurrentMember('');
            setError('');
        }
    };

    const removeMember = (index) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            await api.post('/groups', { name, members });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Create a new group</h1>
            </header>

            <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6">
                <div className="w-full max-w-md space-y-8">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-splitwise-green/10 rounded-2xl flex items-center justify-center text-splitwise-green">
                                <Users className="w-8 h-8" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">Group Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter group name"
                                    className="w-full border-b-2 border-gray-200 focus:border-splitwise-green outline-none py-1 text-lg font-medium transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Members</h3>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Add anyone else</span>
                            </div>

                            <div className="space-y-2">
                                {/* Explicit Creator Row */}
                                <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-sm ring-1 ring-emerald-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-splitwise-green rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {user?.name?.[0]?.toUpperCase() || 'Y'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-sm">{user?.name} (You)</span>
                                            <span className="text-[10px] text-splitwise-green font-bold uppercase tracking-tight">Group Creator</span>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 bg-emerald-100/50 text-emerald-600 rounded-lg">
                                        <UserIcon className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {members.map((member, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm animate-in slide-in-from-left-2 duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-xs font-bold">
                                                {member[0].toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-800 text-sm">{member}</span>
                                        </div>
                                        <button type="button" onClick={() => removeMember(index)} className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={currentMember}
                                    onChange={(e) => setCurrentMember(e.target.value)}
                                    placeholder="Registered email address"
                                    className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-splitwise-green/20 outline-none transition-all"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            if (emailRegex.test(currentMember.trim())) {
                                                addMember();
                                            } else {
                                                setError('Please enter a valid email address');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        if (emailRegex.test(currentMember.trim())) {
                                            addMember();
                                        } else {
                                            setError('Please enter a valid email address');
                                        }
                                    }}
                                    className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl text-gray-600 transition-colors"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">Note: Only registered users can be added to groups.</p>
                        </div>

                        <div className="pt-8">
                            <button
                                type="submit"
                                className="w-full bg-splitwise-green hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
                                disabled={!name || isSaving}
                            >
                                {isSaving ? 'Creating...' : 'Save Group'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
