import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from "uuid";
import { NotaVenta, CreateNotaDTO, DetalleNota, Cliente, Domicilio, Producto } from "../models/types";
import { dbPut, dbGet, dbScan, dbUpdate } from "../services/dynamoService";
import { CONFIG } from "../utils/config";
import { buildResponse, buildError, validateRequired, normalizeTipoDireccion } from "../utils/validators";
import { generateNotaPDF } from "../services/pdfService";
import {
  uploadPDF,
  markAsDownloaded,
  getObjectMetadata,
  incrementSendMetadata,
  getPresignedUrl,
} from "../services/s3Service";

const TABLE = CONFIG.TABLES.NOTAS;
const sns = new SNSClient({ region: CONFIG.REGION });

function getApiBaseUrl(event: APIGatewayProxyEvent): string {
  const domain = event.requestContext?.domainName;
  const stage = event.requestContext?.stage;
  if (domain && stage) return `https://${domain}/${stage}`;
  return CONFIG.API_BASE_URL;
}

function generateFolio(): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `NV-${yyyymmdd}-${Math.floor(Math.random() * 9000) + 1000}`;
}

// Publishes email event to SNS so the notificaciones module handles it independently
async function publishEmailEvent(cliente: Cliente, nota: NotaVenta, downloadUrl: string): Promise<void> {
  if (!CONFIG.SNS_TOPIC_ARN) {
    console.warn("SNS_TOPIC_ARN not set, skipping email notification");
    return;
  }
  await sns.send(
    new PublishCommand({
      TopicArn: CONFIG.SNS_TOPIC_ARN,
      Message: JSON.stringify({ cliente, nota, downloadUrl }),
      Subject: `Nueva nota de venta: ${nota.folio}`,
    })
  );
}

// POST /notas
export async function createNota(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body ?? "{}") as CreateNotaDTO;
    const missing = validateRequired(body as unknown as Record<string, unknown>, [
      "clienteId", "domicilioFacturacionId", "domicilioEnvioId", "detalle",
    ]);
    if (missing.length > 0) return buildError(400, `Campos requeridos faltantes: ${missing.join(", ")}`);
    if (!Array.isArray(body.detalle) || body.detalle.length === 0) {
      return buildError(400, "La nota debe tener al menos un producto en detalle");
    }

    for (const item of body.detalle) {
      if (!item.productoId || !item.cantidad || !item.precioUnitario)
        return buildError(400, "Cada detalle requiere: productoId, cantidad, precioUnitario");
      if (item.cantidad <= 0) return buildError(400, "La cantidad debe ser mayor a 0");
      if (item.precioUnitario <= 0) return buildError(400, "El precioUnitario debe ser mayor a 0");
    }

    const clienteRaw = await dbGet(CONFIG.TABLES.CLIENTES, body.clienteId);
    if (!clienteRaw) return buildError(404, "Cliente no encontrado");
    const cliente = clienteRaw as unknown as Cliente;

    const domFacRaw = await dbGet(CONFIG.TABLES.DOMICILIOS, body.domicilioFacturacionId);
    if (!domFacRaw) return buildError(404, "Domicilio de facturación no encontrado");
    const domFac = domFacRaw as unknown as Domicilio;
    if (normalizeTipoDireccion(domFac.tipoDireccion) !== "FACTURACIÓN")
      return buildError(400, "El domicilio de facturación debe tener tipo FACTURACIÓN");

    const domEnvRaw = await dbGet(CONFIG.TABLES.DOMICILIOS, body.domicilioEnvioId);
    if (!domEnvRaw) return buildError(404, "Domicilio de envío no encontrado");
    const domEnv = domEnvRaw as unknown as Domicilio;
    if (normalizeTipoDireccion(domEnv.tipoDireccion) !== "ENVÍO")
      return buildError(400, "El domicilio de envío debe tener tipo ENVÍO");

    const productosMap = new Map<string, Producto>();
    for (const item of body.detalle) {
      const prodRaw = await dbGet(CONFIG.TABLES.PRODUCTOS, item.productoId);
      if (!prodRaw) return buildError(404, `Producto ${item.productoId} no encontrado`);
      productosMap.set(item.productoId, prodRaw as unknown as Producto);
    }

    const detalle: DetalleNota[] = body.detalle.map((item) => ({
      id: uuidv4(),
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      importe: parseFloat((item.cantidad * item.precioUnitario).toFixed(2)),
    }));

    const total = parseFloat(detalle.reduce((sum, d) => sum + d.importe, 0).toFixed(2));
    const now = new Date().toISOString();

    const nota: NotaVenta = {
      id: uuidv4(),
      folio: generateFolio(),
      clienteId: body.clienteId,
      domicilioFacturacionId: body.domicilioFacturacionId,
      domicilioEnvioId: body.domicilioEnvioId,
      total,
      detalle,
      pdfKey: "",
      createdAt: now,
      updatedAt: now,
    };

    const pdfBuffer = await generateNotaPDF(cliente, domFac, domEnv, nota, productosMap);
    const pdfKey = await uploadPDF(cliente.rfc, nota.folio, pdfBuffer);
    nota.pdfKey = pdfKey;

    await dbPut(TABLE, nota as unknown as Record<string, unknown>);

    const downloadUrl = `${getApiBaseUrl(event)}/notas/${nota.id}/descargar`;
    try {
      await publishEmailEvent(cliente, nota, downloadUrl);
    } catch (snsErr) {
      console.error("SNS publish error (non-fatal):", snsErr);
    }

    return buildResponse(201, { message: "Nota de venta creada exitosamente", nota });
  } catch (err) {
    console.error("createNota error:", err);
    return buildError(500, "Error interno del servidor");
  }
}

