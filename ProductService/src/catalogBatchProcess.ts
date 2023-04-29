import { DynamoDB, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { APIGatewayProxyHandler, SQSHandler, SQSRecord } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuid } from 'uuid';

import { isProductUserInput, Product } from './types.ts';
import type { ProductUserInput, DBStock, DBProduct } from './types.ts';
import { addProductToDb, makeResponse } from './utils.ts';
import * as process from 'process';

const processEvent = async (records: SQSRecord[]) => {
  if (!records.length) {
    throw Error('Products not found in event');
  }

  const DYNDB_PRODUCTS_TABLE_NAME = process.env.DYNDB_PRODUCTS_TABLE_NAME ?? '';
  const DYNDB_STOCKS_TABLE_NAME = process.env.DYNDB_STOCKS_TABLE_NAME ?? '';
  const REGION = process.env.REGION ?? '';
  const SNS_ARN = process.env.SNS_ARN ?? '';

  const sns = new SNSClient({ region: REGION });

  const insertedProducts: Product[] = [];

  try {
    for (const record of records) {
      const product = JSON.parse(record.body);
      if (!isProductUserInput(product)) {
        throw Error(`Parsed product is malformed: ${product}`);
      }

      const insertedProduct = await addProductToDb(
        DYNDB_PRODUCTS_TABLE_NAME,
        DYNDB_STOCKS_TABLE_NAME,
        product
      );

      insertedProducts.push(insertedProduct);

      const command = new PublishCommand({
        Subject: 'Product Creation',
        Message: JSON.stringify(insertedProducts),
        MessageAttributes: {
          ProductPrice: {
            DataType: 'Number',
            StringValue: String(product.price),
          },
        },
        TopicArn: SNS_ARN,
      });

      const res = await sns.send(command);
      console.log('sendResult', res);
      return insertedProducts;
    }
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    throw e;
  }
};

export const catalogBatchProcess: SQSHandler = async (event) => {
  try {
    const products = await processEvent(event.Records);
    console.log('Inserted products', products);
  } catch (e) {
    return { batchItemFailures: [{ itemIdentifier: 'unknown' }] }; // TODO: find failed item identifier
  }
};
