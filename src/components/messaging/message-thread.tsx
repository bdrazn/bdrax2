import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { Button } from '../ui/button';
import { ThumbsUp, ThumbsDown, Ban, Phone } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'failed';
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  className?: string;
  onStatusChange?: (status: 'interested' | 'not_interested' | 'dnc') => void;
  currentStatus?: string | null;
  phoneNumbers?: string[];
  selectedPhone?: string;
  onPhoneSelect?: (phone: string) => void;
  contactPhones?: string[];
  selectedContactPhone?: string;
  onContactPhoneSelect?: (phone: string) => void;
}

export function MessageThread({ 
  messages, 
  currentUserId, 
  className,
  onStatusChange,
  currentStatus,
  phoneNumbers = [],
  selectedPhone,
  onPhoneSelect,
  contactPhones = [],
  selectedContactPhone,
  onContactPhoneSelect
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {(onStatusChange || phoneNumbers.length > 0) && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            {onStatusChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Lead Status:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={currentStatus === 'interested' ? 'primary' : 'outline'}
                    onClick={() => onStatusChange('interested')}
                    className="flex items-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Interested
                  </Button>
                  <Button
                    size="sm"
                    variant={currentStatus === 'not_interested' ? 'primary' : 'outline'}
                    onClick={() => onStatusChange('not_interested')}
                    className="flex items-center gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Not Interested
                  </Button>
                  <Button
                    size="sm"
                    variant={currentStatus === 'dnc' ? 'destructive' : 'outline'}
                    onClick={() => onStatusChange('dnc')}
                    className="flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    DNC
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {phoneNumbers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Send From:</span>
                <select
                  value={selectedPhone}
                  onChange={(e) => onPhoneSelect?.(e.target.value)}
                  className="text-sm rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                >
                  <option value="">Select phone number...</option>
                  {phoneNumbers.map((phone) => (
                    <option key={phone} value={phone}>
                      {formatPhoneNumber(phone)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {contactPhones.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Send To:</span>
                <select
                  value={selectedContactPhone}
                  onChange={(e) => onContactPhoneSelect?.(e.target.value)}
                  className="text-sm rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                >
                  <option value="">Select phone number...</option>
                  {contactPhones.map((phone) => (
                    <option key={phone} value={phone}>
                      {formatPhoneNumber(phone)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender_id === currentUserId;
          const showTimestamp = index === 0 || 
            new Date(message.created_at).getTime() - 
            new Date(messages[index - 1].created_at).getTime() > 300000; // 5 minutes

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[70%] space-y-1",
                isCurrentUser ? "items-end" : "items-start"
              )}>
                {showTimestamp && (
                  <div className="px-2 py-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
                <div className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  isCurrentUser
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                )}>
                  {message.content}
                </div>
                {isCurrentUser && message.status && (
                  <div className="px-2">
                    <span className={cn(
                      "text-xs",
                      message.status === 'delivered' && "text-green-600",
                      message.status === 'sent' && "text-gray-500",
                      message.status === 'failed' && "text-red-600"
                    )}>
                      {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}