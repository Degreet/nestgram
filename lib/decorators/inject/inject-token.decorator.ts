import { Inject } from '@nestjs/common';

import { Providers } from '../../enums';

export const InjectToken = () => Inject(Providers.TOKEN);
