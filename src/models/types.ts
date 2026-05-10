export interface Cliente {
  id: string;
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  correo: string;
  telefono: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoDireccion = "FACTURACIÓN" | "ENVÍO";

export interface Domicilio {
  id: string;
  clienteId: string;
  domicilio: string;
  colonia: string;
  municipio: string;
  estado: string;
  tipoDireccion: TipoDireccion;
  createdAt: string;
  updatedAt: string;
}

export interface Producto {
  id: string;
  nombre: string;
  unidadMedida: string;
  precioBase: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetalleNota {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface CreateDetalleDTO {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface NotaVenta {
  id: string;
  folio: string;
  clienteId: string;
  domicilioFacturacionId: string;
  domicilioEnvioId: string;
  total: number;
  detalle: DetalleNota[];
  pdfKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotaDTO {
  clienteId: string;
  domicilioFacturacionId: string;
  domicilioEnvioId: string;
  detalle: CreateDetalleDTO[];
}
