import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401s and unwrap data
api.interceptors.response.use(
    (response) => {
        // If the response follows the { success, data } envelope, unwrap it
        if (response.data && response.data.success === true && response.data.data) {
            // For auth responses, map accessToken to token for compatibility
            if (response.data.data.accessToken) {
                response.data.data.token = response.data.data.accessToken;
            }
            return {
                ...response,
                data: response.data.data,
                meta: response.data.meta
            };
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        // Unwrap custom error messages if present
        if (error.response?.data?.error?.message) {
            error.message = error.response.data.error.message;
        } else if (error.response?.data?.message) {
            error.message = error.response.data.message;
        }

        return Promise.reject(error);
    }
);

export default api;
