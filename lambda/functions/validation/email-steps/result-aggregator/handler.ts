import {updateValidationResult} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";

export const handler = async (event: EmailValidationStep[]): Promise<void> => {
    const mxResult = event[0];
    const cnameResult = event[1];
    const email = mxResult.email;
    const isValid = mxResult.valid && cnameResult.valid;

    try {
        let validationStatus = (mxResult?.error || cnameResult?.error) ? 'failed' : 'completed';
        console.log('validationStatus', validationStatus);
        console.log('mxResult', mxResult);
        console.log('cnameResult', cnameResult);
        await updateValidationResult(email, isValid, validationStatus);
    } catch (err) {
        console.error(`Error saving validation result for email: ${email} `, err);
    }
};
