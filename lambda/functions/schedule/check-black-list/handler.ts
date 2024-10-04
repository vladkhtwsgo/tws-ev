import { findAllBlackListItems, deleteEmailsFromBlacklist } from '../../../shared/services/dynamo.service';
import {sendPayloadToSqs} from "../../../shared/services/sqs.service";
import {BlackWhiteListEntity} from "../../../shared/interfaces";
import {checkEmailDomain} from "../../../shared/utils";
import {saveTSMessage} from "../../../shared/services/timestream.service";
import {ValidationLogNames} from "../../../shared/enums";

const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

export const handler = async (): Promise<void> => {
  try {
    const oneWeekAgo = new Date(+(new Date()) - oneWeekInMilliseconds).toISOString();
    const blackListItems = await findAllBlackListItems({
      FilterExpression: 'createdAt < :oneWeekAgo',
      ExpressionAttributeValues: {
        ':oneWeekAgo': oneWeekAgo,
      },
    });

    // dividing emails in the rehabilitate and check groups
    const [itemsNeedToRehabilitate, itemsNeedToCheck] = blackListItems.reduce(([a, b], item) => {
      const rehabilitatedEmailDomains = (process.env.REHABILITATED_EMAIL_DOMAINS!).split(',');
      const isRehabilitatedEmail = checkEmailDomain(rehabilitatedEmailDomains, item.email);
      if (isRehabilitatedEmail) {
        return [[...a, item], b];
      }
      const bannedEmailDomains = (process.env.BANNED_EMAIL_DOMAINS!).split(',');
      const isBannedEmail = checkEmailDomain(bannedEmailDomains, item.email);
      if (isBannedEmail) {
        return [a, b];
      }

      return [a, [...b, item]];
    }, [[] as BlackWhiteListEntity[], [] as BlackWhiteListEntity[]]);

    const rehabilitatedEmails = itemsNeedToRehabilitate.map(({ email }) => email);

    // removing items from the blackList to recheck
    await deleteEmailsFromBlacklist([...rehabilitatedEmails, ...itemsNeedToCheck.map((item) => item.email)]);

    // send emails to the SQS to recheck the validation
    for (const record of itemsNeedToCheck) {
      try {
        const { requestId, email, score} = record;
        const sqsMessageId = await sendPayloadToSqs(requestId, email);
        console.log(`Success send message to SQS ${JSON.stringify(sqsMessageId)}, requestId=${requestId}`);
        await saveTSMessage(requestId, ValidationLogNames.BLACK_LIST, score, 'The email was requested to recheck validation');
      } catch (error) {
        console.error('Error starting Step Function execution:', error);
      }
    }

    if (rehabilitatedEmails.length) {
      for (const record of itemsNeedToRehabilitate) {
        const { requestId, score} = record;
        await saveTSMessage(requestId, ValidationLogNames.BLACK_LIST, score, 'The email was rehabilitated')
      }
      console.log(
        `The email${rehabilitatedEmails.length === 1 ? '' : 's'}: ${rehabilitatedEmails.join(', ')} ${rehabilitatedEmails.length === 1 ? 'was' : 'were'} rehabilitated.`
      );
    }
  } catch (err) {
    console.error('Error during the checking the black list in scheduler', err);
  }
};