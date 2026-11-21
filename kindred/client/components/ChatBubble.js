export default function ChatBubble({ message }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`bubble ${message.mine ? 'mine' : ''}`}>
      {message.text}
      <time dateTime={message.createdAt}>{time}</time>
    </div>
  );
}
