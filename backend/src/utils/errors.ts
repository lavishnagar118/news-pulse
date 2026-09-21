export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly jobId?: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ConcurrentJobError extends AppError {
  public override readonly jobId: string;

  constructor(jobId: string, message: string = 'An ingestion job is already in progress') {
    super(message, 409, 'CONCURRENT_JOB_RUNNING');
    this.jobId = jobId;
  }
}
