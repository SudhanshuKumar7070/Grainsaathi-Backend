import { Kisaan, Vyapari, Organisation, Admin, SuperAdmin } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Kisaan | Vyapari | Organisation | Admin | SuperAdmin | null;
      userRole?: "kisaan" | "vyapari" | "organisation" | "admin" | "superadmin";
    }
  }
}
