import { APIGatewayEvent, Context } from 'aws-lambda';
import { getProductById } from '../getProductById.ts';
import { products } from '../data/products.ts';

const context = {} as Context;
const callback = () => {};

describe('getProductById', () => {
  test('should return product by id', async () => {
    const product = products[0];
    const event: APIGatewayEvent = {
      pathParameters: { id: product.id },
    } as unknown as APIGatewayEvent;

    const res = await getProductById(event, context, callback);
    expect(res).toMatchInlineSnapshot(`
      {
        "body": "{"description":"AV Short Product Description1","id":"7567ec4b-b10c-48c5-9345-fc73c48a80aa","price":24,"title":"AV Product A"}",
        "headers": {
          "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Origin": "*",
        },
        "statusCode": 200,
      }
    `);
  });

  test('should return "not found" error if product with specified id does not exist', async () => {
    const event: APIGatewayEvent = {
      pathParameters: { id: '1234' },
    } as unknown as APIGatewayEvent;

    const res = await getProductById(event, context, callback);
    expect(res).toMatchInlineSnapshot(`
      {
        "body": "Product not found",
        "headers": {
          "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Origin": "*",
        },
        "statusCode": 404,
      }
    `);
  });
});
