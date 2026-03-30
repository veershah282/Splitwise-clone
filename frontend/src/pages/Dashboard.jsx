import React, { useState, useEffect, useContext } from 'react';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Plus,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const { logout, user } = useContext(AuthContext);
    const toast = useToast();
    const [generatingInsights, setGeneratingInsights] = useState(false);
    const [insightsData, setInsightsData] = useState(null);
    const [balances, setBalances] = useState({ totalOwedToYou: 0, totalYouOwe: 0 });
    const [groups, setGroups] = useState([]);
    const [spendingData, setSpendingData] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleGenerateInsights = async () => {
        setGeneratingInsights(true);
        try {
            const res = await api.get('/ai/users/me/insights');
            const { insights, isFallback, warning } = res.data;

            if (isFallback) {
                if (warning === 'rate limit exceeded') {
                    toast.error('rate limit exceeded');
                } else {
                    toast.warning(warning || 'Standard insights generated.');
                }
            } else {
                toast.success('Insights generated successfully! 💡');
            }
            // Show the insights in a nice text box modal
            if (insights) {
                setInsightsData(insights);
            }
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Failed to generate insights');
        } finally {
            setGeneratingInsights(false);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [balanceRes, groupsRes, spendingRes, activityRes] = await Promise.all([
                    api.get('/expenses/balances'),
                    api.get('/groups'),
                    api.get('/expenses/monthly-spending'),
                    api.get('/expenses/activity')
                ]);
                setBalances(balanceRes.data);
                setSpendingData(Array.isArray(spendingRes.data) ? spendingRes.data : []);
                setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
                setGroups(groupsRes.data.map(g => ({
                    id: g._id,
                    title: g.name,
                    amount: Math.abs(g.userBalance || 0),
                    type: (g.userBalance || 0) >= 0 ? 'lent' : 'owe',
                    memberCount: g.totalMembers || 0
                })));
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);


    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-splitwise-green"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col relative">
            {/* Insights Modal overlay */}
            {insightsData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 md:p-8 flex flex-col h-full max-h-[80vh]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                        <span className="text-2xl leading-none">💡</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">Financial Insights</h2>
                                        <p className="text-sm text-gray-500 font-medium">AI-powered analysis of your spending</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setInsightsData(null)}
                                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="text-gray-700 bg-purple-50/50 p-6 rounded-2xl border border-purple-100/50 leading-relaxed whitespace-pre-wrap font-medium">
                                    {insightsData}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setInsightsData(null)}
                                    className="bg-gray-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-sm"
                                >
                                    Close Insights
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Navbar */}
            <nav className="bg-white border-b px-8 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-splitwise-green rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Splitwise</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                        <div className="w-8 h-8 bg-emerald-100 text-splitwise-green rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-splitwise-green group-hover:text-white transition-all">
                            {user?.name[0].toUpperCase()}
                        </div>
                        <div className="hidden sm:block">
                            <p className="font-bold text-sm text-gray-800 leading-none">{user?.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{user?.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Log out</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl w-full mx-auto p-6 md:p-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleGenerateInsights}
                            disabled={generatingInsights}
                            className="bg-purple-100 text-purple-700 font-bold px-6 py-2.5 rounded-xl hover:bg-purple-200 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <span className="text-xl leading-none">💡</span>
                            {generatingInsights ? 'Generating...' : 'Generate Financial Insights'}
                        </button>
                        <button
                            onClick={() => navigate('/create')}
                            className="bg-splitwise-green text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-500 transition-all shadow-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Group
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Summary & Chart */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-splitwise-green group-hover:bg-splitwise-green group-hover:text-white transition-all">
                                    <ArrowUpRight className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-500 text-sm font-medium">Total owed to you</p>
                                    <p className="text-3xl font-bold text-splitwise-green">₹{Math.round(balances.totalOwedToYou)}</p>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                                    <ArrowDownLeft className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-500 text-sm font-medium">Total you owe</p>
                                    <p className="text-3xl font-bold text-orange-600">₹{Math.round(balances.totalYouOwe)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Monthly Spending</h2>
                                <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium text-gray-600" defaultValue="6">
                                    <option value="6">Last 6 months</option>
                                    <option value="12">This year</option>
                                </select>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={spendingData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            tickFormatter={(value) => `₹${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [`₹${value}`, 'Spending']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#5bc3a8"
                                            strokeWidth={4}
                                            dot={{ r: 6, fill: '#5bc3a8', strokeWidth: 0 }}
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Activity Section */}
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
                            <div className="space-y-4">
                                {activity.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No recent activity</p>
                                    </div>
                                ) : (
                                    activity.slice(0, 8).map((item) => (
                                        <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                                <Receipt className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-sm">{item.description}</p>
                                                <p className="text-gray-400 text-xs mt-1">
                                                    {(item.paidBy?.name === user?.name ? 'You' : item.paidBy?.name) || 'Someone'} paid <span className="text-gray-600 font-medium">₹{Math.round(item.amount)}</span> • {item.group?.name || 'Group'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Groups Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Your Groups</h2>
                            <div className="space-y-4">
                                {groups.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <p className="text-gray-400 text-sm">No active groups yet</p>
                                        <button
                                            onClick={() => navigate('/create')}
                                            className="mt-4 text-splitwise-green text-sm font-bold hover:underline"
                                        >
                                            Create one
                                        </button>
                                    </div>
                                ) : (
                                    groups.map((group) => (
                                        <div
                                            key={group.id}
                                            onClick={() => navigate(`/group/${group.id}`)}
                                            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 cursor-pointer group/card"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-800 text-base truncate flex-1 group-hover/card:text-splitwise-green transition-colors">
                                                    {group.title}
                                                </h3>
                                                <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                    {group.memberCount} members
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-3">
                                                <p className={`text-xs font-bold ${group.type === 'lent' ? 'text-splitwise-green' : 'text-orange-600'}`}>
                                                    {group.type === 'lent' ? 'You are owed' : 'You owe'}
                                                </p>
                                                <p className={`text-lg font-bold ${group.type === 'lent' ? 'text-splitwise-green' : 'text-orange-600'}`}>
                                                    ₹{Math.round(group.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
