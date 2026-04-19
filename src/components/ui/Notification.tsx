export function Notification({ notification }: { notification: { type: 'success' | 'error'; msg: string } | null }) {
  if (!notification) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
      {notification.msg}
    </div>
  );
}
