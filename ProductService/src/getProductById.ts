import { APIGatewayProxyHandler } from 'aws-lambda';
import { products } from './data/products.ts';
import type { Product } from './types.ts';

type PathParameters = {
  id: String;
} | null;

const getProduct = (id: String | undefined): Product | null => {
  if (!id) return null;
  const product = products.find(({ id: itemId }) => itemId === id);
  return product ? product : null;
};

export const getProductById: APIGatewayProxyHandler = async (event) => {
  const id = (event.pathParameters as PathParameters)?.id;
  const product = getProduct(id);

  if (!product)
    return {
      statusCode: 404,
      body: 'Product not found',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };

  return {
    statusCode: 200,
    body: JSON.stringify(product),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
};
