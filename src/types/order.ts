export interface Order {
    id?: number;
    clientName: string;
    clientPhone: string;
    carBrand: string;
    carModel: string;
    vin: string;
    workTypeIds: number[];
    masterId: number;
    executionDate: string;
    beforePhoto?: File;
    afterPhoto?: File;
    status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    clientName: string;
    carBrand: string;
    status: string;
}