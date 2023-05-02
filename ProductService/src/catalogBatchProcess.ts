import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SQSHandler, SQSRecord } from 'aws-lambda';

import { isProductUserInput, Product } from './types.ts';
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
  const failedToProcessMessageIds: string[] = [];

  for (const record of records) {
    const product = JSON.parse(record.body);
    const messageId = record.messageId;

    if (!isProductUserInput(product)) {
      throw Error(`Parsed product is malformed: ${product}`);
    }

    try {
      const insertedProduct = await addProductToDb(
        DYNDB_PRODUCTS_TABLE_NAME,
        DYNDB_STOCKS_TABLE_NAME,
        product
      );
      insertedProducts.push(insertedProduct);
    } catch (e) {
      failedToProcessMessageIds.push(messageId);
      console.error('Error during product insertion');
      if (e instanceof Error) console.error(e.message);
    }

    const command = new PublishCommand({
      Subject: 'Product Creation',
      Message: JSON.stringify(product),
      MessageAttributes: {
        ProductPrice: {
          DataType: 'Number',
          StringValue: String(product.price),
        },
      },
      TopicArn: SNS_ARN,
    });

    try {
      const res = await sns.send(command);
      if (res.$metadata.httpStatusCode !== 200) {
        console.error('Error during SNS publish', res.$metadata);
      }
    } catch (e) {
      console.error('Error during SNS publish');
      if (e instanceof Error) console.error(e.message);
    }
  }

  return { insertedProducts, failedToProcessMessageIds };
};

export const catalogBatchProcess: SQSHandler = async (event) => {
  const { insertedProducts, failedToProcessMessageIds } = await processEvent(
    event.Records
  );
  const batchItemFailures = failedToProcessMessageIds.map((id) => ({
    itemIdentifier: id,
  }));

  return { batchItemFailures };
};
