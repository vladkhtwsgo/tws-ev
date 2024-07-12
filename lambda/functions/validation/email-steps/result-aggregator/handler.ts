import {updateValidationResult} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";

export const handler = async (event: EmailValidationStep[]): Promise<void> => {
    const mxResult = event[0];
    const cnameResult = event[1];
    const email = mxResult.email;
    const score = Math.max(0, Math.min(mxResult.points && cnameResult.points, 20));

    try {
        let validationStatus = (mxResult?.error || cnameResult?.error) ? 'failed' : 'completed';
        await updateValidationResult(email, score, validationStatus);
    } catch (err) {
        console.error(`Error saving validation result for email: ${email} `, err);
    }
};
