import "server-only";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export const appointmentListSelect = {
  id: true,
  reference: true,
  startAt: true,
  endAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  total: true,
  rescheduleRequestedAt: true,
  staff: { select: { title: true, user: { select: { name: true } } } },
  services: { select: { serviceName: true }, orderBy: { sortOrder: "asc" } },
  review: { select: { id: true, status: true } },
} satisfies Prisma.AppointmentSelect;

export type AppointmentListItem = Prisma.AppointmentGetPayload<{ select: typeof appointmentListSelect }>;

/** Always scoped to the given customer profile — callers pass the id from the server session. */
export async function getCustomerAppointments(customerProfileId: string, scope: "upcoming" | "past" | "all") {
  const now = new Date();
  const where: Prisma.AppointmentWhereInput = { customerId: customerProfileId };
  if (scope === "upcoming") Object.assign(where, { endAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } });
  if (scope === "past") Object.assign(where, { OR: [{ endAt: { lt: now } }, { status: { notIn: ["PENDING", "CONFIRMED"] } }] });
  return prisma.appointment.findMany({
    where,
    orderBy: { startAt: scope === "upcoming" ? "asc" : "desc" },
    take: 100,
    select: appointmentListSelect,
  });
}

export async function getCustomerAppointment(customerProfileId: string, appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      services: { orderBy: { sortOrder: "asc" }, include: { service: { select: { id: true, slug: true } } } },
      staff: { select: { id: true, title: true, user: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      review: true,
      offer: { select: { title: true } },
    },
  });
  // Ownership check — another customer's booking is reported as not found.
  if (!appt || appt.customerId !== customerProfileId) return null;
  return appt;
}
