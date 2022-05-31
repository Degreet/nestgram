import { Answer, IUpdate } from '..';

export type NextFunction = () => any | Promise<any>;

export type MiddlewareFunction = (
  update: IUpdate,
  answer: Answer,
  next?: NextFunction,
  fail?: NextFunction,
) => any | Promise<any>;
