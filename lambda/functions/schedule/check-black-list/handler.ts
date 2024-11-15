import { findAllBlackListItems, deleteEmailsFromBlacklist } from '../../../shared/services/dynamo.service';
import {sendPayloadToSqs} from "../../../shared/services/sqs.service";
import {saveTSMessage} from "../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../shared/enums";
import { getListFromEnvVariable } from '../../../shared/utils';

const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
const twoWeekInMilliseconds = 14 * 24 * 60 * 60 * 1000;
const monthInMilliseconds = 30 * 24 * 60 * 60 * 1000;

export const handler = async (): Promise<void> => {
  try {
    const oneWeekAgo = new Date(+(new Date()) - oneWeekInMilliseconds).toISOString();
    const twoWeekAgo = new Date(+(new Date()) - twoWeekInMilliseconds).toISOString();
    const monthAgo = new Date(+(new Date()) - monthInMilliseconds).toISOString();
    const domainRehabilitateList = getListFromEnvVariable('DOMAIN_REHABILITATE_LIST');
    const domainBlackList = getListFromEnvVariable('DOMAIN_BLACK_LIST');

    if (domainRehabilitateList.length) {
      const filterExpressions = domainRehabilitateList
        .map((_, index) => `contains(email, :domain${index})`)
        .join(' OR ');
      const expressionAttributeValues = domainRehabilitateList.reduce((acc, domain, index) => {
        acc[`:domain${index}`] = `@${domain}`; // додаємо "@" перед доменом
        return acc;
      }, {} as {[key: string]: string});

      const itemsNeedToRehabilitated = await findAllBlackListItems({
        FilterExpression: filterExpressions,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      console.log(`The emails ${itemsNeedToRehabilitated.map(({ email }) => email)} need to rehabilitate`);
      await deleteEmailsFromBlacklist([...itemsNeedToRehabilitated.map((item) => item.email)]);

      for (const record of itemsNeedToRehabilitated) {
        const { requestId, score} = record;
        await saveTSMessage(requestId, ValidationLogNames.BLACK_LIST, score, 'The email was rehabilitated')
      }
      console.log(
        `The email${itemsNeedToRehabilitated.length === 1 ? '' : 's'}: ${itemsNeedToRehabilitated.map(({ email }) => email).join(', ')} ${itemsNeedToRehabilitated.length === 1 ? 'was' : 'were'} rehabilitated.`
      );
    }


    const itemsNeedToCheck = await findAllBlackListItems({
      FilterExpression: '((createdAt < :oneWeekAgo AND recheckAttempts = :zeroAttempts) OR (createdAt < :twoWeekAgo AND recheckAttempts = :oneAttempt) OR (createdAt < :monthAgo AND recheckAttempts = :twoAttempts)) AND NOT contains(:excludedDomains, email)',
      ExpressionAttributeValues: {
        ':oneWeekAgo': oneWeekAgo,
        ':twoWeekAgo': twoWeekAgo,
        ':monthAgo': monthAgo,
        ':zeroAttempts': 0,
        ':oneAttempt': 1,
        ':twoAttempts': 2,
        ':excludedDomains': [...domainRehabilitateList, ...domainBlackList]
      },
    });

    if (itemsNeedToCheck.length) {
      console.log(`The emails ${itemsNeedToCheck.map(({ email }) => email)} need to recheck`);
      // send emails to the SQS to recheck the validation
      for (const record of itemsNeedToCheck) {
        try {
          const { requestId, email, score } = record;
          const sqsMessageId = await sendPayloadToSqs(requestId, email);
          console.log(`Success send message to SQS ${JSON.stringify(sqsMessageId)}, requestId=${requestId}`);
          await saveTSMessage(requestId, ValidationLogNames.BLACK_LIST, score, 'The email was requested to recheck validation');
        } catch (error) {
          console.error('Error starting Step Function execution:', error);
        }
      }
    }
  } catch (err) {
    console.error('Error during the checking the black list in scheduler', err);
  }
};
