import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageWheelProps {
  messages: string[];
  activeCount: number;
  onMessagesChange: (messages: string[]) => void;
  onActiveCountChange: (count: number) => void;
  className?: string;
}

export function MessageWheel({
  messages = [''],
  activeCount = 1,
  onMessagesChange,
  onActiveCountChange,
  className
}: MessageWheelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const MAX_MESSAGES = 5;

  const handleAddMessage = () => {
    if (messages.length >= MAX_MESSAGES) return;
    const newMessages = [...messages, ''];
    onMessagesChange(newMessages);
  };

  const handleUpdateMessage = (index: number, content: string) => {
    const newMessages = [...messages];
    newMessages[index] = content;
    onMessagesChange(newMessages);
  };

  const handleRotate = (direction: 'left' | 'right') => {
    let newIndex = direction === 'left' 
      ? (currentIndex - 1 + messages.length) % messages.length
      : (currentIndex + 1) % messages.length;
    setCurrentIndex(newIndex);
  };

  const insertMergeField = (field: string) => {
    const message = messages[currentIndex];
    const textarea = document.querySelector(`textarea[data-index="${currentIndex}"]`) as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + 
                        `{{${field}}}` + 
                        message.substring(end);
      
      handleUpdateMessage(currentIndex, newMessage);
      
      // Set cursor position after merge field
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + field.length + 4; // 4 for {{ and }}
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b">
        <h3 className="font-medium mb-4">Message Sequence</h3>
        
        {/* Message Count Slider */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Active Messages</label>
          <input
            type="range"
            min="1"
            max={messages.length}
            value={activeCount}
            onChange={(e) => onActiveCountChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>1</span>
            <span>{messages.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Message Wheel */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Message {currentIndex + 1} of {messages.length}</span>
                <span>{messages[currentIndex]?.length || 0}/160</span>
              </div>
              <textarea
                data-index={currentIndex}
                value={messages[currentIndex]}
                onChange={(e) => handleUpdateMessage(currentIndex, e.target.value)}
                className="w-full h-32 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Type your message..."
              />
            </motion.div>
          </AnimatePresence>

          {messages.length > 1 && (
            <>
              <button
                onClick={() => handleRotate('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 p-1 rounded-full bg-white border shadow-sm hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRotate('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 p-1 rounded-full bg-white border shadow-sm hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Merge Fields */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Insert Merge Field
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">Contact</h4>
              <div className="space-y-1">
                <button
                  onClick={() => insertMergeField('contact_name')}
                  className="w-full text-left text-sm px-2 py-1 hover:bg-gray-50 rounded"
                >
                  <Tag className="w-3 h-3 inline-block mr-1" />
                  Name/Business
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">Property</h4>
              <div className="space-y-1">
                <button
                  onClick={() => insertMergeField('property_address')}
                  className="w-full text-left text-sm px-2 py-1 hover:bg-gray-50 rounded"
                >
                  <Tag className="w-3 h-3 inline-block mr-1" />
                  Street Address
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Message Button */}
        {messages.length < MAX_MESSAGES && (
          <Button
            onClick={handleAddMessage}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Message ({messages.length}/{MAX_MESSAGES})
          </Button>
        )}
      </div>
    </div>
  );
}