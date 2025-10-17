import axios from 'axios';
import {Role, User} from "../types/user";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const userApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Интерцептор для добавления токена
userApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
export const userAPI = {
    getUsersByRole: (code: string) => userApi.get<Array<User>>(`/users/role/${code}`),
    updateUser: (id: number, user: {
        firstName: string;
        lastName: string;
    }) => userApi.put(`/users/${id}`, user),
    changePassword: (username: string, oldPassword: string, newPassword: string) =>
        userApi.get(`/users/changePassword/${username}?oldPassword=${oldPassword}&newPassword=${newPassword}`),
    getAllUsers: () => userApi.get<Array<User>>(`/users`),
    getUserById: (id: string) => userApi.get<User>(`/users/${id}`),
    getAllRoles: () => userApi.get<Array<Role>>(`users/roles`),
    updateUserRoles: (id: string, roleIds: number[])=> userApi.get(`/users/updateRoles/${id}?roleIds=${roleIds}`),
    createUser: (newUser: {
        firstName: string;
        lastName: string;
        phone: string;
        username: string;
        roles: Role []
    }) => userApi.post(`/users`, newUser)
}