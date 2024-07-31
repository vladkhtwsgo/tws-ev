import {updateValidationResult} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";
import {ValidationStatus} from "../../../../shared/enums";
import {saveTSMessage} from "../../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../../shared/enums/validators";

export const handler = async (event: EmailValidationStep[]): Promise<void> => {
    const mxResult = event[0];
    const cnameResult = event[1];
    const email = mxResult.email;
    const score = Math.max(0, Math.min(mxResult.points + cnameResult.points, 20));
    const requestId = cnameResult?.requestId || mxResult?.requestId;
    try {
        if (requestId) {
            await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, 'Validation completed')
        }
        console.log(`Data from ${ValidationLogNames.MX}:`, mxResult);
        console.log(`Data from ${ValidationLogNames.CNAME}:`, cnameResult);
        await updateValidationResult(email, score, ValidationStatus.COMPLETED);
    } catch (err) {
        console.error(`Error saving validation result for email: ${email} `, err);
    }
};
