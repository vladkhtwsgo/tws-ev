import {validateCname} from "../../../../shared/services/email.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../../../shared/interfaces";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email} = event;

    try {
        const isValid = await validateCname(email);
        return {email, valid: isValid, validator: 'cname'};
    } catch (err) {
        console.error('Error validating email cname for email ', err);
        return {email, valid: false, validator: 'cname', error: 'Error validating cname'};
    }
}
