/**
 * Типы клиентской базы.
 * Бэкенд: ClientDto / ClientDetailsDto (read-only поверх таблицы clients).
 */

/** Строка списка клиентов с агрегатами по заказам. */
export interface ClientListItem {
    id: number;
    name: string;
    phone: string;
    createdAt?: string | null;
    ordersCount: number;
    totalSpent: number;
    lastVisitDate?: string | null;
    lastCarBrand?: string | null;
}

/** Заказ в истории клиента. */
export interface ClientOrder {
    id: number;
    carBrand?: string | null;
    status: string;
    orderCost?: number | null;
    arrivalDate?: string | null;
}

/** Карточка клиента: данные, статистика и история заказов. */
export interface ClientDetails extends ClientListItem {
    orders: ClientOrder[];
}
