import {validateMx} from "../../services/email.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../interfaces";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email} = event;

    try {
        const isValid = await validateMx(email);
        return {email, valid: isValid, validator: 'mx'};
    } catch (err) {
        console.error('Error validating email mx record', err);
        return {email, valid: false, validator: 'cname', error: 'Error validating mx'};
    }
}
