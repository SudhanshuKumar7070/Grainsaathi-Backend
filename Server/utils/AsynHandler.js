export const AsyncHandler = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res, next);
  } catch (error) {
    console.log("Error occured at server ==> ", error);

    const statusCode = error.statusCode || 500;
    const message = error.message || "internal server error";

    return res.status(statusCode).json({
      message: message,
      success: false,
      statusCode: statusCode,
      error: error.message,
    });
  }
};
