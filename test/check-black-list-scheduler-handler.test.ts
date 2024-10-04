import { handler } from '../lambda/functions/schedule/check-black-list/handler';
import { findAllBlackListItems, deleteEmailsFromBlacklist } from '../lambda/shared/services/dynamo.service';
import { sendPayloadToSqs } from '../lambda/shared/services/sqs.service';
import { saveTSMessage } from '../lambda/shared/services/timestream.service';
import { BlackWhiteListEntity } from '../lambda/shared/interfaces';
import { ValidationLogNames } from '../lambda/shared/enums';

jest.mock('../lambda/shared/services/dynamo.service');
jest.mock('../lambda/shared/services/sqs.service');
jest.mock('../lambda/shared/services/timestream.service');

const mockFindAllBlackListItems = findAllBlackListItems as jest.MockedFunction<typeof findAllBlackListItems>;
const mockDeleteEmailsFromBlacklist = deleteEmailsFromBlacklist as jest.MockedFunction<typeof deleteEmailsFromBlacklist>;
const mockSendPayloadToSqs = sendPayloadToSqs as jest.MockedFunction<typeof sendPayloadToSqs>;
const mockSaveTSMessage = saveTSMessage as jest.MockedFunction<typeof saveTSMessage>;

const sqsMessageId = {
  $metadata: {
    httpStatusCode: 200,
    requestId: "0518e8ff-8ca5-565d-9d78-b78678e80fe2",
    attempts: 1,
    totalRetryDelay: 0
  },
  MD5OfMessageBody: "1f4136ffbd49a420c812367e174fca54",
  MessageId: "cd278a3e-6592-473d-a1d6-da8ee357d029"
};

describe('CheckBlackListLambda handler', () => {
  const mockDate = new Date('2024-10-02T14:10:15.738Z');
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.resetAllMocks();
    process.env.REHABILITATED_EMAIL_DOMAINS = 'rehabilitated.com';
    process.env.BANNED_EMAIL_DOMAINS = 'banned.com';
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as Date);
  });

  it('should rehabilitate emails and recheck others', async () => {
    const oneWeekAgo = new Date(+(new Date()) - 7 * 24 * 60 * 60 * 1000).toISOString();

    const blackListItems: BlackWhiteListEntity[] = [
      { email: 'user@rehabilitated.com', requestId: '123', score: 10, createdAt: oneWeekAgo },
      { email: 'user@other.com', requestId: '124', score: 5, createdAt: oneWeekAgo },
    ];

    mockFindAllBlackListItems.mockResolvedValueOnce(blackListItems);

    mockSendPayloadToSqs.mockResolvedValueOnce(sqsMessageId);
    mockSaveTSMessage.mockResolvedValueOnce();

    await handler();

    expect(mockFindAllBlackListItems).toHaveBeenCalledWith({
      FilterExpression: 'createdAt < :oneWeekAgo',
      ExpressionAttributeValues: { ':oneWeekAgo': oneWeekAgo },
    });

    expect(mockDeleteEmailsFromBlacklist).toHaveBeenCalledWith([
      'user@rehabilitated.com',
      'user@other.com',
    ]);

    expect(mockSendPayloadToSqs).toHaveBeenCalledWith('124', 'user@other.com');

    expect(mockSaveTSMessage).toHaveBeenCalledWith(
      '123',
      ValidationLogNames.BLACK_LIST,
      10,
      'The email was rehabilitated'
    );
    expect(mockSaveTSMessage).toHaveBeenCalledWith(
      '124',
      ValidationLogNames.BLACK_LIST,
      5,
      'The email was requested to recheck validation'
    );

    expect(console.log).toHaveBeenCalledWith(
      'The email: user@rehabilitated.com was rehabilitated.'
    );
  });

  it('should skip banned emails', async () => {
    const oneWeekAgo = new Date(+(new Date()) - 7 * 24 * 60 * 60 * 1000).toISOString();

    const blackListItems: BlackWhiteListEntity[] = [
      { email: 'user@banned.com', requestId: '125', score: 8, createdAt: oneWeekAgo },
      { email: 'user@other.com', requestId: '124', score: 5, createdAt: oneWeekAgo },
    ];

    mockFindAllBlackListItems.mockResolvedValueOnce(blackListItems);

    mockSendPayloadToSqs.mockResolvedValueOnce(sqsMessageId);
    mockSaveTSMessage.mockResolvedValueOnce();

    await handler();

    expect(mockDeleteEmailsFromBlacklist).toHaveBeenCalledWith([
      'user@other.com',
    ]);
  });

  it('should log an error if findAllBlackListItems throws an error', async () => {
    const error = new Error('DynamoDB error');
    mockFindAllBlackListItems.mockRejectedValueOnce(error);

    await handler();

    expect(console.error).toHaveBeenCalledWith(
      'Error during the checking the black list in scheduler',
      error
    );
  });
});
