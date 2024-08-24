import { SetMetadata } from '@nestjs/common';

import { Metadata } from '../../enums';

export const Router = () => SetMetadata(Metadata.ROUTER, true);
