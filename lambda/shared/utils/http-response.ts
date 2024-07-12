import {EmailValidationResponse} from "../interfaces";
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
