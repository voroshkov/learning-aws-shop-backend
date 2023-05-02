import { DynamoDB, ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { APIGatewayProxyHandler } from 'aws-lambda';

import type { Product } from './types.ts';
import { isProduct } from './types.ts';
import { makeResponse } from './utils.ts';

const DYNDB_PRODUCTS_TABLE_NAME = process.env.DYNDB_PRODUCTS_TABLE_NAME;
const DYNDB_STOCKS_TABLE_NAME = process.env.DYNDB_STOCKS_TABLE_NAME;

const unmarshalArray = (items: Array<any>) =>
  items.map((item) => unmarshall(item));

const join = (
  productsScanRes: ScanCommandOutput,
  stocksScanRes: ScanCommandOutput
): Product[] | null => {
  if (!productsScanRes.Items || !stocksScanRes.Items) return null;

  const stocks = unmarshalArray(stocksScanRes.Items);

  return productsScanRes.Items.reduce<Product[]>((acc, productItem) => {
    const product = unmarshall(productItem);
    const id = product.id;
    const stockItem = stocks.find((item) => item.productId === id);

    if (!stockItem) return acc;

    const possiblyProduct = { ...product, count: stockItem.count };

    if (!isProduct(possiblyProduct)) return acc;

    acc.push(possiblyProduct);

    return acc;
  }, []);
};

const getProducts = async (): Promise<Product[] | null> => {
  const dynamoDB = new DynamoDB({});
  const productsScanRes = await dynamoDB.scan({
    TableName: DYNDB_PRODUCTS_TABLE_NAME,
    AttributesToGet: ['id', 'title', 'description', 'price'],
  });

  const stocksScanRes = await dynamoDB.scan({
    TableName: DYNDB_STOCKS_TABLE_NAME,
    AttributesToGet: ['productId', 'count'],
  });

  return join(productsScanRes, stocksScanRes);
};

export const getProductList: APIGatewayProxyHandler = async () => {
  try {
    const products = await getProducts();
    if (!products) return makeResponse(404, 'Could not retrieve products');

    return makeResponse(200, JSON.stringify(products));
  } catch (e: any) {
    return makeResponse(500, 'Failure during product retrieval');
  }
};
