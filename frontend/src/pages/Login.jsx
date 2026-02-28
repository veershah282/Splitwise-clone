import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-splitwise-green/10 text-splitwise-green rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
                    <p className="text-gray-500">Log in to track your expenses</p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-splitwise-green focus:border-transparent outline-none transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-splitwise-green focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-splitwise-green hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-sm hover:shadow transition-all mt-4"
                    >
                        Log In
                    </button>
                </form>

                <div className="mt-6 border-t pt-6">
                    <p className="text-center text-sm font-medium text-gray-500 mb-4">Demo Login</p>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => login('veershaha282@gmail.com', 'password123').then(() => navigate('/')).catch(err => setError(err.message || 'Login failed'))}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2.5 rounded-lg transition-colors text-sm"
                        >
                            🧑🏽 Veer
                        </button>
                        <button
                            type="button"
                            onClick={() => login('alice@example.com', 'password123').then(() => navigate('/')).catch(err => setError(err.message || 'Login failed'))}
                            className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold py-2.5 rounded-lg transition-colors text-sm"
                        >
                            👩🏻 Alice
                        </button>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 mt-8">
                    Don't have an account? {' '}
                    <Link to="/register" className="text-splitwise-green font-bold hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
