import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { CONFIG } from "../utils/config";

const client = new DynamoDBClient({ region: CONFIG.REGION });
export const dynamo = DynamoDBDocumentClient.from(client);

export async function dbPut(tableName: string, item: Record<string, unknown>) {
  await dynamo.send(new PutCommand({ TableName: tableName, Item: item }));
  return item;
}

export async function dbGet(tableName: string, id: string) {
  const res = await dynamo.send(new GetCommand({ TableName: tableName, Key: { id } }));
  return res.Item ?? null;
}

export async function dbScan(tableName: string) {
  const res = await dynamo.send(new ScanCommand({ TableName: tableName }));
  return res.Items ?? [];
}

export async function dbUpdate(tableName: string, id: string, fields: Record<string, unknown>) {
  const keys = Object.keys(fields);
  const UpdateExpression = "SET " + keys.map((k) => `#${k} = :${k}`).join(", ");
  const ExpressionAttributeNames = Object.fromEntries(keys.map((k) => [`#${k}`, k]));
  const ExpressionAttributeValues = Object.fromEntries(keys.map((k) => [`:${k}`, fields[k]]));

  const res = await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW",
    })
  );
  return res.Attributes ?? null;
}
