import { DBProduct, DBStock, Product, ProductUserInput } from './types.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { v4 as uuid } from 'uuid';
import { marshall } from '@aws-sdk/util-dynamodb';

export const makeResponse = (statusCode: number, body: string) => ({
  statusCode,
  body,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
  },
});

export const addProductToDb = async (
  productsTableName: string,
  stocksTableName: string,
  inputProduct: ProductUserInput
): Promise<Product> => {
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
          TableName: productsTableName,
          Item: productItem,
        },
      },
      {
        Put: {
          TableName: stocksTableName,
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

  return { id, ...inputProduct };
};
