import {validateMx} from "../../../../shared/services/validation.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../../../shared/interfaces";
import {saveTSMessage} from "../../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../../shared/enums";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email, requestId} = event;
    let points = 5;
    try {
        const isValid = await validateMx(email);
        points = isValid ? 10 : 0
        await saveTSMessage(requestId, ValidationLogNames.MX, points, 'MX validation successful');
        return {requestId, email, points, validator: 'mx'};
    } catch (err) {
        await saveTSMessage(requestId, ValidationLogNames.MX, points, `Error validating email mx record for email: ${email}, error: ${err}`);
        console.error(`Error validating email mx record for email: ${email}, error: `, err);
        return {requestId, email, points, validator: ValidationLogNames.MX, error: `Error validating ${ValidationLogNames.MX}`};
    }
}
