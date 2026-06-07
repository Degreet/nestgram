/**
 * Typed command arguments (#34) + DTO/pipe ergonomics, end to end through a
 * booted app and the real `ExternalContextCreator` pipeline.
 *
 * Proves three things a bot author relies on:
 *   1. `@Args(schema)` injects the parsed, typed object into the handler.
 *   2. A param pipe runs and receives the param's metatype (`design:paramtypes`)
 *      — so `ValidationPipe` can validate against a DTO class.
 *   3. `class-validator` validation through the pipeline rejects bad input, and
 *      the throw is caught by the handler's exception filter.
 *
 * No network: handlers record what they saw; BotService is never hit.
 */
import {
  ArgumentMetadata,
  Catch,
  ExceptionFilter,
  Injectable,
  Module,
  PipeTransform,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';

import {
  Args,
  ArgsOf,
  Command,
  commandArgs,
  Message,
  NestgramModule,
  Router,
  UpdateDispatcher,
} from '..';
import { RawUpdate } from '../events/raw-update.types';

const AddArgs = commandArgs({ amount: Number, note: String });

class AddDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  note!: string;
}

@Injectable()
class MetatypeRecordingPipe implements PipeTransform {
  static seen: unknown[] = [];

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    MetatypeRecordingPipe.seen.push(metadata.metatype);
    return value;
  }
}

@Catch()
class RecordingFilter implements ExceptionFilter {
  catch(error: Error): void {
    ArgsRouter.errors.push(error.constructor.name);
  }
}

@Router()
class ArgsRouter {
  static parsed: ArgsOf<typeof AddArgs>[] = [];
  static validated: AddDto[] = [];
  static errors: string[] = [];

  @Command('add')
  add(message: Message, @Args(AddArgs) args: ArgsOf<typeof AddArgs>) {
    ArgsRouter.parsed.push(args);
  }

  @Command('meta')
  meta(message: Message, @Args(AddArgs, MetatypeRecordingPipe) dto: AddDto) {
    ArgsRouter.validated.push(dto);
  }

  @UseFilters(RecordingFilter)
  @Command('save')
  save(
    message: Message,
    @Args(
      AddArgs,
      new ValidationPipe({ transform: true, validateCustomDecorators: true }),
    )
    dto: AddDto,
  ) {
    ArgsRouter.validated.push(dto);
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
  ],
  providers: [ArgsRouter],
})
class ArgsAppModule {}

function command(id: number, text: string): RawUpdate {
  return {
    update_id: id,
    message: {
      message_id: id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      text,
    },
  };
}

describe('typed command arguments + DTO pipes (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(ArgsAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ArgsRouter.parsed.length = 0;
    ArgsRouter.validated.length = 0;
    ArgsRouter.errors.length = 0;
    MetatypeRecordingPipe.seen.length = 0;
  });

  it('@Args(schema) injects the parsed, typed object (#34)', async () => {
    await dispatcher.dispatch(command(1, '/add 42 buy oat milk'));
    expect(ArgsRouter.parsed).toEqual([{ amount: 42, note: 'buy oat milk' }]);
  });

  it('forwards the param metatype to a pipe (DTO is reachable)', async () => {
    await dispatcher.dispatch(command(2, '/meta 5 x'));
    expect(MetatypeRecordingPipe.seen).toContain(AddDto);
  });

  it('ValidationPipe validates and transforms the args into a DTO instance', async () => {
    await dispatcher.dispatch(command(3, '/save 7 call the dentist'));
    expect(ArgsRouter.validated).toHaveLength(1);
    expect(ArgsRouter.validated[0]).toBeInstanceOf(AddDto);
    expect(ArgsRouter.validated[0]).toEqual({
      amount: 7,
      note: 'call the dentist',
    });
  });

  it('ValidationPipe rejects bad input; the filter catches the throw', async () => {
    await dispatcher.dispatch(command(4, '/save 0 too small'));
    expect(ArgsRouter.validated).toHaveLength(0);
    expect(ArgsRouter.errors).toEqual(['BadRequestException']);
  });
});
