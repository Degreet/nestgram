export const en = {
  'menu.remind': '➕ Remind',
  'menu.list': '📋 My reminders',
  'menu.help': 'ℹ️ Help',

  'start.greeting': 'Hi, <b>{name}</b>!\n\n{help}',
  'help.text': [
    '<b>Reminder bot</b> — I ping you when it’s time.',
    '',
    'Schedule with a duration:',
    '<code>/remind in 10m Buy milk</code>',
    '…or just send <code>2h Call mom</code> with no command.',
    '',
    'Units: <code>s</code>·<code>m</code>·<code>h</code>·<code>d</code>. See pending with /list.',
  ].join('\n'),

  'remind.prompt':
    'Send <code>/remind in 10m &lt;text&gt;</code> — or just <code>10m &lt;text&gt;</code>.',
  'remind.unparsable':
    'Couldn’t read a time from that. Example: <code>/remind in 10m Buy milk</code>.',
  'remind.scheduled': '✅ Scheduled for <b>{time}</b>:\n{text}',
  'remind.delivered': '⏰ <b>Reminder</b>\n{text}',

  'list.empty': 'No pending reminders 🎉',
  'list.header': 'You have <b>{count}</b> pending reminder(s):',
  'list.done': 'Done ✓',
  'list.deleted': 'Deleted 🗑',

  'admin.stats':
    '📊 <b>Stats</b>\nTotal: <b>{total}</b>\nPending: <b>{pending}</b>',
  'admin.broadcast.usage': 'Usage: <code>/broadcast &lt;message&gt;</code>',
  'admin.broadcast.message': '📣 {text}',
  'admin.broadcast.result': 'Delivered to {sent}/{total} chat(s).',
};
