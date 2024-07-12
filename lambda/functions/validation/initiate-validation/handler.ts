import {EmailValidationResponse} from "../../../shared/interfaces";
import {v4 as uuidv4} from 'uuid';
import {saveValidationResult, updateValidationResult} from "../../../shared/services/dynamo.service";
import {createResponse} from "../../../shared/utils";
import {HttpStatus} from "../../../shared/enums";
import {sendPayloadToSqs} from "../../../shared/services/sqs.service";


export const handler = async (event: { body: any; }): Promise<EmailValidationResponse> => {
    let payload: { [key: string]: string } = {};
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (err) {
        return createResponse(HttpStatus.BAD_REQUEST);
    }

    const {email} = payload;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length >= 1000) { //We do not want to run the other parts if it just a string
        return createResponse(HttpStatus.BAD_REQUEST, {errors: ['Is not a valid email']});
    }

    const requestId = uuidv4();
    try {
        await saveValidationResult({
            requestId,
            email,
            score: 0,
            validationStatus: 'in_progress',
        });
    } catch (err) {
        console.log(`Error to initiate validation failed requestId=${requestId}, error: ${err}`);
        return createResponse(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
        const sqsMessageId = await sendPayloadToSqs(requestId, email);
        console.log(`Success send message to SQS ${sqsMessageId}, requestId=${requestId}`);
        return createResponse(201, {requestId});
    } catch (err) {
        console.error(`Error sending message to SQS requestId=${requestId}, error: ${err}`);
        return createResponse(HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
        await updateValidationResult(email, 0, 'failed');
    }
}
