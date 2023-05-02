import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import * as s3client from '@aws-sdk/client-s3';
import * as requestPresigner from '@aws-sdk/s3-request-presigner';
import { handler } from '../index.ts';
import { S3Client } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    __esModule: true,
    ...jest.requireActual('@aws-sdk/s3-request-presigner'),
  };
});

jest.mock('@aws-sdk/client-s3', () => {
  return {
    __esModule: true,
    ...jest.requireActual('@aws-sdk/client-s3'),
  };
});

const makeEvent = (fileName?: string): APIGatewayProxyEvent =>
  ({
    queryStringParameters: { ...(fileName ? { name: fileName } : {}) },
  } as unknown as APIGatewayProxyEvent);

describe('ImportProductsFile lambda', () => {
  const s3ClientObjectMock = {};
  const signedUrlMock = 'testURLMock';
  let s3ClientMock: jest.SpyInstance;
  let getSignedUrlMock: jest.SpyInstance;

  beforeEach(() => {
    process.env = Object.assign(process.env, {
      REGION: 'testRegion',
      BUCKET_NAME: 'testBucket',
      UPLOAD_PATH: 'testUploadPath',
      SQS_QUEUE_NAME: 'testQueueName',
    });

    s3ClientMock = jest
      .spyOn(s3client, 'S3Client')
      .mockImplementation((() => s3ClientObjectMock) as () => S3Client);

    getSignedUrlMock = jest
      .spyOn(requestPresigner, 'getSignedUrl')
      .mockResolvedValue(signedUrlMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should create pre-signed URL with specified params', async () => {
    const fileName = 'testFileName.csv';
    const event = makeEvent(fileName);

    const result = await handler(event, {} as Context, jest.fn());

    expect(result).toMatchInlineSnapshot(`
      {
        "body": "testURLMock",
        "headers": {
          "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
        "statusCode": 200,
      }
    `);

    expect(s3ClientMock).toHaveBeenCalledTimes(1);
    expect(s3ClientMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      {
        "region": "testRegion",
      }
    `);

    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    const [client, command] = getSignedUrlMock.mock.calls[0];

    expect(client).toBe(s3ClientObjectMock);
    expect(command.input).toMatchInlineSnapshot(`
      {
        "Bucket": "testBucket",
        "Key": "testUploadPath/testFileName.csv",
      }
    `);
  });

  test('should return error code if file name is not provided', async () => {
    const event = makeEvent();

    const result = await handler(event, {} as Context, jest.fn());

    expect(result).toMatchInlineSnapshot(`
      {
        "body": "File name must be provided",
        "headers": {
          "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
        "statusCode": 400,
      }
    `);
  });
});
