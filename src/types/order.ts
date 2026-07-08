import {User} from "./user";

export interface Order {
    id?: number;
    clientName: string;
    clientPhone: string;
    carBrand: string;
    vin: string;
    works: Work[];
    arrivalDate: string;
    deliveryDate: string;
    beforePhoto?: File;
    afterPhoto?: File;
    status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    orderCost: number;
    executionTimeByMaster?: string | null;
    infoSource?: InfoSource | null; // UPDATED: Use the new InfoSource type
}

// --- NEW: A dedicated type for Information Source ---
export interface InfoSource {
    id: number;
    name?: string;
    code?: string;
    active?: boolean;
}

export interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    clientName: string;
    clientPhone: string;
    carBrand: string;
    status: string;
    works: Work[];
}

export interface Work {
    id?: number;
    workType: WorkType;
    parts: WorkType [];
    assignments: MasterAssignment [];
    cost: number;
    comment?: string | null; // UPDATED: Allow null for comment
}

export interface WorkType {
    id: number;
    code: string;
    name: string;
    color: string;
    active?: boolean
}

export interface MasterAssignment {
    master: User;
    salaryPercent: number;
}