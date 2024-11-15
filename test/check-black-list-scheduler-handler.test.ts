import { handler } from '../lambda/functions/schedule/check-black-list/handler';
import { findAllBlackListItems, deleteEmailsFromBlacklist } from '../lambda/shared/services/dynamo.service';
import { sendPayloadToSqs } from '../lambda/shared/services/sqs.service';
import { saveTSMessage } from '../lambda/shared/services/timestream.service';
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
    requestId: '0518e8ff-8ca5-565d-9d78-b78678e80fe2',
    attempts: 1,
    totalRetryDelay: 0,
  },
  MD5OfMessageBody: '1f4136ffbd49a420c812367e174fca54',
  MessageId: 'cd278a3e-6592-473d-a1d6-da8ee357d029',
};

describe('CheckBlackListLambda handler', () => {
  const mockDate = new Date('2024-10-02T14:10:15.738Z');
  const domainRehabilitateList = ['rehabilitated.com'];
  const domainBlackList = ['banned.com'];

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.resetAllMocks();
    process.env.DOMAIN_REHABILITATE_LIST = domainRehabilitateList.join(',');
    process.env.DOMAIN_BLACK_LIST = domainBlackList.join(',');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as Date);
  });

  it('should rehabilitate emails and recheck others', async () => {
    const oneWeekAgo = new Date(+(mockDate) - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeekAgo = new Date(+(mockDate) - 14 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(+(mockDate) - 30 * 24 * 60 * 60 * 1000).toISOString();

    const blackListItemsToRehabilitate = [
      { email: 'user@rehabilitated.com', requestId: '123', score: 10, createdAt: oneWeekAgo, recheckAttempts: 0 },
    ];

    const blackListItemsToCheck = [
      { email: 'user@other.com', requestId: '124', score: 5, createdAt: oneWeekAgo, recheckAttempts: 0 },
    ];

    mockFindAllBlackListItems
      .mockResolvedValueOnce(blackListItemsToRehabilitate)
      .mockResolvedValueOnce(blackListItemsToCheck);

    mockSendPayloadToSqs.mockResolvedValueOnce(sqsMessageId);
    mockSaveTSMessage.mockResolvedValue();

    await handler();

    expect(mockFindAllBlackListItems).toHaveBeenCalledWith({
      FilterExpression: 'contains(email, :domain0)',
      ExpressionAttributeValues: { ':domain0': '@rehabilitated.com' },
    });

    expect(mockDeleteEmailsFromBlacklist).toHaveBeenCalledWith(['user@rehabilitated.com']);

    expect(mockSaveTSMessage).toHaveBeenCalledWith(
      '123',
      ValidationLogNames.BLACK_LIST,
      10,
      'The email was rehabilitated',
    );

    expect(mockFindAllBlackListItems).toHaveBeenCalledWith({
      FilterExpression:
        '((createdAt < :oneWeekAgo AND recheckAttempts = :zeroAttempts) OR (createdAt < :twoWeekAgo AND recheckAttempts = :oneAttempt) OR (createdAt < :monthAgo AND recheckAttempts = :twoAttempts)) AND NOT contains(:excludedDomains, email)',
      ExpressionAttributeValues: {
        ':oneWeekAgo': oneWeekAgo,
        ':twoWeekAgo': twoWeekAgo,
        ':monthAgo': monthAgo,
        ':zeroAttempts': 0,
        ':oneAttempt': 1,
        ':twoAttempts': 2,
        ':excludedDomains': [...domainRehabilitateList, ...domainBlackList],
      },
    });

    expect(mockSendPayloadToSqs).toHaveBeenCalledWith('124', 'user@other.com');

    expect(mockSaveTSMessage).toHaveBeenCalledWith(
      '124',
      ValidationLogNames.BLACK_LIST,
      5,
      'The email was requested to recheck validation',
    );

    expect(console.log).toHaveBeenCalledWith('The emails user@rehabilitated.com need to rehabilitate');
    expect(console.log).toHaveBeenCalledWith(
      'The emails user@other.com need to recheck',
    );
  });

  it('should skip banned and rehabilitated emails', async () => {
    const oneWeekAgo = new Date(+(new Date()) - 7 * 24 * 60 * 60 * 1000).toISOString();

    const blackListItems = [
      { email: 'user@banned.com', requestId: '125', score: 8, createdAt: oneWeekAgo, recheckAttempts: 0 },
      { email: 'user@other.com', requestId: '126', score: 5, createdAt: oneWeekAgo, recheckAttempts: 0 },
      { email: 'user@rehabilitated.com', requestId: '123', score: 10, createdAt: oneWeekAgo, recheckAttempts: 0 },
    ];

    mockFindAllBlackListItems
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(blackListItems.filter(item => !domainBlackList.includes(item.email.split('@')[1])));

    mockSendPayloadToSqs.mockResolvedValueOnce(sqsMessageId);
    mockSaveTSMessage.mockResolvedValueOnce();

    await handler();

    expect(mockFindAllBlackListItems).toHaveBeenCalledTimes(2);

    expect(mockSendPayloadToSqs).toHaveBeenCalledWith('126', 'user@other.com');

    expect(mockSaveTSMessage).toHaveBeenCalledWith(
      '126',
      ValidationLogNames.BLACK_LIST,
      5,
      'The email was requested to recheck validation'
    );
  });


  it('should log an error if findAllBlackListItems throws an error', async () => {
    const error = new Error('DynamoDB error');
    mockFindAllBlackListItems.mockRejectedValueOnce(error);

    await handler();

    expect(console.error).toHaveBeenCalledWith(
      'Error during the checking the black list in scheduler',
      error,
    );
  });
});
