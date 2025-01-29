import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MessageWheel as MessageWheelComponent } from '@/components/messaging/message-wheel';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MessageWheel() {
  const { session } = useAuth();
  const [messages, setMessages] = useState(['']);
  const [activeCount, setActiveCount] = useState(1);
  const [name, setName] = useState('Default Wheel');
  const [mode, setMode] = useState<'sequential' | 'random'>('sequential');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!session) return;

    setSaving(true);
    try {
      // Get workspace ID
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // Save message wheel
      const { error } = await supabase
        .from('message_wheels')
        .insert({
          workspace_id: workspace.workspace_id,
          name,
          messages: messages.map(content => ({ content })),
          active_count: activeCount,
          mode,
          created_by: session.user.id
        });

      if (error) throw error;
      toast.success('Message wheel saved successfully');
    } catch (error) {
      console.error('Error saving message wheel:', error);
      toast.error('Failed to save message wheel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4">
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Message Wheel</h1>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Wheel
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wheel Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="Enter wheel name..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selection Mode
                </label>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="sequential"
                      checked={mode === 'sequential'}
                      onChange={(e) => setMode(e.target.value as 'sequential' | 'random')}
                      className="form-radio text-brand-600"
                    />
                    <span className="ml-2">Sequential</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="random"
                      checked={mode === 'random'}
                      onChange={(e) => setMode(e.target.value as 'sequential' | 'random')}
                      className="form-radio text-brand-600"
                    />
                    <span className="ml-2">Random</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-1">
                  {/* Preview Area */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Message Preview</h3>
                    <div className="space-y-4">
                      {messages.slice(0, activeCount).map((message, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="text-sm text-gray-500 mb-2">Message {index + 1}</div>
                          <div className="text-sm">{message || 'No message content'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <MessageWheelComponent
                  messages={messages}
                  activeCount={activeCount}
                  onMessagesChange={setMessages}
                  onActiveCountChange={setActiveCount}
                  className="w-80 bg-white rounded-lg shadow-sm border"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}