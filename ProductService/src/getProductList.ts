import { APIGatewayProxyHandler } from 'aws-lambda';
import { products } from './data/products.ts';
import type { Product } from './types.ts';

const getProducts = (): Product[] => (Array.isArray(products) ? products : []);

export const getProductList: APIGatewayProxyHandler = async () => {
  const products = getProducts();
  return {
    statusCode: 200,
    body: JSON.stringify(products),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
};
