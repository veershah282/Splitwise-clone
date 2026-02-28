import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    DollarSign,
    Receipt,
    ReceiptText,
    Users,
    X,
    ChevronDown,
    Plus
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function AddExpense() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const toast = useToast();

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(id || location.state?.id || '');
    const [members, setMembers] = useState([]);
    const [splitMode, setSplitMode] = useState('equal');
    const [manualSplits, setManualSplits] = useState({});
    const [paidBy, setPaidBy] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await api.get('/groups');
                setGroups(res.data);
            } catch (err) {
                console.error('Error fetching groups:', err);
            }
        };
        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroupId) {
            const fetchGroupMembers = async () => {
                try {
                    const res = await api.get(`/groups/${selectedGroupId}`);
                    setMembers(res.data.members || []);
                    // Reset splits when group changes
                    setSplitMode('equal');
                    setManualSplits({});
                    setPaidBy('');
                } catch (err) {
                    toast.error('Failed to load group members');
                }
            };
            fetchGroupMembers();
        } else {
            setMembers([]);
        }
    }, [selectedGroupId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const totalAmount = parseFloat(amount);
        if (!totalAmount || isNaN(totalAmount)) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!selectedGroupId) {
            toast.error('Please select a group');
            return;
        }

        if (!paidBy) {
            toast.error('Please select who paid');
            return;
        }

        let splitDetails = [];
        if (splitMode === 'equal') {
            const share = Math.round((totalAmount / members.length) * 100) / 100;
            splitDetails = members.map(m => ({ user: m._id, amount: share }));
        } else {
            let manualSum = 0;
            for (const m of members) {
                const val = parseFloat(manualSplits[m._id] || 0);
                manualSum += val;
                splitDetails.push({ user: m._id, amount: val });
            }
            if (Math.abs(manualSum - totalAmount) > 0.01) {
                toast.error(`Total of splits ($${manualSum.toFixed(2)}) must equal total amount ($${totalAmount.toFixed(2)})`);
                return;
            }
        }

        setIsSaving(true);
        try {
            await api.post('/expenses', {
                description,
                amount: totalAmount,
                groupId: selectedGroupId,
                paidBy: paidBy,
                splitDetails
            });
            toast.success('Expense added successfully!');
            navigate(-1);
        } catch (err) {
            toast.error(err.message || 'Failed to add expense');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Add an expense</h1>
                </div>
            </header>

            <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="p-8 space-y-8">
                        {/* Group Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-splitwise-green">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Group</label>
                                    <select
                                        value={selectedGroupId}
                                        onChange={(e) => setSelectedGroupId(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-gray-700 focus:ring-2 focus:ring-splitwise-green outline-none appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Select a group...</option>
                                        {groups.map(g => (
                                            <option key={g._id} value={g._id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Top Section: Description & Amount */}
                        <div className="space-y-6">
                            <div className="relative">
                                <ReceiptText className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-200" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter a description"
                                    className="w-full pl-12 pr-4 py-4 border-b-2 border-gray-100 focus:border-splitwise-green outline-none text-2xl font-bold placeholder:text-gray-200 transition-all"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 font-bold text-2xl">
                                    ₹
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        step="1"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full py-2 border-b-2 border-gray-100 focus:border-splitwise-green outline-none text-4xl font-black placeholder:text-gray-200 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Paid By Section */}
                        {members.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-splitwise-green">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Paid By</label>
                                        <select
                                            value={paidBy}
                                            onChange={(e) => setPaidBy(e.target.value)}
                                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-gray-700 focus:ring-2 focus:ring-splitwise-green outline-none appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Select payer...</option>
                                            {members.map(m => (
                                                <option key={m._id} value={m._id}>{m.name === user.name ? 'You' : m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Split Logic Card */}
                        {members.length > 0 && (
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-4 h-4 text-splitwise-green" />
                                        Split With
                                    </h3>
                                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setSplitMode('equal')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded ${splitMode === 'equal' ? 'bg-splitwise-green text-white' : 'text-gray-400'}`}
                                        >
                                            Equal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSplitMode('exact')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded ${splitMode === 'exact' ? 'bg-splitwise-green text-white' : 'text-gray-400'}`}
                                        >
                                            Exact
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {members.map(m => (
                                        <div key={m._id} className="flex items-center justify-between group/member">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {m.name[0]}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{m.name} {m._id === user.id && '(you)'}</span>
                                            </div>
                                            {splitMode === 'equal' ? (
                                                <span className="text-sm font-bold text-gray-400">
                                                    ₹{amount ? Math.round(parseFloat(amount) / members.length) : '0'}
                                                </span>
                                            ) : (
                                                <div className="relative w-28">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={manualSplits[m._id] || ''}
                                                        onChange={(e) => setManualSplits({ ...manualSplits, [m._id]: e.target.value })}
                                                        placeholder="0.00"
                                                        className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-splitwise-green outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-gray-50 border-t flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-3 py-4 bg-splitwise-green text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-500 hover:shadow-emerald-200 transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
