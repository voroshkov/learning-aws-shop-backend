import { APIGatewayProxyHandler } from 'aws-lambda';

import { isProductUserInput } from './types.ts';
import { addProductToDb, makeResponse } from './utils.ts';

const DYNDB_PRODUCTS_TABLE_NAME = process.env.DYNDB_PRODUCTS_TABLE_NAME;
const DYNDB_STOCKS_TABLE_NAME = process.env.DYNDB_STOCKS_TABLE_NAME;

export const createProduct: APIGatewayProxyHandler = async (event) => {
  const { body } = event;

  let product;
  try {
    product = JSON.parse(body ?? '');
    if (!isProductUserInput(product)) throw new Error();
  } catch (e) {
    return makeResponse(400, 'Malformed product data');
  }

  if (!DYNDB_PRODUCTS_TABLE_NAME || !DYNDB_STOCKS_TABLE_NAME) {
    return makeResponse(500, 'Missing environment variables');
  }

  try {
    await addProductToDb(
      DYNDB_PRODUCTS_TABLE_NAME,
      DYNDB_STOCKS_TABLE_NAME,
      product
    );

    return makeResponse(200, 'OK');
  } catch (e: unknown) {
    return makeResponse(500, 'Error inserting data');
  }
};
