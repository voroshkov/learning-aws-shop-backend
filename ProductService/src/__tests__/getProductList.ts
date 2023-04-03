import { APIGatewayEvent, Context } from 'aws-lambda';
import { getProductList } from '../getProductList.ts';
import { products } from '../data/products.ts';

const context = {} as Context;
const callback = () => {};

describe('getProductList', () => {
  test('should return product by id', async () => {
    const product = products[0];
    const event: APIGatewayEvent = {
      pathParameters: { id: product.id },
    } as unknown as APIGatewayEvent;

    const res = await getProductList(event, context, callback);
    if (!res) fail('Result should be defined');
    const { body } = res;
    expect(body).toEqual(JSON.stringify(products));
  });
});
