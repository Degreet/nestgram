import { Inject } from '@nestjs/common';

import { Providers } from '../../enums';

export const InjectApi = () => Inject(Providers.API);
