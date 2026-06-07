import { ApiMethod } from './api-method';
import type { RawLabeledPrice } from '../../events/raw-update.types';

export interface CreateInvoiceLinkOptions {
  business_connection_id?: string;
  title: string;
  description: string;
  payload: string;
  provider_token?: string;
  currency: string;
  prices: RawLabeledPrice[];
  subscription_period?: number;
  max_tip_amount?: number;
  suggested_tip_amounts?: number[];
  provider_data?: string;
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  need_name?: boolean;
  need_phone_number?: boolean;
  need_email?: boolean;
  need_shipping_address?: boolean;
  send_phone_number_to_provider?: boolean;
  send_email_to_provider?: boolean;
  is_flexible?: boolean;
}

/**
 * Use this method to create a link for an invoice. Returns the created invoice link as String on success.
 * @see https://core.telegram.org/bots/api#createinvoicelink
 */
export class CreateInvoiceLink extends ApiMethod<
  CreateInvoiceLinkOptions,
  string
> {
  readonly method = 'createInvoiceLink';

  constructor(payload: CreateInvoiceLinkOptions) {
    super(payload);
  }
}
