import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { products } from './Data/products.js';

dotenv.config({ path: '../.env' });

const accessKeyId = process.env.DYNAMODB_ACCESS_KEY_ID;
const secretAccessKey = process.env.DYNAMODB_SECRET_ACCESS_KEY;
const region = 'us-east-1';

const dynamoDB = new DynamoDB({
  region: region,
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
});

for (const { description, id, price, title, count } of products) {
  const productItem = {
    Item: {
      id: { S: id },
      title: { S: title },
      price: { N: price.toString() },
      description: { S: description },
    },
    TableName: 'Products',
  };

  const stockItem = {
    Item: {
      productId: { S: id },
      count: { N: count.toString() },
    },
    TableName: 'Stocks',
  };

  await dynamoDB.putItem(productItem);
  await dynamoDB.putItem(stockItem);
}
