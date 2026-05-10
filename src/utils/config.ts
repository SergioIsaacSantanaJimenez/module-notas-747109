export const CONFIG = {
  REGION: process.env.AWS_REGION || "us-east-2",
  BUCKET_NAME: process.env.BUCKET_NAME || "747109-esi3898k-examen1",
  SNS_TOPIC_ARN: process.env.SNS_TOPIC_ARN || "",
  API_BASE_URL: process.env.API_BASE_URL || "",
  TABLES: {
    CLIENTES: process.env.TABLE_CLIENTES || "clientes",
    DOMICILIOS: process.env.TABLE_DOMICILIOS || "domicilios",
    PRODUCTOS: process.env.TABLE_PRODUCTOS || "productos",
    NOTAS: process.env.TABLE_NOTAS || "notas_venta",
  },
};
