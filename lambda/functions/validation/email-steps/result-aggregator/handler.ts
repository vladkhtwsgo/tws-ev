import {
    updateValidationResult,
    saveBlackList,
    saveWhiteList, findBlackListItemByEmail, deleteEmailsFromBlacklist,
} from '../../../../shared/services/dynamo.service';
import {EmailValidationStep} from "../../../../shared/interfaces";
import {ValidationStatus} from "../../../../shared/enums";
import {saveTSMessage} from "../../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../../shared/enums";
import {checkEmailDomain, getListFromEnvVariable} from "../../../../shared/utils";

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

        const domainBlackList = getListFromEnvVariable('DOMAIN_BLACK_LIST');
        const isBannedEmail = checkEmailDomain(domainBlackList, email);
        const domainWhiteList = getListFromEnvVariable('DOMAIN_WHITE_LIST');
        const isApprovedEmail = checkEmailDomain(domainWhiteList, email);
        const blackListedEmail = await findBlackListItemByEmail(email);

        if (score === 0 || isBannedEmail) {
            const recheckAttempts = blackListedEmail ? blackListedEmail.recheckAttempts + 1 : 0;
            await saveBlackList(email, requestId, score, recheckAttempts);
            await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, `The email ${email} was added in the black list`)
        } else if (score === 20 || isApprovedEmail) {
            await saveWhiteList(email, requestId);
            await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, `The email ${email} was added in the white list`)
        }

        if (score > 0 && blackListedEmail) {
            await deleteEmailsFromBlacklist([email]);
            await saveTSMessage(requestId, ValidationLogNames.AGGREGATOR, score, `The email ${email} was removed from the black list`);
            console.log(`The email ${email} was removed from the black list`);
        }
    } catch (err) {
        console.error(`Error saving validation result for email: ${email} `, err);
    }
};
