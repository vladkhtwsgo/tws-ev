import {updateValidationResult} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";
import {ValidationStatus} from "../../../../shared/enums/validation-status.enum";

export const handler = async (event: EmailValidationStep[]): Promise<void> => {
    const mxResult = event[0];
    const cnameResult = event[1];
    const email = mxResult.email;
    const score = Math.max(0, Math.min(mxResult.points + cnameResult.points, 20));

    try {
        console.log('Data from MX:', mxResult);
        console.log('Data from CNAME:', cnameResult);
        await updateValidationResult(email, score, ValidationStatus.COMPLETED);
    } catch (err) {
        console.error(`Error saving validation result for email: ${email} `, err);
    }
};
