export interface ActionError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionError;
