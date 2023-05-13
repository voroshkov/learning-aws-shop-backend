export const makeResponse = (statusCode: number, body: string) => ({
  statusCode,
  body,
  headers: {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
  },
});
