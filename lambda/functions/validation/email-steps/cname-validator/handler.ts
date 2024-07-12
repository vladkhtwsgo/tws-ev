import {validateCname} from "../../../../shared/services/email.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../../../shared/interfaces";
import {CnameNotFoundException} from "../../../../shared/exceptions";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email} = event;
    let points = 5;
    try {
        const isValid = await validateCname(email);
        points = isValid ? 10 : 0
        return {email, points, validator: 'cname'};
    } catch (err) {
        if (err instanceof CnameNotFoundException) {
            console.warn(`No CNAME record found for email: ${email}`);
        } else {
            console.error(`Error validating email CNAME for email: ${email}, error:`, err);
            points = 0;
        }
        return {email, points, validator: 'cname', error: 'Error validating cname'};
    }
}
