import axios from 'axios';
import { WorkType } from '../types/order';

// --- NEW: Interface for the raw flat response item from the backend ---
// Добавляем поля description и type, которые есть в вашем ответе
export interface DictionaryRawItem extends WorkType {
    description: string;
    type: 'WORK_TYPE' | 'PVC' | 'INFO' | string;
}

// --- Interface DTO for work types WITH parts (для состояния компонента) ---
// Используется для отправки и получения иерархических данных.
export interface DictionaryItemDto extends WorkType {
    description?: string;
    parts: WorkType[];
}

const API_BASE_URL = process.env.REACT_APP_API_URL;
const GENERAL_DICTIONARY_ENDPOINT = '/dictionary'; // Используем для GET-запроса всех типов
const DICTIONARY_ENDPOINT = '/dictionary/work-types'; // Предполагаемый эндпоинт для POST/PUT/DELETE

// --- 1. Создание экземпляра Axios ---
export const dictionaryAxios = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- 2. Interceptor для Authorization ---
dictionaryAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- 3. API-методы ---
export const dictionaryApi = {
    /**
     * Получение всего списка словарей. Мы ожидаем плоский список.
     */
    fetchWorkTypes: () => {
        // Предполагаем, что этот эндпоинт возвращает все типы словарей, как в вашем примере
        return dictionaryAxios.get<DictionaryRawItem[]>(`${GENERAL_DICTIONARY_ENDPOINT}`);
    },

    /**
     * Добавление нового типа работы
     */
    addWorkType: (name: string, code: string) => {

        return dictionaryAxios.post<DictionaryItemDto>(DICTIONARY_ENDPOINT, { name, code, type: 'WORK_TYPE' });
    },

    /**
     * Удаление типа работы
     */
    deleteWorkType: (id: number) => dictionaryAxios.delete(`${DICTIONARY_ENDPOINT}/${id}`),

    /**
     * Обновление типа работы (отправляем на сервер полную иерархическую структуру)
     */
    updateWorkType: (workType: DictionaryItemDto) =>
        dictionaryAxios.put<DictionaryItemDto>(`${DICTIONARY_ENDPOINT}/${workType.id}`, workType)
};