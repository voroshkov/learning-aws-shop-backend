import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import * as snsClient from '@aws-sdk/client-sns';
import { SNSClient } from '@aws-sdk/client-sns';
import { catalogBatchProcess } from '../catalogBatchProcess.ts';
import * as utils from '../utils.ts';
import { SQSRecord } from 'aws-lambda';
import { DBProduct, Product, ProductUserInput } from '../types.js';
import { SQSEvent } from 'aws-lambda/trigger/sqs.js';
import { addProductToDb } from '../utils.ts';

jest.mock('@aws-sdk/client-sns', () => {
  return {
    __esModule: true,
    ...jest.requireActual('@aws-sdk/client-sns'),
  };
});

const makeEvent = (product: ProductUserInput): SQSEvent => ({
  Records: [
    {
      body: JSON.stringify(product),
    } as unknown as SQSRecord,
  ],
});

const product: ProductUserInput = {
  count: 1,
  description: 'dsc',
  price: 15,
  title: 'title',
};
describe('catalogBatchProcess lambda', () => {
  const snsSendMock = jest.fn();
  const snsClientObjectMock = { send: snsSendMock };
  let snsClientMock: jest.SpyInstance;
  let addProductToDbMock: jest.SpyInstance;

  beforeEach(() => {
    process.env = Object.assign(process.env, {
      DYNDB_PRODUCTS_TABLE_NAME: 'testProductsTable',
      DYNDB_STOCKS_TABLE_NAME: 'testStocksTable',
      REGION: 'testRegion',
      SNS_ARN: 'testSnsArn',
    });

    console.log('SNS_ARN in beforeeach', process.env.SNS_ARN);

    snsClientMock = jest
      .spyOn(snsClient, 'SNSClient')
      .mockImplementation(
        (() => snsClientObjectMock) as unknown as () => SNSClient
      );

    addProductToDbMock = jest
      .spyOn(utils, 'addProductToDb')
      .mockResolvedValue({ ...product, id: 'testID' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should invoke addProductToDb and send SNS message with inserted product', async () => {
    console.log('SNS_ARN in test', process.env.SNS_ARN);

    const event = makeEvent(product);

    const result = await catalogBatchProcess(event, {} as Context, jest.fn());

    expect(snsClientMock).toHaveBeenCalledTimes(1);
    expect(snsClientMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      {
        "region": "testRegion",
      }
    `);
    expect(addProductToDbMock).toHaveBeenCalledTimes(1);
    expect(addProductToDbMock.mock.calls[0]).toMatchInlineSnapshot(`
      [
        "testProductsTable",
        "testStocksTable",
        {
          "count": 1,
          "description": "dsc",
          "price": 15,
          "title": "title",
        },
      ]
    `);

    expect(snsSendMock).toHaveBeenCalledTimes(1);
    expect(snsSendMock.mock.calls[0][0].input).toMatchInlineSnapshot(`
      {
        "Message": "[{"count":1,"description":"dsc","price":15,"title":"title","id":"testID"}]",
        "MessageAttributes": {
          "ProductPrice": {
            "DataType": "Number",
            "StringValue": "15",
          },
        },
        "Subject": "Product Creation",
        "TopicArn": "testSnsArn",
      }
    `);
  });
});
