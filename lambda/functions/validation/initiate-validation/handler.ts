import {EmailValidationResponse, EmailValidationResult} from "../../../shared/interfaces";
import {v4 as uuidv4} from 'uuid';
import {
    findValidationResultByEmail,
    saveValidationResult,
    updateValidationResult
} from "../../../shared/services/dynamo.service";
import {createResponse, isEmail} from "../../../shared/utils";
import {HttpStatus, ValidationStatus} from "../../../shared/enums";
import {sendPayloadToSqs} from "../../../shared/services/sqs.service";


export const handler = async (event: { body: any; }): Promise<EmailValidationResponse> => {
    let payload: { [key: string]: string } = {};
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (err) {
        return createResponse(HttpStatus.BAD_REQUEST);
    }

    const {email} = payload;
    if (!email || !isEmail(email) || email.length >= 1000) { //We do not want to run the other parts if it just a string
        return createResponse(HttpStatus.BAD_REQUEST, {errors: ['Is not a valid email']});
    }

    let existsEmail: EmailValidationResult | null;
    try {
        existsEmail = await findValidationResultByEmail(email);
    } catch (err) {
        console.log(`Error check validation result for requestId: ${email}, error:`, err);
        return createResponse(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const requestId = existsEmail ? existsEmail.requestId : uuidv4();

    try {
        await saveValidationResult({
            requestId,
            email,
            score: 0,
            validationStatus: ValidationStatus.IN_PROGRESS,
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
        try {
            await updateValidationResult(email, 0, ValidationStatus.FAILED);
        } catch (err) {
            console.error(`Error to mark as FAILED email: ${email}, error: ${err}`);
        }
        return createResponse(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
