import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { CONFIG } from "./config";

const cw = new CloudWatchClient({ region: CONFIG.REGION });

// Distinguishes local vs production based on NODE_ENV.
// Lambda always sets NODE_ENV=production via template.yaml; local runs default to "local".
const ENV = process.env.NODE_ENV || "local";
const NAMESPACE = "NotasVenta/Notas";

export async function recordHttpStatus(statusCode: number): Promise<void> {
  const range = statusCode >= 500 ? "5xx" : statusCode >= 400 ? "4xx" : "2xx";
  try {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: `HTTP_${range}`,
            Value: 1,
            Unit: "Count",
            Dimensions: [{ Name: "Environment", Value: ENV }],
          },
        ],
      })
    );
  } catch (err) {
    // Non-fatal: log but don't fail the request over a metrics error
    console.error("recordHttpStatus error:", err);
  }
}

export async function recordLatency(durationMs: number): Promise<void> {
  try {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: "RequestLatency",
            Value: durationMs,
            Unit: "Milliseconds",
            Dimensions: [{ Name: "Environment", Value: ENV }],
          },
        ],
      })
    );
  } catch (err) {
    console.error("recordLatency error:", err);
  }
}
