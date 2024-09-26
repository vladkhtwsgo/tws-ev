import {deleteEmailsFromBlacklist} from "../../../shared/services/dynamo.service";
import {createResponse} from "../../../shared/utils";
import {HttpStatus} from "../../../shared/enums";
import {EmailValidationResponse} from "../../../shared/interfaces";

export const handler = async (event: { body: any; }): Promise<EmailValidationResponse> => {
  let payload: { [key: string]: string[] } = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return createResponse(HttpStatus.BAD_REQUEST);
  }

  try {
    await deleteEmailsFromBlacklist(payload.emails);
    return createResponse(201, { result: 'Success' });
  } catch (err) {
    console.log(`Error delete the emails from the black list:`, err);
    return createResponse(HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
