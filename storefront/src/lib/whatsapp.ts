/**
 * WhatsApp order & quote message builders.
 * All checkout paths route through +91 9990576324.
 */
export const PRAYOG_WHATSAPP = "919990576324";

export interface WhatsAppItem {
  sku?: string | null;
  name: string;
  quantity: number;
}

export interface WhatsAppOrderInput {
  customer: {
    name: string;
    phone: string;
    email: string;
    company?: string;
    gst?: string;
    businessType?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    notes?: string;
  };
  items: WhatsAppItem[];
}

export function buildOrderMessage(input: WhatsAppOrderInput): string {
  const { customer, address, items } = input;
  const lines: string[] = [];
  lines.push("Hello Prayog,", "", "I would like to place an order.", "");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("Customer");
  lines.push(`Name: ${customer.name}`);
  lines.push(`Phone: ${customer.phone}`);
  lines.push(`Email: ${customer.email}`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("Products");
  items.forEach((i) => {
    lines.push("");
    if (i.sku) lines.push(`SKU: ${i.sku}`);
    lines.push(`Product: ${i.name}`);
    lines.push(`Quantity: ${i.quantity}`);
  });
  lines.push("");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("Shipping");
  lines.push(`Address: ${address.line1}${address.line2 ? ", " + address.line2 : ""}`);
  lines.push(`City: ${address.city}`);
  lines.push(`State: ${address.state}`);
  lines.push(`Pincode: ${address.pincode}`);
  lines.push(`Country: ${address.country ?? "India"}`);
  if (address.notes) lines.push(`Notes: ${address.notes}`);
  if (customer.company) {
    lines.push("");
    lines.push("━━━━━━━━━━━━━━");
    lines.push("Business");
    lines.push(`Company: ${customer.company}`);
    if (customer.gst) lines.push(`GST: ${customer.gst}`);
    if (customer.businessType) lines.push(`Business Type: ${customer.businessType}`);
  }
  lines.push("");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("Please confirm:");
  lines.push("• Final Price");
  lines.push("• Shipping Charges");
  lines.push("• Estimated Delivery Time");
  lines.push("", "Thank you.");
  return lines.join("\n");
}

export interface WhatsAppQuoteInput {
  contact: { name: string; phone: string; email: string };
  company?: string;
  businessType?: string;
  projectType?: string;
  quantity?: string;
  timeline?: string;
  message: string;
}

export function buildQuoteMessage(input: WhatsAppQuoteInput): string {
  const l: string[] = [];
  l.push("Hello Prayog,", "", "I would like to request a quotation for a project.", "");
  l.push("━━━━━━━━━━━━━━", "Contact");
  l.push(`Name: ${input.contact.name}`);
  l.push(`Phone: ${input.contact.phone}`);
  l.push(`Email: ${input.contact.email}`);
  if (input.company) l.push(`Company: ${input.company}`);
  if (input.businessType) l.push(`Business Type: ${input.businessType}`);
  l.push("", "━━━━━━━━━━━━━━", "Project");
  if (input.projectType) l.push(`Type: ${input.projectType}`);
  if (input.quantity) l.push(`Estimated Quantity: ${input.quantity}`);
  if (input.timeline) l.push(`Timeline: ${input.timeline}`);
  l.push("", "Details:", input.message, "");
  l.push("Please share pricing, lead time, and next steps.");
  l.push("", "Thank you.");
  return l.join("\n");
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${PRAYOG_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
