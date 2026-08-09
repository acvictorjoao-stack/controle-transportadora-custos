export interface ActionError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export interface ActionSuccess<T> {
  success: true;
  data: T;
  /** Non-blocking issue (e.g. financial sync failed after a successful save). */
  warning?: string;
}

export type ActionResult<T> = ActionSuccess<T> | ActionError;
