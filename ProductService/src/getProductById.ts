import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { Product } from './types.ts';
import { isProduct } from './types.ts';
import { makeResponse } from './utils.js';

type PathParameters = {
  id: string;
} | null;

const DYNDB_PRODUCTS_TABLE_NAME = process.env.DYNDB_PRODUCTS_TABLE_NAME;
const DYNDB_STOCKS_TABLE_NAME = process.env.DYNDB_STOCKS_TABLE_NAME;

const getProduct = async (id: string | undefined): Promise<Product | null> => {
  if (!id) return null;

  const dynamoDB = new DynamoDB({});

  const productItem = await dynamoDB.getItem({
    TableName: DYNDB_PRODUCTS_TABLE_NAME,
    Key: { id: { S: id } },
  });

  const stockItem = await dynamoDB.getItem({
    TableName: DYNDB_STOCKS_TABLE_NAME,
    Key: { productId: { S: id } },
  });

  if (!productItem?.Item || !stockItem?.Item) return null;

  const product = unmarshall(productItem.Item) as Partial<Product>;
  const { count } = unmarshall(stockItem.Item);

  const possiblyProduct = { ...product, count };

  if (!isProduct(possiblyProduct)) return null;

  return possiblyProduct;
};

export const getProductById: APIGatewayProxyHandler = async (event) => {
  const id = (event.pathParameters as PathParameters)?.id;

  console.log('Request event', JSON.stringify(event, null, 2), '\n\n');

  try {
    const product = await getProduct(id);

    if (!product) return makeResponse(404, 'Product not found');

    return makeResponse(200, JSON.stringify(product));
  } catch (e: any) {
    return makeResponse(500, 'Failed to retrieve product');
  }
};
