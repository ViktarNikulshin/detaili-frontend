export interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'MANAGER' | 'ADMIN' | 'MASTER';
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
}