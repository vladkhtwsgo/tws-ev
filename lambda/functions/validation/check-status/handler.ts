import {EmailValidationResponse, EmailValidationStep} from "../../../shared/interfaces";
import {findValidationResultByRequestId} from "../../../shared/services/dynamo.service";
import {EmailNotFoundException} from "../../../shared/exceptions/email-not-found.exception";

export const handler = async (event: any): Promise<EmailValidationResponse> => {
    const requestId = event.pathParameters?.requestId;
    if (!requestId) {
        return {
            statusCode: 400,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({error: 'Missing requestId in path parameters'}),
        };
    }

    try {
        const data = await findValidationResultByRequestId(requestId);
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }
    } catch (err) {
        console.log(`Error check validation result for requestId: ${requestId} error:`, err);
        if (err instanceof EmailNotFoundException) {
            return {
                statusCode: 400,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({})
            }
        }
        return {
            statusCode: 500,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({error: 'Something went wrong'}),
        };
    }
}
