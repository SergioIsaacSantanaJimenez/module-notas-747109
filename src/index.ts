import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { buildError } from "./utils/validators";
import { recordHttpStatus, recordLatency } from "./utils/metrics";
import { createNota, listNotas, getNota, descargarNota, reenviarNota } from "./handlers/notas";

type RouteHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

const routes: Record<string, RouteHandler> = {
  "GET /notas":                   listNotas,
  "POST /notas":                  createNota,
  "GET /notas/{id}":              getNota,
  "GET /notas/{id}/descargar":    descargarNota,
  "POST /notas/{id}/enviar":      reenviarNota,
};

function normalizePath(path: string): string {
  return path.replace(
    /\/notas\/([^/]+)(\/.*)?/,
    (_, _id, suffix) => `/notas/{id}${suffix ?? ""}`
  );
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      },
      body: "",
    };
  }

  const routeKey = `${event.httpMethod} ${normalizePath(event.path)}`;
  const handlerFn = routes[routeKey];
  if (!handlerFn) return buildError(404, `Ruta no encontrada: ${event.httpMethod} ${event.path}`);

  const start = Date.now();
  const result = await handlerFn(event);

  // Publish metrics asynchronously — do not await to avoid adding latency to the response
  Promise.allSettled([
    recordHttpStatus(result.statusCode),
    recordLatency(Date.now() - start),
  ]).catch((err) => console.error("metrics flush error:", err));

  return result;
};
