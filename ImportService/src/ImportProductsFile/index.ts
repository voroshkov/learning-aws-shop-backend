import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { makeResponse } from '../utils/utils.ts';

const createPreSignedUrlWithClient = async ({
  region,
  bucket,
  key,
}: {
  region: string;
  bucket: string;
  key: string;
}) => {
  const client = new S3Client({ region });
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 60 });
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const REGION = process.env.REGION ?? '';
  const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
  const UPLOAD_PATH = process.env.UPLOAD_PATH ?? '';

  const { queryStringParameters } = event;
  const fileName = queryStringParameters?.name;

  if (!fileName) return makeResponse(400, 'File name must be provided');

  const clientUrl = await createPreSignedUrlWithClient({
    region: REGION,
    bucket: BUCKET_NAME,
    key: `${UPLOAD_PATH}/${fileName}`,
  });

  return makeResponse(200, clientUrl);
};
