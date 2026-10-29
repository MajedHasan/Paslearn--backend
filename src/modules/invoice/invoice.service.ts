import crypto from "crypto";
import OrderModel from "../order/order.model";
import UserModel from "../../models/user.model";

export const invoiceService = {
  async generateForOrder(orderId: string) {
    const order: any = await OrderModel.findById(orderId)
      .populate("items.product", "title type")
      .populate("user", "name email")
      .lean();
    if (!order) return null;

    const invoiceNumber = `INV-${order.orderNumber}`;
    // Generate a minimal HTML invoice (PDF generation can be added later via puppeteer)
    const lines = order.items.map((i: any) =>
      `${i.product?.title || "Product"} — ${order.currency} ${i.finalPrice.toFixed(2)}`
    ).join("\n");
    const html = `
      <h2>Invoice ${invoiceNumber}</h2>
      <p>Date: ${new Date(order.paidAt || order.createdAt).toISOString().slice(0, 10)}</p>
      <p>Billed to: ${order.user?.name} (${order.user?.email})</p>
      <pre>${lines}</pre>
      <h3>Subtotal: ${order.currency} ${order.subtotal.toFixed(2)}</h3>
      <h3>Discount: -${order.currency} ${order.discountTotal.toFixed(2)}</h3>
      <h3>Total: ${order.currency} ${order.total.toFixed(2)}</h3>
    `;
    // TODO: upload via getStorageDriver(), store key on order
    return { invoiceNumber, html };
  },
};