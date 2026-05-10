import PDFDocument from "pdfkit";
import { Cliente, Domicilio, NotaVenta, Producto } from "../models/types";

export async function generateNotaPDF(
  cliente: Cliente,
  domicilioFacturacion: Domicilio,
  domicilioEnvio: Domicilio,
  nota: NotaVenta,
  productos: Map<string, Producto>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100;

    doc.fontSize(22).font("Helvetica-Bold").text("NOTA DE VENTA", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica").text(`Folio: ${nota.folio}`, { align: "center" });
    doc.fontSize(10).fillColor("#888").text(`Fecha: ${new Date(nota.createdAt).toLocaleDateString("es-MX")}`, { align: "center" });
    doc.fillColor("#000").moveDown(1);

    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.8);

    doc.fontSize(12).font("Helvetica-Bold").text("DATOS DEL CLIENTE");
    doc.moveDown(0.4);
    doc.fontSize(10).font("Helvetica");
    [
      ["Razón Social:", cliente.razonSocial],
      ["Nombre Comercial:", cliente.nombreComercial],
      ["RFC:", cliente.rfc],
      ["Correo:", cliente.correo],
      ["Teléfono:", cliente.telefono],
    ].forEach(([label, value]) => {
      doc.text(`${label} `, { continued: true }).font("Helvetica-Bold").text(value).font("Helvetica");
    });

    doc.moveDown(0.8);

    const colWidth = pageWidth / 2 - 10;
    const addrY = doc.y;

    doc.fontSize(11).font("Helvetica-Bold").text("Dirección de Facturación", 50, addrY);
    doc.fontSize(9).font("Helvetica");
    doc.text(domicilioFacturacion.domicilio, 50, doc.y + 2);
    doc.text(`Col. ${domicilioFacturacion.colonia}, ${domicilioFacturacion.municipio}`, 50);
    doc.text(domicilioFacturacion.estado, 50);

    doc.fontSize(11).font("Helvetica-Bold").text("Dirección de Envío", 50 + colWidth + 20, addrY);
    doc.fontSize(9).font("Helvetica");
    doc.text(domicilioEnvio.domicilio, 50 + colWidth + 20, addrY + 16);
    doc.text(`Col. ${domicilioEnvio.colonia}, ${domicilioEnvio.municipio}`, 50 + colWidth + 20);
    doc.text(domicilioEnvio.estado, 50 + colWidth + 20);

    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.8);

    doc.fontSize(12).font("Helvetica-Bold").text("DETALLE DE LA NOTA");
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(50, tableTop, pageWidth, 20).fill("#1a73e8");

    const cols = { producto: 50, cantidad: 280, precioUnitario: 360, importe: 460 };

    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold");
    doc.text("Producto", cols.producto + 4, tableTop + 5);
    doc.text("Cantidad", cols.cantidad, tableTop + 5);
    doc.text("Precio Unit.", cols.precioUnitario, tableTop + 5);
    doc.text("Importe", cols.importe, tableTop + 5);

    doc.fillColor("#000000").font("Helvetica").fontSize(9);
    let rowY = tableTop + 22;
    let rowIndex = 0;

    nota.detalle.forEach((item) => {
      const nombreProducto = productos.get(item.productoId)?.nombre ?? item.productoId;
      if (rowIndex % 2 === 0) doc.rect(50, rowY - 2, pageWidth, 18).fill("#f5f5f5");
      doc.fillColor("#000000");
      doc.text(nombreProducto, cols.producto + 4, rowY, { width: 220 });
      doc.text(String(item.cantidad), cols.cantidad, rowY);
      doc.text(`$${item.precioUnitario.toFixed(2)}`, cols.precioUnitario, rowY);
      doc.text(`$${item.importe.toFixed(2)}`, cols.importe, rowY);
      rowY += 20;
      rowIndex++;
    });

    doc.moveTo(50, rowY + 4).lineTo(50 + pageWidth, rowY + 4).strokeColor("#1a73e8").lineWidth(1.5).stroke();
    doc.fontSize(13).font("Helvetica-Bold").text(`TOTAL: $${nota.total.toFixed(2)} MXN`, 50, rowY + 12, { align: "right", width: pageWidth });
    doc.fontSize(8).font("Helvetica").fillColor("#aaaaaa").text(
      "Este documento es generado automáticamente. Para dudas contacte al emisor.",
      50, doc.page.height - 50,
      { align: "center", width: pageWidth }
    );

    doc.end();
  });
}
