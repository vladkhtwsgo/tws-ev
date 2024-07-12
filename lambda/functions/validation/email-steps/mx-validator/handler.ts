import {validateMx} from "../../../../shared/services/validation.service";
import {
    EmailValidationRequest,
    EmailValidationStep
} from "../../../../shared/interfaces";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
    const {email} = event;
    let points = 5;
    try {
        const isValid = await validateMx(email);
        points = isValid ? 10 : 0
        return {email, points, validator: 'mx'};
    } catch (err) {
        console.error(`Error validating email mx record for email: ${email}, error: `, err);
        return {email, points, validator: 'cname', error: 'Error validating mx'};
    }
}
