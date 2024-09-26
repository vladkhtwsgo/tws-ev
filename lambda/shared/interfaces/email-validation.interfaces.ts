import {ValidationStatus} from "../enums";
import {ValidationLists} from "../enums/validators";

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
    validator: 'regexp' | 'mx' | 'cname' | 'blackWhiteList';
    points: number;
    error?: string;
    validationList?: ValidationLists;
}

export interface EmailValidationResult extends EmailValidationRequest {
    score: number; //max 20
    validationStatus: ValidationStatus;
    traceLog?: any[]; //TODO:: maybe from timelinedb
}

export interface BlackWhiteListEntity {
    email: string;
}
