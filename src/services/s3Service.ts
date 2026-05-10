import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CONFIG } from "../utils/config";

const s3 = new S3Client({ region: CONFIG.REGION });

export interface S3Metadata {
  "hora-envio": string;
  "nota-descargada": string;
  "veces-enviado": string;
}

export async function uploadPDF(rfcCliente: string, folioNota: string, pdfBuffer: Buffer): Promise<string> {
  const key = `${rfcCliente}/${folioNota}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: CONFIG.BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      Metadata: {
        "hora-envio": new Date().toISOString(),
        "nota-descargada": "false",
        "veces-enviado": "1",
      },
    })
  );
  return key;
}

export async function getObjectMetadata(key: string): Promise<S3Metadata> {
  const res = await s3.send(new HeadObjectCommand({ Bucket: CONFIG.BUCKET_NAME, Key: key }));
  const meta = res.Metadata ?? {};
  return {
    "hora-envio": meta["hora-envio"] ?? "",
    "nota-descargada": meta["nota-descargada"] ?? "false",
    "veces-enviado": meta["veces-enviado"] ?? "1",
  };
}

export async function updateMetadata(key: string, newMeta: Partial<S3Metadata>): Promise<void> {
  const current = await getObjectMetadata(key);
  const merged: Record<string, string> = { ...current, ...newMeta };
  await s3.send(
    new CopyObjectCommand({
      Bucket: CONFIG.BUCKET_NAME,
      CopySource: `${CONFIG.BUCKET_NAME}/${key}`,
      Key: key,
      Metadata: merged,
      MetadataDirective: "REPLACE",
      ContentType: "application/pdf",
    })
  );
}

export async function markAsDownloaded(key: string): Promise<void> {
  await updateMetadata(key, { "nota-descargada": "true" });
}

export async function incrementSendMetadata(key: string): Promise<void> {
  const current = await getObjectMetadata(key);
  const vecesEnviado = parseInt(current["veces-enviado"] ?? "1", 10) + 1;
  await updateMetadata(key, {
    "hora-envio": new Date().toISOString(),
    "veces-enviado": String(vecesEnviado),
  });
}

export async function getPresignedUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: CONFIG.BUCKET_NAME, Key: key }), {
    expiresIn: 604800,
  });
}
