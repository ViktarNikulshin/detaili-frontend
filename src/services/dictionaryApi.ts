import axios from 'axios';
import { WorkType } from '../types/order';

// --- NEW: Interface for the raw flat response item from the backend ---
export interface DictionaryRawItem extends WorkType {
    description: string;
    type: 'WORK_TYPE' | 'PVC' | 'INFO' | string;
}

// --- Interface DTO for work types WITHOUT parts (для старых методов) ---
export interface DictionaryItemDto extends WorkType {
    description?: string;
    // Parts is removed from here if this DTO is only for WorkType metadata update
    // If needed, it must be WorkType[], not DictionaryPartDto[]
    parts?: WorkType[];
}

// --- NEW: Interface DTO for UPDATING WorkType and its Parts (combined save) ---
export interface WorkTypeUpdateDto extends WorkType {
    description?: string;
    type: string; // <--- ДОБАВЛЕНО ЭТО ПОЛЕ
    // Массив частей для отправки на сервер
    parts: {
        id?: number; // Optional for new parts
        name: string;
        code: string;
        active: boolean; // Must be included
        type: string; // Parent code (WorkType's code)
    }[];
}

const API_BASE_URL = process.env.REACT_APP_API_URL;
const GENERAL_DICTIONARY_ENDPOINT = '/dictionary';
const DICTIONARY_ENDPOINT = '/dictionary/work-types';

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
     * Получение всего списка словарей.
     */
    fetchWorkTypes: () => {
        return dictionaryAxios.get<DictionaryRawItem[]>(`${GENERAL_DICTIONARY_ENDPOINT}`);
    },

    /**
     * Добавление нового типа работы
     */
    addWorkType: (name: string, code: string) => {
        return dictionaryAxios.post<DictionaryItemDto>(DICTIONARY_ENDPOINT, { name, code, type: 'WORK_TYPE' });
    },

    /**
     * Обновление типа работы (устаревший, обновляет только WorkType без частей)
     */
    updateWorkType: (workType: DictionaryItemDto) =>
        dictionaryAxios.put<DictionaryItemDto>(`${DICTIONARY_ENDPOINT}/${workType.id}`, workType),

    /**
     * НОВЫЙ МЕТОД: Обновление типа работы и его частей ОДНИМ запросом.
     * Отправляем полную структуру WorkTypeUpdateDto.
     */
    updateWorkTypeAndParts: (workType: WorkTypeUpdateDto) =>
        dictionaryAxios.put<WorkTypeUpdateDto>(`${DICTIONARY_ENDPOINT}/${workType.id}`, workType),

    // Методы addPartToWorkType и updatePart больше не нужны, так как используется объединенный save.
};