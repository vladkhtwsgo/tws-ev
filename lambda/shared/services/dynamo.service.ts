import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import {EmailNotFoundException} from "../exceptions";
import {EmailValidationResult} from "../interfaces";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

export const saveValidationResult = async (data: EmailValidationResult): Promise<void> => {
    const params = {
        TableName: process.env.VALIDATION_RESULTS_TABLE!,
        Item: data,
    };

    await dynamo.send(new PutCommand(params));
};

export const updateValidationResult = async (email: string, score: number, validationStatus: string): Promise<void> => {
    const command = new UpdateCommand({
        TableName: process.env.VALIDATION_RESULTS_TABLE!,
        Key: {email},
        UpdateExpression: "set score = :score, validationStatus = :validationStatus",
        ExpressionAttributeValues: {
            ":score": score,
            ":validationStatus": validationStatus,
        }
    });

    await dynamo.send(command);
}

export const findValidationResultByRequestId = async (requestId: string): Promise<EmailValidationResult> => {
    const query = new QueryCommand({
        TableName: process.env.VALIDATION_RESULTS_TABLE!,
        IndexName: 'RequestIdIndex',
        KeyConditionExpression: 'requestId = :requestId',
        ExpressionAttributeValues: {
            ':requestId': requestId,
        },
    });

    const {Items: items} = await dynamo.send(query);
    if (!items || items.length === 0) {
        throw new EmailNotFoundException();
    }
    return items[0] as EmailValidationResult;
};
