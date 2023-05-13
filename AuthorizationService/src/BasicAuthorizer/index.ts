import { APIGatewayTokenAuthorizerHandler, PolicyDocument } from 'aws-lambda';
import { Buffer } from 'node:buffer';

export const makePolicy = (
  principalId: string,
  resource: string,
  isAuthorized: boolean
): { principalId: string; policyDocument: PolicyDocument } => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: isAuthorized ? 'Allow' : 'Deny',
        Resource: resource,
      },
    ],
  },
});

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  const { KNOWN_CREDENTIALS } = process.env;

  let knownCredentials: { [user: string]: string };

  try {
    knownCredentials = JSON.parse(KNOWN_CREDENTIALS ?? '');
  } catch (e) {
    console.error('Could not parse auth data object from env variables');
    throw e;
  }

  const { methodArn, authorizationToken } = event;
  const [type, encodedToken] = authorizationToken.split(' ');

  if (type !== 'Basic') {
    const errMsg = 'Only Basic Authorization is supported';
    console.error(errMsg);
    throw new Error();
  }

  const buffer: Buffer = Buffer.from(encodedToken, 'base64');
  const [login, password] = buffer.toString('utf8').split(':');
  const isAuthorized = Object.entries(knownCredentials).some(
    ([knownLogin, knownPassword]) =>
      login === knownLogin && password === knownPassword
  );
  return makePolicy('user', methodArn, isAuthorized);
};
