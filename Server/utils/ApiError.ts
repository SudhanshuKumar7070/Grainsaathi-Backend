export class ApiError extends Error {
  statusCode: number;
  success: boolean;
  data: any;
  errors: any[];

  constructor(
    statusCode: number,
    message: string = "something went wrong",
    errors: any[] = [],
    stack: string = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.data = null;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
