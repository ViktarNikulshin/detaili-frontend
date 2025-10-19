import axios from 'axios';
import {CarBrand, InfoSource, Order, Work, WorkType} from "../types/order";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const orderApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

interface CalendarFilters {
    masterId?: string | number | null;
    status?: string;
}

export interface OrderPayload {
    clientName: string;
    clientPhone: string;
    carBrand: CarBrand | null;
    vin: string;
    works: Work[]; // Changed from WorkPayload[] to Work[]
    executionDate: string;
    orderCost: number;
    executionTimeByMaster?: string | null;
    infoSource?: InfoSource | null;
}


orderApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const orderAPI = {
    create: (order: OrderPayload) => orderApi.post('/orders', order),
    update: (id: string, order: OrderPayload) => orderApi.put(`/orders/${id}`, order),
    getCalendar: (start: string, end: string, filters?: CalendarFilters) => {
        let url = `/orders/calendar?start=${start}&end=${end}`;

        if (filters) {
            if (filters.masterId) {
                url += `&masterId=${filters.masterId}`;
            }
            if (filters.status) {
                url += `&status=${filters.status}`;
            }
        }

        return orderApi.get(url);
    },
    getById: (id: string) => orderApi.get<Order>(`orders/${id}`),
    getCarBrands: () => orderApi.get('/car/car-brands'),
    getDictionaryByType: (code: string) => orderApi.get(`/dictionary/type/${code}`),
    changeStatus: (id: string, code: string, masterId: string) => orderApi.get(`/orders/change/${id}?code=${code}&master=${masterId}`)
};