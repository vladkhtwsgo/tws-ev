import {ValidationStatus} from "../enums/validation-status.enum";

export interface EmailValidationRequest {
    email: string;
}

export interface EmailValidationResponse {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}

export interface EmailValidationStep {
    email: string;
    validator: 'regexp' | 'mx' | 'cname';
    points: number;
    error?: string
}

export interface EmailValidationResult {
    requestId: string;
    email: string;
    score: number; //max 20
    validationStatus: ValidationStatus;
    validationSteps?: EmailValidationStep[]; //TODO:: maybe from timelinedb
}
