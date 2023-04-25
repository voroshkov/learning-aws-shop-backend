import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuid } from 'uuid';

import { isProductUserInput } from './types.ts';
import type { ProductUserInput, DBStock, DBProduct } from './types.ts';
import { makeResponse } from './utils.js';

const DYNDB_PRODUCTS_TABLE_NAME = process.env.DYNDB_PRODUCTS_TABLE_NAME;
const DYNDB_STOCKS_TABLE_NAME = process.env.DYNDB_STOCKS_TABLE_NAME;

const addProductToDb = async (
  inputProduct: ProductUserInput
): Promise<void> => {
  const dynamoDB = new DynamoDB({});

  const id = uuid();
  const { count, ...productInputData } = inputProduct;

  const productData: DBProduct = { ...productInputData, id };
  const productItem = marshall(productData);

  const stockData: DBStock = { productId: id, count };
  const stockItem = marshall(stockData);

  const transactionResult = await dynamoDB.transactWriteItems({
    TransactItems: [
      {
        Put: {
          TableName: DYNDB_PRODUCTS_TABLE_NAME,
          Item: productItem,
        },
      },
      {
        Put: {
          TableName: DYNDB_STOCKS_TABLE_NAME,
          Item: stockItem,
        },
      },
    ],
  });

  console.log(
    'putProductResult',
    JSON.stringify(transactionResult, null, 2),
    '\n\n'
  );

  if (transactionResult.$metadata.httpStatusCode !== 200) {
    throw new Error('Write transaction failed');
  }
};

export const createProduct: APIGatewayProxyHandler = async (event) => {
  const { body } = event;

  let product;
  try {
    product = JSON.parse(body ?? '');
    if (!isProductUserInput(product)) throw new Error();
  } catch (e) {
    return makeResponse(400, 'Malformed product data');
  }

  try {
    await addProductToDb(product);

    return makeResponse(200, 'OK');
  } catch (e: unknown) {
    return makeResponse(500, 'Error inserting data');
  }
};
