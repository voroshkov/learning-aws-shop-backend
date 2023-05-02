import { S3Handler } from 'aws-lambda';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  SQSClient,
  GetQueueUrlCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import csvParser from 'csv-parser';
import type { Readable } from 'stream';

const REGION = process.env.REGION ?? '';
const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const UPLOAD_PATH = process.env.UPLOAD_PATH ?? '';
const SQS_QUEUE_NAME = process.env.SQS_QUEUE_NAME ?? '';

const getSQSQueueUrl = async (sqsClient: SQSClient) => {
  const params = { QueueName: SQS_QUEUE_NAME };
  const { QueueUrl } = await sqsClient.send(new GetQueueUrlCommand(params));
  if (!QueueUrl) throw new Error('Could not retrieve SQS Queue URL');
  return QueueUrl;
};

const readFile = async (key: string): Promise<Readable> => {
  const client = new S3Client({ region: REGION });
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const s3Item = await client.send(command);
  const body = s3Item.Body;

  if (body && 'pipe' in body) return body as Readable;

  throw new Error('Returned object is not a stream');
};

const copyFile = async (source: string): Promise<void> => {
  const client = new S3Client({ region: REGION });
  const fileName = source.replace(UPLOAD_PATH, '').replace('/', '');
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    CopySource: `/${BUCKET_NAME}/${source}`,
    Key: `parsed/${fileName}`,
  });
  const copyResult = await client.send(command);
  console.log('copyResult', JSON.stringify(copyResult, null, 2), '\n\n');
};

const deleteFile = async (key: string): Promise<void> => {
  const client = new S3Client({ region: REGION });
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const deleteResult = await client.send(command);
  console.log('deleteResult', JSON.stringify(deleteResult, null, 2), '\n\n');
};

const parseCsvStream = async (
  stream: Readable
): Promise<Record<string, string>[]> => {
  console.log('Reading CSV file...');

  const sqsClient = new SQSClient({ region: REGION });
  const sqsQueueUrl = await getSQSQueueUrl(sqsClient);
  const results: Record<string, string>[] = [];
  return new Promise((resolve) => {
    stream
      .pipe(csvParser())
      .on('data', async (data) => {
        results.push(data);
        const sendMessageCommand = new SendMessageCommand({
          QueueUrl: sqsQueueUrl,
          MessageBody: JSON.stringify(data),
        });
        const res = await sqsClient.send(sendMessageCommand);
        console.log('SQS Response:', res);
      })
      .on('end', () => {
        console.log(results);
      });

    return resolve(results);
  });
};

export const handler: S3Handler = async (event) => {
  const { Records } = event;
  for (const record of Records) {
    const fileName = record.s3.object.key;
    const readFileResult = await readFile(fileName);
    await parseCsvStream(readFileResult);
    await copyFile(fileName);
    await deleteFile(fileName);
  }
};
