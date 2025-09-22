export interface Order {
    id?: number;
    clientName: string;
    clientPhone: string;
    carBrand: CarBrand | null;
    carModel: CarModel | null;
    vin: string;
    workTypeIds: number[];
    masterIds: number[];
    executionDate: string;
    beforePhoto?: File;
    afterPhoto?: File;
    status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    orderCost: number;
    executionTimeByMaster?: string | null;
}

export interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    clientName: string;
    clientPhone: string;
    carBrand: CarBrand | null;
    carModel: CarModel | null;
    status: string;
}
export interface CarBrand {
    id: number;
    name: string;
}
export interface CarModel {
    id: number;
    name: string;
}