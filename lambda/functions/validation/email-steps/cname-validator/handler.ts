import {validateCname} from "../../../../shared/services/validation.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../../../shared/interfaces";
import {CnameNotFoundException} from "../../../../shared/exceptions";
import {saveTSMessage} from "../../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../../shared/enums/validators";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email,requestId} = event;
    let points = 5;
    try {
        const isValid = await validateCname(email);
        points = isValid ? 10 : 0
        await saveTSMessage(requestId, ValidationLogNames.CNAME, points,'CNAME validation successful');
        return {requestId,email, points, validator: 'cname'};
    } catch (err) {
        if (err instanceof CnameNotFoundException) {
            await saveTSMessage(requestId, ValidationLogNames.CNAME, points, `No CNAME record found for email: ${email}`);
            console.warn(`No CNAME record found for email: ${email}`);
        } else {
            console.error(`Error validating email CNAME for email: ${email}, error:`, err);
            points = 0;
            await saveTSMessage(requestId, ValidationLogNames.CNAME, points, `Error validating email CNAME for email: ${email}, error: ${err}`);
        }
        await saveTSMessage(requestId, ValidationLogNames.CNAME, points, 'Error validating cname');
        return {requestId, email, points, validator: ValidationLogNames.CNAME, error: 'Error validating cname'};
    }
}
