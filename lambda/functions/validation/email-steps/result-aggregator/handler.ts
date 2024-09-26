import {
    updateValidationResult,
    saveBlackList,
    saveWhiteList,
    findValidationResultByEmail
} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";
import {ValidationStatus} from "../../../../shared/enums";
import {saveTSMessage} from "../../../../shared/services/timestream.service";
import {ValidationLists, ValidationLogNames} from "../../../../shared/enums/validators";

const saveResults = async (requestId: string, email: string, score: number) => {
    if (requestId) {
        await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, 'Validation completed')
    }
    await updateValidationResult(email, score, ValidationStatus.COMPLETED);
}

export const handler = async (event: EmailValidationStep[] | EmailValidationStep): Promise<void> => {
    if (Array.isArray(event)) {
        // The case when we have a new email
        const mxResult = event[0];
        const cnameResult = event[1];
        const email = mxResult.email;
        const score = Math.max(0, Math.min(mxResult.points + cnameResult.points, 20));
        const requestId = cnameResult?.requestId || mxResult?.requestId;
        try {
            await saveResults(requestId, email, score);
            console.log(`Data from ${ValidationLogNames.MX}:`, mxResult);
            console.log(`Data from ${ValidationLogNames.CNAME}:`, cnameResult);
            if (score <= 10) {
                await saveBlackList({ email });
            } else {
                await saveWhiteList({ email });
            }
        } catch (err) {
            console.error(`Error saving validation result for email: ${email} `, err);
        }
    } else if (event.validationList === ValidationLists.BLACK_LIST) {
        // The case when we have the email in the black list
        try {
            await saveResults(event.requestId, event.email, 0);
            console.log(`Data from ${ValidationLists.BLACK_LIST}:`, event);
        } catch (err) {
            console.error(`Error saving validation result for email: ${event.email} `, err);
        }
    } else if (event.validationList === ValidationLists.WHITE_LIST) {
        // The case when we have the email in the white list
        try {
            const previousValidationResult = await findValidationResultByEmail(event.email);
            if (previousValidationResult) {
                await saveResults(event.requestId, event.email, previousValidationResult.score);
                console.log(`Data from ${ValidationLists.WHITE_LIST}:`, event);
            }
        } catch (err) {
            console.error(`Error saving validation result for email: ${event.email} `, err);
        }
    }
};
