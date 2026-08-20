import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError.js";

const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      throw new ApiError(403, "You don't have permission to access this resource");
    }
    next();
  };
};

export { authorizeRoles };
