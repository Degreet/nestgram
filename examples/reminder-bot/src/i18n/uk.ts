export const uk = {
  'menu.remind': '➕ Нагадати',
  'menu.list': '📋 Мої нагадування',
  'menu.help': 'ℹ️ Довідка',

  'start.greeting': 'Привіт, <b>{name}</b>!\n\n{help}',
  'help.text': [
    '<b>Бот-нагадувач</b> — пінгну, коли настане час.',
    '',
    'Заплануй із тривалістю:',
    '<code>/remind in 10m Купити молоко</code>',
    '…або просто надішли <code>2h Подзвонити мамі</code> без команди.',
    '',
    'Одиниці: <code>s</code>·<code>m</code>·<code>h</code>·<code>d</code>. Активні — /list.',
  ].join('\n'),

  'remind.prompt':
    'Надішли <code>/remind in 10m &lt;текст&gt;</code> — або просто <code>10m &lt;текст&gt;</code>.',
  'remind.unparsable':
    'Не вдалося розпізнати час. Приклад: <code>/remind in 10m Купити молоко</code>.',
  'remind.scheduled': '✅ Заплановано на <b>{time}</b>:\n{text}',
  'remind.delivered': '⏰ <b>Нагадування</b>\n{text}',

  'list.empty': 'Немає активних нагадувань 🎉',
  'list.header': 'У тебе <b>{count}</b> активних нагадувань:',
  'list.done': 'Готово ✓',
  'list.deleted': 'Видалено 🗑',

  'admin.stats':
    '📊 <b>Статистика</b>\nВсього: <b>{total}</b>\nОчікують: <b>{pending}</b>',
  'admin.broadcast.usage':
    'Використання: <code>/broadcast &lt;повідомлення&gt;</code>',
  'admin.broadcast.message': '📣 {text}',
  'admin.broadcast.result': 'Доставлено {sent}/{total} чат(ів).',
};
