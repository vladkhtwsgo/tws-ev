import {EmailValidationResponse, LogEntry, RawLogEntry} from "../interfaces";
import {ErrorMessage, HttpStatus} from "../enums";

export const createResponse = (statusCode: number, body: Record<string, any> = {}): EmailValidationResponse => {
    switch (statusCode) {
        case HttpStatus.BAD_REQUEST:
            body['message'] = ErrorMessage.BAD_REQUEST;
            break;
        case HttpStatus.INTERNAL_SERVER_ERROR:
            body['message'] = ErrorMessage.INTERNAL_SERVER_ERROR;
            break;
        case HttpStatus.NOT_FOUND:
            body['message'] = ErrorMessage.NOT_FOUND;
    }
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
};
export const formatLogs = (logs: RawLogEntry[]): LogEntry[] => {
    return logs.map(log => {
        const [requestId, validator, message, , , timestamp, points] = log.Data;
        return {
            requestId: requestId?.ScalarValue ?? '',
            validator: validator?.ScalarValue ?? '',
            message: message?.ScalarValue ?? '',
            timestamp: timestamp?.ScalarValue ?? '',
            points: parseFloat(points?.ScalarValue ?? '0'),
        };
    });
};
