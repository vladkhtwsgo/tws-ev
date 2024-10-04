import {
    updateValidationResult,
    saveBlackList,
    saveWhiteList,
} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";
import {ValidationStatus} from "../../../../shared/enums";
import {saveTSMessage} from "../../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../../shared/enums";
import {checkEmailDomain} from "../../../../shared/utils";

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

        const bannedEmailDomains = (process.env.BANNED_EMAIL_DOMAINS!).split(',');
        const isBannedEmail = checkEmailDomain(bannedEmailDomains, email);
        const approvedEmailDomains = (process.env.APPROVED_EMAIL_DOMAINS!).split(',');
        const isApprovedEmail = checkEmailDomain(approvedEmailDomains, email);

        if (score === 0 || isBannedEmail) {
            await saveBlackList(email, requestId, score);
            await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, 'The email was added in the black list')
        } else if (score === 20 || isApprovedEmail) {
            await saveWhiteList(email, requestId);
            await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, 'The email was added in the white list')
        }
    } catch (err) {
        console.error(`Error saving validation result for email: ${email} `, err);
    }
};