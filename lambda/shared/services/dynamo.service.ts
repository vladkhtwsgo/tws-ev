import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, BatchWriteCommand, ScanCommand} from "@aws-sdk/lib-dynamodb";
import {EmailNotFoundException} from "../exceptions";
import {BlackWhiteListEntity,EmailValidationResult} from "../interfaces";

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

export const findValidationResultByEmail = async (email: string): Promise<EmailValidationResult | null> => {
    const query = new GetCommand({
            TableName: process.env.VALIDATION_RESULTS_TABLE!,
            Key: {email},
        }
    )
    const {Item: item} = await dynamo.send(query);
    if (!item) {
        return null;
    }
    return item as EmailValidationResult;
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

export const findBlackListItemByEmail = async (email: string): Promise<BlackWhiteListEntity | null> => {
    const query = new QueryCommand({
        TableName: process.env.EMAIL_BLACK_LIST_TABLE!,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
            ':email': email,
        },
    });

    const {Items: items} = await dynamo.send(query);
    return items && items.length ? items[0] as BlackWhiteListEntity : null;
};

export const saveBlackList = async (email: string, requestId: string, score: number): Promise<void> => {
    const params = {
        TableName: process.env.EMAIL_BLACK_LIST_TABLE!,
        Item: { email, requestId, score, createdAt: new Date().toISOString() },
    };

    await dynamo.send(new PutCommand(params));
};

export const findAllBlackListItems = async (
  filter?: {
      FilterExpression: string;
      ExpressionAttributeValues: {
        [key: string]: any,
      };
  }): Promise<BlackWhiteListEntity[]> => {
    const scanCommand = new ScanCommand({
        TableName: process.env.EMAIL_BLACK_LIST_TABLE!,
        ...(filter || {})
    });

    const { Items: items } = await dynamo.send(scanCommand);

    return items as BlackWhiteListEntity[];
};

export const deleteEmailsFromBlacklist = async (emails: string[]): Promise<void> => {
    // The BatchWriteCommand can get 25 items by one time
    const chunks = [];
    const batchSize = 25;

    for (let i = 0; i < emails.length; i += batchSize) {
        const chunk = emails.slice(i, i + batchSize);
        chunks.push(chunk);
    }

    for (const chunk of chunks) {
        const deleteRequests = chunk.map((email) => ({
            DeleteRequest: {
                Key: { email }
            },
        }));

        const command = new BatchWriteCommand({
            RequestItems: {
                [process.env.EMAIL_BLACK_LIST_TABLE!]: deleteRequests,
            },
        });

        await dynamo.send(command);
    }
};

export const findWhiteListItemByEmail = async (email: string): Promise<BlackWhiteListEntity | null> => {
    const query = new QueryCommand({
        TableName: process.env.EMAIL_WHITE_LIST_TABLE!,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
            ':email': email,
        },
    });

    const {Items: items} = await dynamo.send(query);
    return items && items.length ? items[0] as BlackWhiteListEntity : null;
};

export const saveWhiteList = async (email: string, requestId: string): Promise<void> => {
    const params = {
        TableName: process.env.EMAIL_WHITE_LIST_TABLE!,
        Item: { email, requestId, createdAt: new Date().toISOString() },
    };

    await dynamo.send(new PutCommand(params));
};