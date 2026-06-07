export const REMINDER_QUEUE = 'reminders';

export const DELIVER_JOB = 'deliver';

/** The BullMQ job id for a reminder's delivery — one source of truth for add + cancel. */
export const buildDeliveryJobId = (reminderId: number): string =>
  `reminder-${reminderId}`;
