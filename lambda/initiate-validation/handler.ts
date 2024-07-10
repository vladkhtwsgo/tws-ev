import {EmailValidationRequest, EmailValidationResponse} from "../interfaces";
import {v4 as uuidv4} from 'uuid';
import {saveValidationResult} from "../services/dynamo.service";

export const handler = async (event: { body: any; }): Promise<EmailValidationResponse> => {
    // Transform plain object to class instance
    let payload: { [key: string]: string } = {}; //TODO:: add joi validator or define schema in API GW
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (err) {
        console.error(err);
        return {
            statusCode: 400, body: JSON.stringify({
                message: 'Bad Request'
            }),
        };
    }

    const {email} = payload;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        // Handle validation errors
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Bad Request',
                errors: 'Invalid email address',
            }),
        };
    }
    const requestId = uuidv4();
    try {
        await saveValidationResult({
            requestId,
            email,
            valid: false,
            validationStatus: 'in_progress', //TODO::maybe pending
        });
    } catch (err) {
        console.log(`Error to initiate validation failed: ${err}`);
        return {
            statusCode: 500,
            body: JSON.stringify({})
        }
    }

    return {
        statusCode: 201,
        body: JSON.stringify({requestId}),
    }

}
