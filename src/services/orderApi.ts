import axios from 'axios';
import {CarBrand, CarModel, Order} from "../types/order";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const orderApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
interface CalendarFilters {
    masterId?: string;
    status?: string;
}
// Интерцептор для добавления токена
orderApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const orderAPI = {
    create: (order: {
        clientName: string;
        clientPhone: string;
        carBrand: CarBrand | null;
        carModel: CarModel | null;
        vin: string;
        workTypeIds: number[];
        executionDate: string
    }) => orderApi.post('/orders', order),
    update: (id: string, order: {
        clientName: string;
        clientPhone: string;
        carBrand: CarBrand | null;
        carModel: CarModel | null;
        vin: string;
        workTypeIds: number[];
        executionDate: string
    }) => orderApi.put(`/orders/${id}`, order),
    getCalendar: (start: string, end: string, filters?: CalendarFilters) =>{
        let url = `/orders/calendar?start=${start}&end=${end}`;

        if (filters) {
            if (filters.masterId) {
                url += `&masterId=${filters.masterId}`;
            }
            if (filters.status) {
                url += `&status=${filters.status}`;
            }
        }

        return orderApi.get(url)
    },
    getById: (id: string) => orderApi.get<Order>(`orders/${id}`),
    getCarBrands: () => orderApi.get('/car/car-brands'),
    getCarModel: (id: string) => orderApi.get(`/car/car-models/${id}`),
    getDictionaryByType: (code: string) => orderApi.get(`/dictionary/type/${code}`)
}