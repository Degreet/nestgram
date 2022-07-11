import { IButton, IReplyMarkup, KeyboardTypes } from '../..';
import { error, warn } from '../../logger';

export class Keyboard {
  private oneTimeKeyboard: boolean = false;
  unresolvedButtons: IButton[] = [];
  rows: IButton[][] = [];

  /**
   * Creates a keyboard for message
   * @param keyboardType Type of keyboard {@link KeyboardTypes}
   * @param placeholder Placeholder for input "Type message..." (only for under_the_chat keyboard)
   * */
  constructor(
    public readonly keyboardType: KeyboardTypes = KeyboardTypes.underTheMessage,
    private placeholder?: string,
  ) {}

  private checkButton(buttonType: string, supportKeyboard: KeyboardTypes): void {
    if (this.keyboardType !== supportKeyboard)
      throw error(`You can't use ${buttonType} button for ${this.keyboardType}`);
  }

  /**
   * Creates a button with text (only for under_the_chat keyboard)
   * @param text Text of the button
   * @param hidden If true hides button
   * */
  text(text: string, hidden?: boolean): this {
    if (hidden) return this;
    this.checkButton('text', KeyboardTypes.underTheChat);
    this.unresolvedButtons.push({ text });
    return this;
  }

  /**
   * Creates a button (only for under_the_message keyboard)
   * @param text Text of the button
   * @param clickData String with some click data
   * @param hidden If true hides button
   * */
  btn(text: string, clickData: string, hidden?: boolean): this {
    if (hidden) return this;
    this.checkButton('callback', KeyboardTypes.underTheMessage);
    this.unresolvedButtons.push({ text, callback_data: clickData });
    return this;
  }

  /**
   * Creates a url button (only for under_the_message keyboard)
   * @param text Text of the button
   * @param url Button click link
   * @param hidden If true hides button
   * */
  url(text: string, url: string, hidden?: boolean): this {
    if (hidden) return this;
    this.checkButton('url', KeyboardTypes.underTheMessage);
    this.unresolvedButtons.push({ text, url });
    return this;
  }

  /**
   * Creates a button that request contact (only for under_the_chat keyboard)
   * @param text Text of the button
   * @param hidden If true hides button
   * */
  contact(text: string, hidden?: boolean): this {
    if (hidden) return this;
    this.checkButton('request_contact', KeyboardTypes.underTheChat);
    this.unresolvedButtons.push({ text, request_contact: true });
    return this;
  }

  /**
   * Creates a button that request location (only for under_the_chat keyboard)
   * @param text Text of the button
   * @param hidden If true hides button
   * */
  location(text: string, hidden?: boolean): this {
    if (hidden) return this;
    this.checkButton('request_location', KeyboardTypes.underTheChat);
    this.unresolvedButtons.push({ text, request_location: true });
    return this;
  }

  /**
   * Creates a button that switch inline query (only for under_the_message keyboard)
   * @param text Text of the button
   * @param switchQuery Switch inline query string data
   * @param hidden If true hides button
   * */
  switch(text: string, switchQuery: string, hidden?: boolean): this {
    if (hidden) return this;
    this.checkButton('switch_inline_query', KeyboardTypes.underTheMessage);
    this.unresolvedButtons.push({ text, switch_inline_query: switchQuery });
    return this;
  }

  /**
   * Creates a pay button (only for under_the_message keyboard)
   * @param text Text of the button
   * */
  pay(text: string): this {
    this.checkButton('pay', KeyboardTypes.underTheMessage);
    this.unresolvedButtons.push({ text, pay: true });
    return this;
  }

  /**
   * Creates a web app button
   * @param text Text of the button
   * @param url Link to web app
   * @param hidden If true hides button
   * */
  webApp(text: string, url: string, hidden?: boolean): this {
    if (hidden) return this;
    this.unresolvedButtons.push({ text, web_app: { url } });
    return this;
  }

  /**
   * Creates a row with newly added buttons
   * @param btnsPerLine If you pass a number to it, your newly added buttons will be arranged in multiple rows with the number of buttons you specify in one row
   * @param hidden If true hides row
   * */
  row(btnsPerLine?: number | null, hidden?: boolean): this {
    const btns: IButton[] = [...this.unresolvedButtons];
    this.unresolvedButtons = [];
    if (hidden) return this;

    if (btnsPerLine) {
      const result: IButton[][] = [[]];

      btns.map((btn: IButton) => {
        const last: IButton[] = result[result.length - 1];

        if (last.length >= btnsPerLine) {
          result.push([btn]);
        } else {
          last.push(btn);
        }
      });

      this.rows.push(...result);
    } else {
      this.rows.push(btns);
    }

    return this;
  }

  /**
   * Saves rows as layout
   * @param layoutName Layout name
   * @deprecated To use keyboard layouts, pass Keyboard class as argument to .use method
   * */
  save(layoutName: string): this {
    return this;
  }

  /**
   * Extracts rows from the layout
   * @param layout Layout you want to add to the current keyboard (pass instance of Keyboard class)
   * */
  use(layout: any): this {
    if (layout.keyboardType !== this.keyboardType) {
      warn(`Can't use layout, because it has a different keyboard type`);
      return this;
    }

    layout.rows.forEach((row: IButton[]): void => {
      this.unresolvedButtons.push(...row);
    });

    layout.unresolvedButtons.forEach((button: IButton): void => {
      this.unresolvedButtons.push(button);
    });

    return this;
  }

  setPlaceholder(newPlaceholder: string): this {
    this.placeholder = newPlaceholder;
    return this;
  }

  oneTime(): this {
    this.oneTimeKeyboard = !this.oneTimeKeyboard;
    return this;
  }

  buildMarkup(): IReplyMarkup {
    this.row();

    if (this.keyboardType === 'keyboard') {
      return {
        keyboard: this.rows,
        input_field_placeholder: this.placeholder,
        one_time_keyboard: this.oneTimeKeyboard,
        resize_keyboard: true,
      };
    } else {
      return { [this.keyboardType]: this.rows };
    }
  }
}
