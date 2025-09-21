import { ParamsFactory } from '@nestjs/core';
import { ParamData } from '@nestjs/common';
import { Params } from '../enums';

export class HandlerParamsFactory implements ParamsFactory {
  exchangeKeyForValue(type: Params, data: ParamData, args: any): any {
    switch (type) {
      default:
        return args[type];
    }
  }
}
