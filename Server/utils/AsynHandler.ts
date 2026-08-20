import { Request, Response, NextFunction, RequestHandler } from "express";

export const AsyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: any) => {
      console.log("Error occured at server ==> ", error);
      const statusCode = error.statusCode || 500;
      const message = error.message || "internal server error";

      res.status(statusCode).json({
        message: message,
        success: false,
        statusCode: statusCode,
        error: error.message,
      });
    });
  };
};
