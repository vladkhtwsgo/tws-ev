import {EmailValidationResponse} from "../../../shared/interfaces";
import {findValidationResultByRequestId} from "../../../shared/services/dynamo.service";
import {EmailNotFoundException} from "../../../shared/exceptions";
import {createResponse} from "../../../shared/utils";
import {HttpStatus} from "../../../shared/enums";
import {findLogsByRequestId} from "../../../shared/services/timestream.service";

export const handler = async (event: any): Promise<EmailValidationResponse> => {
    const requestId = event.pathParameters?.requestId;
    if (!requestId) {
        return createResponse(HttpStatus.BAD_REQUEST);
    }

    try {
        const validationResult = await findValidationResultByRequestId(requestId);
        const traceLog = await findLogsByRequestId(requestId);
        validationResult.traceLog = traceLog;
        return createResponse(HttpStatus.OK, validationResult);
    } catch (err) {
        console.log(`Error check validation result for requestId: ${requestId} error:`, err);
        if (err instanceof EmailNotFoundException) {
            return createResponse(HttpStatus.NOT_FOUND);
        }
        return createResponse(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
