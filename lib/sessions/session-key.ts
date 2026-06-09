// The default session key is the shared per-conversation key (chat · user ·
// forum topic · business connection); kept under the `defaultSessionKey` name so
// the public API and existing imports stay stable.
export { defaultConversationKey as defaultSessionKey } from '../store/conversation-key';
