import {ValidationStatus} from "../enums/validation-status.enum";

export interface EmailValidationRequest {
    email: string;
    requestId: string;
}

export interface EmailValidationResponse {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}

export interface EmailValidationStep extends EmailValidationRequest{
    validator: 'regexp' | 'mx' | 'cname';
    points: number;
    error?: string
}

export interface EmailValidationResult extends EmailValidationRequest{
    score: number; //max 20
    validationStatus: ValidationStatus;
    traceLog?: any[]; //TODO:: maybe from timelinedb
}

// Define the type for the raw log entries returned by Timestream
interface Datum {
    ScalarValue?: string;
    NullValue?: boolean;
}
export interface RawLogEntry {
    Data: Array<{ ScalarValue: string } | null>;
}

export interface LogEntry {
    requestId: string;
    validator: string;
    message: string;
    timestamp: string;
    points: number;
}
