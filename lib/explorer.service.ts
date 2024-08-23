import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ExternalContextCreator,
  MetadataScanner,
  ModulesContainer,
} from '@nestjs/core';

import { InjectBot } from './decorators';
import { Metadata } from './enums';
import { Bot } from './core';
import { Handler } from './types';

@Injectable()
export class ExplorerService implements OnModuleInit {
  private readonly logger = new Logger(ExplorerService.name);

  constructor(
    @InjectBot() private readonly bot: Bot,
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {}

  onModuleInit() {
    this.logger.debug('Searching for listeners');
    this.explore();
  }

  explore() {
    const modules = [...this.modulesContainer.values()];

    modules.forEach((module) => this.exploreModule(module));
  }

  private exploreModule(module: Module) {
    const providers = [...module.providers.values()];

    providers.forEach((provider) => this.exploreProvider(provider));
  }

  private exploreProvider(wrapper: InstanceWrapper) {
    const { instance } = wrapper;
    if (!instance || typeof instance !== 'object') return;

    const prototype = Object.getPrototypeOf(instance);
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    methodNames.forEach((methodName) =>
      this.exploreMethod(instance, prototype, methodName),
    );
  }

  private exploreMethod(
    instance: object,
    prototype: unknown,
    methodName: string,
  ) {
    const method = prototype[methodName];
    const metadata = Reflect.getMetadata(Metadata.LISTENERS, method);

    if (metadata) {
      this.logger.debug(`Found listener on method ${methodName}`);

      const handler = this.buildHandler(
        instance,
        method as Handler,
        methodName,
      );

      console.log(handler); // todo
    }
  }

  private buildHandler(instance: object, method: Handler, methodName: string) {
    return this.externalContextCreator.create(instance, method, methodName);
  }
}
