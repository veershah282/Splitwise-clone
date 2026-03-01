import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Users,
    Receipt,
    Trash2,
    X,
    ReceiptText,
    TrendingUp,
    History,
    ArrowRightLeft,
    HandCoins
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function GroupDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const toast = useToast();

    const [group, setGroup] = useState(null);
    const [combinedActivity, setCombinedActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Expense State
    const [showAddForm, setShowAddForm] = useState(false);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [splitMode, setSplitMode] = useState('equal');
    const [manualSplits, setManualSplits] = useState({});
    const [paidBy, setPaidBy] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [magicInput, setMagicInput] = useState('');
    const [isParsingMagic, setIsParsingMagic] = useState(false);

    // Settlement state (Now as a modal only, no tab)
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settleAmount, setSettleAmount] = useState('');
    const [settleToUser, setSettleToUser] = useState('');
    const [settleNote, setSettleNote] = useState('');

    useEffect(() => {
        fetchGroupData();
    }, [id]);

    useEffect(() => {
        if (group && splitMode === 'exact') {
            const initialSplits = {};
            group.members.forEach(m => {
                initialSplits[m._id] = '';
            });
            setManualSplits(initialSplits);
        }
    }, [splitMode, group]);

    const fetchGroupData = async () => {
        try {
            const [groupRes, expensesRes, settlementsRes] = await Promise.all([
                api.get(`/groups/${id}`),
                api.get(`/expenses/group/${id}`),
                api.get(`/settlements/group/${id}`)
            ]);

            setGroup(groupRes.data);

            // Merge expenses and settlements into one activity feed
            const expenses = expensesRes.data.map(e => ({ ...e, type: 'expense' }));
            const settlements = settlementsRes.data.map(s => ({ ...s, type: 'settlement' }));

            const merged = [...expenses, ...settlements].sort((a, b) =>
                new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
            );

            setCombinedActivity(merged);
        } catch (err) {
            console.error('Error fetching group data:', err);
            toast.error('Failed to load group details');
        } finally {
            setLoading(false);
        }
    };

    const handleMagicParse = async (e) => {
        e.preventDefault();
        if (!magicInput.trim()) return;
        setIsParsingMagic(true);
        try {
            const res = await api.post('/ai/parse-expense', {
                text: magicInput,
                groupId: id
            });
            const data = res.data.parsed;

            if (data.description) setDescription(data.description);
            if (data.amount) setAmount(data.amount.toString());

            if (data.payer) {
                const searchName = data.payer.toLowerCase();
                if (searchName === 'me' || searchName === user.name.toLowerCase()) {
                    setPaidBy(user.id);
                } else {
                    const match = group.members.find(m => m.name.toLowerCase().includes(searchName));
                    if (match) setPaidBy(match._id);
                }
            }
            if (data.splitType && data.splitType.toLowerCase() === 'exact') {
                setSplitMode('exact');
            } else {
                setSplitMode('equal');
            }
            if (data.isFallback) {
                if (data.warning === 'rate limit exceeded') {
                    toast.error('rate limit exceeded');
                } else {
                    toast.warning(data.warning || 'AI is temporarily unavailable, using fallback data.');
                }
            } else {
                toast.success('Magic Input applied!');
            }
            setMagicInput('');
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Failed to parse expense');
        } finally {
            setIsParsingMagic(false);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const totalAmount = Math.round(parseFloat(amount));
        if (!totalAmount || isNaN(totalAmount)) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!paidBy) {
            toast.error('Please select who paid');
            return;
        }

        let splitDetails = [];
        const members = group.members || [];

        if (splitMode === 'equal') {
            const share = Math.round(totalAmount / members.length);
            splitDetails = members.map(m => ({ user: m._id, amount: share }));
        } else {
            let manualSum = 0;
            for (const m of members) {
                const val = Math.round(parseFloat(manualSplits[m._id] || 0));
                manualSum += val;
                splitDetails.push({ user: m._id, amount: val });
            }

            if (Math.abs(manualSum - totalAmount) > 1) { // Small buffer for rounding
                toast.error(`The total of splits (₹${manualSum}) must equal the total amount (₹${totalAmount})`);
                return;
            }
        }

        setIsSaving(true);
        try {
            await api.post('/expenses', {
                description,
                amount: totalAmount,
                groupId: id,
                paidBy,
                splitDetails
            });

            toast.success('Expense added!');
            setDescription('');
            setAmount('');
            setSplitMode('equal');
            setPaidBy('');
            setShowAddForm(false);
            fetchGroupData();
        } catch (err) {
            toast.error(err.message || 'Failed to add expense');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteActivity = async (item) => {
        if (!window.confirm(`Delete this ${item.type}?`)) return;
        try {
            if (item.type === 'expense') {
                await api.delete(`/expenses/${item._id}`);
            } else {
                // Backend might need a delete route for settlements too, 
                // but let's assume we focus on expenses for now or it already exists.
                // If not, we skip deleting settlements for safety.
                toast.error('Settlement deletion not yet supported');
                return;
            }
            toast.success('Deleted');
            fetchGroupData();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleSettleUp = async (e) => {
        e.preventDefault();
        try {
            await api.post('/expenses', {
                description: settleNote || 'Payment',
                amount: Math.round(parseFloat(settleAmount)),
                groupId: id,
                paidBy: user.id,
                splitType: 'EXACT',
                splitDetails: [{ user: settleToUser, amount: Math.round(parseFloat(settleAmount)) }]
            });
            setShowSettleModal(false);
            setSettleAmount('');
            setSettleToUser('');
            setSettleNote('');
            fetchGroupData();
            toast.success('Payment recorded!');
        } catch (err) {
            toast.error('Failed to record payment');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-splitwise-green"></div>
            </div>
        );
    }

    if (!group) return <div className="p-8 text-center text-gray-500">Group not found</div>;

    const members = group.members || [];
    const otherMembers = members.filter(m => m._id !== user.id);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 leading-tight">{group.name}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{members.length} members</p>
                    </div>
                </div>
                {!showAddForm && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSettleModal(true)}
                            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold px-4 py-2 rounded-xl transition-all shadow-sm text-sm"
                        >
                            <HandCoins className="w-4 h-4" />
                            Settle Up
                        </button>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 bg-splitwise-green hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Expense
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">

                {/* Add Expense Form */}
                {showAddForm && (
                    <div className="bg-white p-6 rounded-3xl border shadow-xl animate-in slide-in-from-top-4 duration-300 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Add an expense</h2>
                            <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Magic Input */}
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <label className="text-[10px] font-bold text-purple-600 uppercase tracking-widest ml-1 flex items-center gap-1">
                                ✨ Magic Input
                            </label>
                            <div className="flex gap-2 mt-1">
                                <form onSubmit={(e) => handleMagicParse(e)} className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={magicInput}
                                        onChange={(e) => setMagicInput(e.target.value)}
                                        placeholder="e.g. I paid ₹500 for dinner"
                                        className="flex-1 px-4 py-3 bg-purple-50 text-purple-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-400 outline-none font-medium placeholder-purple-300"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isParsingMagic || !magicInput.trim()}
                                        className="px-6 py-3 bg-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-200 hover:bg-purple-700 hover:shadow-purple-300 transition-all disabled:opacity-50"
                                    >
                                        {isParsingMagic ? '✨...' : 'Parse'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                    <div className="relative">
                                        <ReceiptText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input
                                            autoFocus
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="What was it for?"
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-splitwise-green outline-none font-medium hover:bg-gray-100 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 font-bold">₹</span>
                                        <input
                                            type="number"
                                            step="1"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-splitwise-green outline-none font-bold text-xl hover:bg-gray-100 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Paid By</label>
                                <select
                                    value={paidBy}
                                    onChange={(e) => setPaidBy(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-splitwise-green outline-none font-medium hover:bg-gray-100 transition-colors"
                                    required
                                >
                                    <option value="">Select payer...</option>
                                    {members.map(m => (
                                        <option key={m._id} value={m._id}>{m.name === user.name ? 'You' : m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setSplitMode('equal')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${splitMode === 'equal' ? 'bg-white text-splitwise-green shadow-sm' : 'text-gray-400'}`}
                                    >
                                        Split Equally
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSplitMode('exact')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${splitMode === 'exact' ? 'bg-white text-splitwise-green shadow-sm' : 'text-gray-400'}`}
                                    >
                                        Exact Amounts
                                    </button>
                                </div>

                                {splitMode === 'exact' && (
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                        {members.map(m => (
                                            <div key={m._id} className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-splitwise-green flex items-center justify-center text-[10px] font-bold">
                                                        {m.name[0]}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 truncate">{m.name} {m._id === user.id && '(You)'}</span>
                                                </div>
                                                <div className="relative w-24">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={manualSplits[m._id] || ''}
                                                        onChange={(e) => setManualSplits({ ...manualSplits, [m._id]: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full pl-6 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-splitwise-green outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-splitwise-green text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-500 hover:shadow-emerald-200 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
                }

                {/* Group Info & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-white p-6 rounded-3xl border shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Users className="w-5 h-5 text-splitwise-green" />
                            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Team {group.name}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {members.map(member => (
                                <div key={member._id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-100 text-sm font-medium text-gray-700 group/member hover:border-splitwise-green/30 transition-all">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-splitwise-green flex items-center justify-center text-[10px] font-bold">
                                        {member.name[0].toUpperCase()}
                                    </div>
                                    <span className={member._id === user.id ? 'font-bold underline' : ''}>
                                        {member.name} {member._id === user.id && '(You)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-splitwise-green p-6 rounded-3xl text-white shadow-lg shadow-emerald-100 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <TrendingUp className="w-4 h-4 text-emerald-100" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Total Spent</span>
                        </div>
                        <p className="text-3xl font-black">
                            ₹{Math.round(combinedActivity.reduce((sum, e) => e.type === 'expense' ? sum + e.amount : sum, 0))}
                        </p>
                    </div>
                </div>

                {/* Unified Activity Feed */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Group Activity
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {combinedActivity.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl border border-dashed text-center space-y-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                                    <History className="w-8 h-8" />
                                </div>
                                <p className="text-gray-400 font-medium">No expenses or payments yet</p>
                            </div>
                        ) : (
                            combinedActivity.map((item, idx) => (
                                <div key={item._id || idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-emerald-100/50 hover:bg-emerald-50/10 transition-all flex items-center gap-4 group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${item.type === 'expense' ? 'bg-gray-50 text-gray-400 group-hover:bg-emerald-100 group-hover:text-splitwise-green' : 'bg-orange-50 text-orange-400 group-hover:bg-orange-100'}`}>
                                        {item.type === 'expense' ? <Receipt className="w-6 h-6" /> : <ArrowRightLeft className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                {item.type === 'expense' ? (
                                                    <>
                                                        <p className="font-bold text-gray-800 text-lg leading-tight truncate">{item.description}</p>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            <span className="text-[11px] font-bold text-splitwise-green bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                                {item.paidBy?.name ? (item.paidBy.name === user.name ? 'You' : item.paidBy.name) : 'Someone'} paid
                                                            </span>
                                                            <span className="text-sm font-black text-gray-900">₹{Math.round(item.amount)}</span>
                                                            <span className="text-[10px] text-gray-400 font-medium ml-1">
                                                                for {item.splitDetails?.length} people
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-bold text-orange-600 text-lg leading-tight truncate">Payment Recorded</p>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                                {item.paidBy?.name === user.name ? 'You' : item.paidBy?.name}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">paid</span>
                                                            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                                {item.paidTo?.name === user.name ? 'You' : item.paidTo?.name}
                                                            </span>
                                                            <span className="text-sm font-black text-gray-900 ml-1">₹{Math.round(item.amount)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold whitespace-nowrap pt-1 uppercase">
                                                {new Date(item.date || item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>

                                        {/* Breakdowns for expenses */}
                                        {item.type === 'expense' && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                                                {item.splitDetails?.map((split, idx) => (
                                                    <div key={split.user?._id || idx} className="flex items-center gap-1">
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {split.user?.name ? (split.user.name === user.name ? 'You' : split.user.name) : 'Someone'} owes
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-600">₹{Math.round(split.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {((item.type === 'expense' && item.paidBy?._id === user.id) || (item.type === 'settlement' && item.paidBy?._id === user.id)) && (
                                        <button
                                            onClick={() => handleDeleteActivity(item)}
                                            className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main >

            {/* Settle Up Modal */}
            {
                showSettleModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-800">Record a Payment</h2>
                                <button onClick={() => setShowSettleModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSettleUp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Paid To</label>
                                    <select
                                        value={settleToUser}
                                        onChange={(e) => setSettleToUser(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-splitwise-green outline-none font-bold text-gray-700 hover:bg-gray-100 transition-all shadow-inner"
                                        required
                                    >
                                        <option value="">Select a member</option>
                                        {otherMembers.map(m => (
                                            <option key={m._id} value={m._id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 font-bold">₹</span>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settleAmount}
                                            onChange={(e) => setSettleAmount(e.target.value)}
                                            className="w-full p-4 pl-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-splitwise-green outline-none font-black text-2xl hover:bg-gray-100 transition-all shadow-inner"
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Note</label>
                                    <input
                                        type="text"
                                        value={settleNote}
                                        onChange={(e) => setSettleNote(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-splitwise-green outline-none font-medium hover:bg-gray-100 transition-all shadow-inner"
                                        placeholder="Optional note"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-splitwise-green text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-500 hover:shadow-emerald-200 transition-all"
                                >
                                    Record Payment
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
