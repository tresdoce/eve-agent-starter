import { defineTool } from "eve/tools";
import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TICKETS_PATH = resolve(process.cwd(), "data/tickets.json");

interface Ticket {
  id: string;
  subject: string;
  description: string;
  contactEmail?: string;
  createdAt: string;
}

function readTickets(): Ticket[] {
  if (!existsSync(TICKETS_PATH)) return [];
  return JSON.parse(readFileSync(TICKETS_PATH, "utf-8"));
}

function writeTickets(tickets: Ticket[]): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(TICKETS_PATH, JSON.stringify(tickets, null, 2), "utf-8");
}

export default defineTool({
  description:
    "Crea un ticket de soporte cuando la base de conocimiento no tiene una respuesta para el cliente. Usala solo después de buscar con search_faq y no encontrar nada relevante.",
  inputSchema: z.object({
    subject: z.string().describe("Resumen corto del problema"),
    description: z.string().describe("Descripción completa de lo que necesita el cliente"),
    contactEmail: z
      .string()
      .email()
      .optional()
      .describe("Email de contacto, si el cliente lo compartió"),
  }),
  async execute(input) {
    const tickets = readTickets();
    const id = `ticket-${String(tickets.length + 1).padStart(3, "0")}`;
    const ticket: Ticket = { id, ...input, createdAt: new Date().toISOString() };
    tickets.push(ticket);
    writeTickets(tickets);
    return { ticketId: id };
  },
});
