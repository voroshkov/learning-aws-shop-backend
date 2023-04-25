export const makeResponse = (statusCode: number, body: string) => ({
  statusCode,
  body,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
  },
});
