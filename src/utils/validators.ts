import { TipoDireccion } from "../models/types";

export function normalizeTipoDireccion(tipo: string): TipoDireccion | "" {
  const clean = tipo
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "");
  if (clean === "FACTURACION") return "FACTURACIÓN";
  if (clean === "ENVIO") return "ENVÍO";
  return "";
}

export function validateRequired(obj: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === "");
}

export function buildResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

export function buildError(statusCode: number, message: string) {
  return buildResponse(statusCode, { error: message });
}
