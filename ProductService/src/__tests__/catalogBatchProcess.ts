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

const makeEvent = (products: ProductUserInput[]): SQSEvent => ({
  Records: products.map(
    (product) =>
      ({
        body: JSON.stringify(product),
      } as unknown as SQSRecord)
  ),
});

const makeEventWithMessageIds = (
  products: ProductUserInput[],
  messageIds: string[]
): SQSEvent => {
  if (products.length !== messageIds.length) {
    throw new Error('messageIds length must be equal to products length');
  }
  const records = products.map(
    (product, index) =>
      ({
        body: JSON.stringify(product),
        messageId: messageIds[index],
      } as unknown as SQSRecord)
  );
  return { Records: records };
};

const product1: ProductUserInput = {
  count: 1,
  description: 'dsc1',
  price: 15,
  title: 'title1',
};

const product2: ProductUserInput = {
  count: 2,
  description: 'dsc2',
  price: 25,
  title: 'title2',
};

const product3: ProductUserInput = {
  count: 3,
  description: 'dsc3',
  price: 35,
  title: 'title3',
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

    snsClientMock = jest
      .spyOn(snsClient, 'SNSClient')
      .mockImplementation(
        (() => snsClientObjectMock) as unknown as () => SNSClient
      );

    addProductToDbMock = jest
      .spyOn(utils, 'addProductToDb')
      .mockImplementation((_, __, product: ProductUserInput) =>
        Promise.resolve({
          ...product,
          id: 'testID',
        })
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should invoke addProductToDb and send SNS message with inserted product', async () => {
    const event = makeEvent([product1]);

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
          "description": "dsc1",
          "price": 15,
          "title": "title1",
        },
      ]
    `);

    expect(snsSendMock).toHaveBeenCalledTimes(1);
    expect(snsSendMock.mock.calls[0][0].input).toMatchInlineSnapshot(`
      {
        "Message": "{"count":1,"description":"dsc1","price":15,"title":"title1"}",
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

  test('should invoke addProductToDb and send SNS message N times corresponding to products count', async () => {
    const event = makeEvent([product1, product2]);

    const result = await catalogBatchProcess(event, {} as Context, jest.fn());

    expect(snsClientMock).toHaveBeenCalledTimes(1);
    expect(snsClientMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      {
        "region": "testRegion",
      }
    `);
    expect(addProductToDbMock).toHaveBeenCalledTimes(2);
    expect(addProductToDbMock.mock.calls[0]).toMatchInlineSnapshot(`
      [
        "testProductsTable",
        "testStocksTable",
        {
          "count": 1,
          "description": "dsc1",
          "price": 15,
          "title": "title1",
        },
      ]
    `);
    expect(addProductToDbMock.mock.calls[1]).toMatchInlineSnapshot(`
      [
        "testProductsTable",
        "testStocksTable",
        {
          "count": 2,
          "description": "dsc2",
          "price": 25,
          "title": "title2",
        },
      ]
    `);

    expect(snsSendMock).toHaveBeenCalledTimes(2);
    expect(snsSendMock.mock.calls[0][0].input).toMatchInlineSnapshot(`
      {
        "Message": "{"count":1,"description":"dsc1","price":15,"title":"title1"}",
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
    expect(snsSendMock.mock.calls[1][0].input).toMatchInlineSnapshot(`
      {
        "Message": "{"count":2,"description":"dsc2","price":25,"title":"title2"}",
        "MessageAttributes": {
          "ProductPrice": {
            "DataType": "Number",
            "StringValue": "25",
          },
        },
        "Subject": "Product Creation",
        "TopicArn": "testSnsArn",
      }
    `);
  });

  test('should report ids of not inserted messages on failure', async () => {
    addProductToDbMock = jest
      .spyOn(utils, 'addProductToDb')
      .mockImplementationOnce((_, __, product: ProductUserInput) =>
        Promise.reject()
      )
      .mockImplementationOnce((_, __, product: ProductUserInput) =>
        Promise.reject()
      )
      .mockImplementationOnce((_, __, product: ProductUserInput) =>
        Promise.resolve({
          ...product,
          id: 'testID',
        })
      );

    const event = makeEventWithMessageIds(
      [product1, product2, product3],
      ['111', '222', '333']
    );
    const result = await catalogBatchProcess(event, {} as Context, jest.fn());
    expect(result).toMatchInlineSnapshot(`
      {
        "batchItemFailures": [
          {
            "itemIdentifier": "111",
          },
          {
            "itemIdentifier": "222",
          },
        ],
      }
    `);
  });
});
