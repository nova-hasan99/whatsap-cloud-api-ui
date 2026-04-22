import { MessageSquare } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#f0f2f5] px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-wa-primary/10">
        <MessageSquare size={48} className="text-wa-primary" />
      </div>
      <h2 className="mt-4 text-2xl font-light text-gray-700">
        WhatsApp for Business
      </h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Select a conversation from the list to start messaging your customers.
      </p>
    </div>
  );
}
