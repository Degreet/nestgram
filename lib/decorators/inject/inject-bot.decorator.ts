import { Inject } from '@nestjs/common';

import { Providers } from '../../enums';

export const InjectBot = () => Inject(Providers.BOT);
