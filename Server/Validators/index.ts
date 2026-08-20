import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate =
  (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Collect all error messages
        const errorMessages = error.issues.map((issue: any) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        
        return res.status(400).json({
          statusCode: 400,
          data: null,
          message: "Validation Error",
          success: false,
          errors: errorMessages
        });
      }
      return next(error);
    }
  };
