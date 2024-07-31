export interface RawLogEntry {
    Data: ({ ScalarValue?: string } | undefined)[];
}

export interface LogEntry {
    requestId: string;
    validator: string;
    message: string;
    timestamp: string;
    points: number;
}
