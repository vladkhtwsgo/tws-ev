import { handler } from '../lambda/functions/validation/check-status/handler';
import { createResponse } from "../lambda/shared/utils";
import { findValidationResultByRequestId } from "../lambda/shared/services/dynamo.service";
import { findLogsByRequestId } from "../lambda/shared/services/timestream.service";
import {HttpStatus, ValidationStatus} from "../lambda/shared/enums";
import { EmailNotFoundException } from "../lambda/shared/exceptions";
import { EmailValidationResult, LogEntry } from "../lambda/shared/interfaces";

jest.mock('../lambda/shared/services/dynamo.service');
jest.mock('../lambda/shared/services/timestream.service');
jest.mock('../lambda/shared/utils');

const mockCreateResponse = createResponse as jest.MockedFunction<typeof createResponse>;
const mockFindValidationResultByRequestId = findValidationResultByRequestId as jest.MockedFunction<typeof findValidationResultByRequestId>;
const mockFindLogsByRequestId = findLogsByRequestId as jest.MockedFunction<typeof findLogsByRequestId>;

describe('Lambda Function Handler', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should return BAD_REQUEST if requestId is missing', async () => {
        const event = { pathParameters: {} };
        mockCreateResponse.mockReturnValueOnce({ statusCode: HttpStatus.BAD_REQUEST, body: '' });

        const response = await handler(event);

        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return OK and the validation result with trace log', async () => {
        const requestId = '123';
        const event = { pathParameters: { requestId } };
        const mockValidationResult: EmailValidationResult= {
            email: 'test@example.com',
            requestId: requestId,
            score: 18,
            validationStatus: ValidationStatus.COMPLETED,
            traceLog: [{
                requestId,
                validator: 'regexp',
                message: 'Log message',
                timestamp: new Date().toISOString(),
                points: 10
            }]
        };
        const mockTraceLog: LogEntry[] = [
            {
                requestId,
                validator: 'regexp',
                message: 'Log message',
                timestamp: new Date().toISOString(),
                points: 10
            }
        ];

        mockFindValidationResultByRequestId.mockResolvedValueOnce(mockValidationResult);
        mockFindLogsByRequestId.mockResolvedValueOnce(mockTraceLog);
        mockCreateResponse.mockReturnValueOnce({
            statusCode: HttpStatus.OK,
            body: JSON.stringify({ ...mockValidationResult, traceLog: mockTraceLog })
        });

        const response = await handler(event);

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(JSON.parse(response.body)).toEqual({ ...mockValidationResult, traceLog: mockTraceLog });
    });

    it('should return NOT_FOUND if EmailNotFoundException is thrown', async () => {
        const requestId = '123';
        const event = { pathParameters: { requestId } };

        mockFindValidationResultByRequestId.mockRejectedValueOnce(new EmailNotFoundException());
        mockCreateResponse.mockReturnValueOnce({ statusCode: HttpStatus.NOT_FOUND, body: '' });

        const response = await handler(event);

        expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return INTERNAL_SERVER_ERROR for other errors', async () => {
        const requestId = '123';
        const event = { pathParameters: { requestId } };

        mockFindValidationResultByRequestId.mockRejectedValueOnce(new Error('Some other error'));
        mockCreateResponse.mockReturnValueOnce({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, body: '' });

        const response = await handler(event);

        expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
});
