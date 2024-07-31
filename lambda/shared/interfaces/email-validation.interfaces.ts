import {ValidationStatus} from "../enums";

export interface EmailValidationRequest {
    email: string;
    requestId: string;
}

export interface EmailValidationResponse {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}

export interface EmailValidationStep extends EmailValidationRequest {
    validator: 'regexp' | 'mx' | 'cname';
    points: number;
    error?: string
}

export interface EmailValidationResult extends EmailValidationRequest {
    score: number; //max 20
    validationStatus: ValidationStatus;
    traceLog?: any[]; //TODO:: maybe from timelinedb
}
