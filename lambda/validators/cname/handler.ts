import {validateCname} from "../../services/email.service";
import {
    EmailValidationRequest,
    EmailValidationResponse,
    EmailValidationResult,
    EmailValidationStep
} from "../../interfaces";

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
