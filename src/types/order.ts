export interface Order {
    id?: number;
    clientName: string;
    clientPhone: string;
    carBrand: string;
    carModel: string;
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
    carBrand: string;
    carModel: string;
    status: string;
}