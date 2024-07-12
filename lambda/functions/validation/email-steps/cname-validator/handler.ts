import {validateCname} from "../../../../shared/services/email.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../../../shared/interfaces";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email} = event;
    let points = 5;
    try {
        const isValid = await validateCname(email);
        points = isValid ? 10 : 0
        return {email, points, validator: 'cname'};
    } catch (err) {
        console.error(`Error validating email cname for email: ${email}, error:`, err);
        return {email, points, validator: 'cname', error: 'Error validating cname'};
    }
}
