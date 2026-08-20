import { Kisaan, Vyapari, Organisation } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Kisaan | Vyapari | Organisation | null;
      userRole?: "kisaan" | "vyapari" | "organisation" | "admin" | "superadmin";
    }
  }
}