// GET /notas
export async function listNotas(_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    return buildResponse(200, await dbScan(TABLE));
  } catch (err) {
    console.error("listNotas error:", err);
    return buildError(500, "Error interno del servidor");
  }
}

// GET /notas/{id}
export async function getNota(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const id = event.pathParameters?.id;
    if (!id) return buildError(400, "ID requerido");

    const nota = await dbGet(TABLE, id);
    if (!nota) return buildError(404, "Nota no encontrada");

    const [cliente, domFac, domEnv] = await Promise.all([
      dbGet(CONFIG.TABLES.CLIENTES, nota.clienteId as string),
      dbGet(CONFIG.TABLES.DOMICILIOS, nota.domicilioFacturacionId as string),
      dbGet(CONFIG.TABLES.DOMICILIOS, nota.domicilioEnvioId as string),
    ]);

    const detalleEnriquecido = await Promise.all(
      (nota.detalle as DetalleNota[]).map(async (d) => {
        const prod = await dbGet(CONFIG.TABLES.PRODUCTOS, d.productoId);
        return { ...d, nombreProducto: prod?.nombre ?? d.productoId, unidadMedida: prod?.unidadMedida ?? "" };
      })
    );

    return buildResponse(200, { ...nota, cliente, domicilioFacturacion: domFac, domicilioEnvio: domEnv, detalle: detalleEnriquecido });
  } catch (err) {
    console.error("getNota error:", err);
    return buildError(500, "Error interno del servidor");
  }
}

// GET /notas/{id}/descargar
export async function descargarNota(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const id = event.pathParameters?.id;
    if (!id) return buildError(400, "ID requerido");

    const nota = await dbGet(TABLE, id);
    if (!nota) return buildError(404, "Nota no encontrada");

    const pdfKey = nota.pdfKey as string;
    if (!pdfKey) return buildError(404, "PDF no encontrado para esta nota");

    await markAsDownloaded(pdfKey);
    await dbUpdate(TABLE, id, { updatedAt: new Date().toISOString() });

    const downloadUrl = await getPresignedUrl(pdfKey);
    return { statusCode: 302, headers: { Location: downloadUrl, "Access-Control-Allow-Origin": "*" }, body: "" };
  } catch (err) {
    console.error("descargarNota error:", err);
    return buildError(500, "Error interno del servidor");
  }
}

// POST /notas/{id}/enviar
export async function reenviarNota(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const id = event.pathParameters?.id;
    if (!id) return buildError(400, "ID requerido");

    const nota = await dbGet(TABLE, id);
    if (!nota) return buildError(404, "Nota no encontrada");

    const cliente = await dbGet(CONFIG.TABLES.CLIENTES, nota.clienteId as string);
    if (!cliente) return buildError(404, "Cliente no encontrado");

    const pdfKey = nota.pdfKey as string;
    if (!pdfKey) return buildError(404, "PDF no encontrado para esta nota");

    const downloadUrl = `${getApiBaseUrl(event)}/notas/${id}/descargar`;

    await publishEmailEvent(cliente as unknown as Cliente, nota as unknown as NotaVenta, downloadUrl);
    await incrementSendMetadata(pdfKey);

    const metadata = await getObjectMetadata(pdfKey);
    return buildResponse(200, { message: "Nota reenviada exitosamente", notaId: id, folio: nota.folio, metadata });
  } catch (err) {
    console.error("reenviarNota error:", err);
    return buildError(500, "Error interno del servidor");
  }
}
