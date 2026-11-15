import { Badge } from "@/components/ui/primitives";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { AppointmentStatus, PaymentStatus } from "@/generated/prisma/enums";

const STATUS_VARIANT: Record<AppointmentStatus, "warning" | "success" | "info" | "neutral" | "danger"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "info",
  CANCELLED: "neutral",
  REJECTED: "danger",
  NO_SHOW: "danger",
};

const PAYMENT_VARIANT: Record<PaymentStatus, "warning" | "success" | "neutral" | "danger" | "outline"> = {
  UNPAID: "outline",
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
