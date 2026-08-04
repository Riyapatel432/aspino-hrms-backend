import { SetMetadata } from '@nestjs/common';

export interface LogActivityOptions {
  action: string;
  entityType?: string;
}

export const LOG_ACTIVITY_KEY = 'log_activity';
export const LogActivity = (options: LogActivityOptions) =>
  SetMetadata(LOG_ACTIVITY_KEY, options);
