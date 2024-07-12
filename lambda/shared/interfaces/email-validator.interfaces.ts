export interface EmailValidationRequest {
    email: string;
}

export interface EmailValidationResult {
    email: string;
    valid: boolean;
    validationStatus: 'pending' | 'completed' | 'failed' | 'in_progress';
    requestId: string;
}

export interface EmailValidationResponse {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}

export interface EmailValidationStep {
    email: string;
    valid: boolean;
    validator: string
    error?: string
}
