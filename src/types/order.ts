export interface Order {
    id?: number;
    clientName: string;
    clientPhone: string;
    carBrand: CarBrand | null;
    vin: string;
    works: Work[];
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
    status: string;
    works: Work[];
}
export interface CarBrand {
    id: number;
    name: string;
}
export interface Work {
    id?: number;
    workType: WorkType;
    parts: WorkType [];
    comment?: string;
}

export interface WorkType {
    id: number;
    code: string;
    name: string;
}