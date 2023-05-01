import { APIGatewayEvent, Context } from 'aws-lambda';
import { getProductList } from '../getProductList.ts';

const context = {} as Context;
const callback = () => {};
const event: APIGatewayEvent = {} as unknown as APIGatewayEvent;

const fail = (msg: string) => {
  throw 'Test Failed with message: ' + msg;
};

describe('getProductList', () => {
  test('should return products from dynamoDB', async () => {
    const res = await getProductList(event, context, callback);
    if (!res) fail('Result should be defined');

    const { body } = res;

    // TODO: implement test body

    fail('Test not implemented');
    // expect(body).toEqual(JSON.stringify(products));
  });
});
