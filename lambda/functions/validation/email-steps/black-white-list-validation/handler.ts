import {
  EmailValidationRequest,
  EmailValidationStep
} from "../../../../shared/interfaces";
import {findBlackListItemByEmail, findWhiteListItemByEmail} from "../../../../shared/services/dynamo.service";
import {ValidationLists, ValidationLogNames} from "../../../../shared/enums/validators";

export const handler = async (event: EmailValidationRequest): Promise<EmailValidationStep> => {
  const { email, requestId } = event;

  try {
    const blackListItem = await findBlackListItemByEmail(email);
    if (blackListItem) {
      return { requestId, email, points: 0, validationList: ValidationLists.BLACK_LIST, validator: ValidationLogNames.BLACK_WHITE_LIST };
    }

    const whiteListItem = await findWhiteListItemByEmail(email);
    if (whiteListItem) {
      return { requestId, email, points: 0, validationList: ValidationLists.WHITE_LIST, validator: ValidationLogNames.BLACK_WHITE_LIST };
    }

    return { requestId, email, points: 0, validationList: ValidationLists.NONE, validator: ValidationLogNames.BLACK_WHITE_LIST }
  } catch (err) {
    console.log(`Error check the email in the black list for requestId: ${requestId} error:`, err);
    return { requestId, email, points: 0, validationList: ValidationLists.NONE, validator: ValidationLogNames.BLACK_WHITE_LIST }
  }
}
