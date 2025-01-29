import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Save, Phone, MessageCircle, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface UserSettings {
  daily_message_limit: number;
  message_window_start: string;
  message_window_end: string;
  phone_number_1: string;
  phone_number_2: string;
  phone_number_3: string;
  phone_number_4: string;
  phone_number_selection: 'random' | 'sequential';
  message_wheel_mode: 'random' | 'sequential';
  message_wheel_delay: number;
  openai_api_key: string;
  deepseek_api_key: string;
  active_ai: 'openai' | 'deepseek';
  smrtphone_api_key: string;
  smrtphone_webhook_url: string;
}

type Tab = 'phone' | 'messaging' | 'wheel' | 'api';

export default function Settings() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('phone');
  const [settings, setSettings] = useState<UserSettings>({
    daily_message_limit: 100,
    message_window_start: '08:00',
    message_window_end: '21:00',
    phone_number_1: '',
    phone_number_2: '',
    phone_number_3: '',
    phone_number_4: '',
    phone_number_selection: 'sequential',
    message_wheel_mode: 'sequential',
    message_wheel_delay: 60,
    openai_api_key: '',
    deepseek_api_key: '',
    active_ai: 'deepseek',
    smrtphone_api_key: '',
    smrtphone_webhook_url: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [session]);

  const loadSettings = async () => {
    if (!session?.user.id) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    if (!session?.user.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          daily_message_limit: settings.daily_message_limit,
          message_window_start: settings.message_window_start,
          message_window_end: settings.message_window_end,
          phone_number_1: settings.phone_number_1 || null,
          phone_number_2: settings.phone_number_2 || null,
          phone_number_3: settings.phone_number_3 || null,
          phone_number_4: settings.phone_number_4 || null,
          phone_number_selection: settings.phone_number_selection,
          message_wheel_mode: settings.message_wheel_mode,
          message_wheel_delay: settings.message_wheel_delay,
          openai_api_key: settings.openai_api_key || null,
          deepseek_api_key: settings.deepseek_api_key || null,
          active_ai: settings.active_ai,
          smrtphone_api_key: settings.smrtphone_api_key || null,
          smrtphone_webhook_url: settings.smrtphone_webhook_url || null
        })
        .eq('user_id', session.user.id);

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'phone', label: 'Phone Numbers', icon: Phone },
    { id: 'messaging', label: 'Messaging', icon: MessageCircle },
    { id: 'wheel', label: 'Message Wheel', icon: MessageCircle },
    { id: 'api', label: 'API Settings', icon: Cpu }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sticky top-0 bg-gray-50 -mx-6 -mt-6 px-6 py-4 border-b z-10">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <Button 
          onClick={handleSave} 
          disabled={loading}
          loading={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'phone' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Phone Number Settings</h2>
            
            <div className="space-y-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num}>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number {num}
                  </label>
                  <input
                    type="tel"
                    value={settings[`phone_number_${num}` as keyof UserSettings]}
                    onChange={(e) => handleChange(`phone_number_${num}`, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                    placeholder="+1234567890"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number Selection Mode
              </label>
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="sequential"
                    checked={settings.phone_number_selection === 'sequential'}
                    onChange={(e) => handleChange('phone_number_selection', e.target.value)}
                    className="form-radio text-brand-600"
                  />
                  <span className="ml-2">Sequential</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="random"
                    checked={settings.phone_number_selection === 'random'}
                    onChange={(e) => handleChange('phone_number_selection', e.target.value)}
                    className="form-radio text-brand-600"
                  />
                  <span className="ml-2">Random</span>
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Sequential mode will use phone numbers in order, while random mode will select them randomly
              </p>
            </div>
          </div>
        )}

        {activeTab === 'messaging' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Messaging Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Daily Message Limit
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={settings.daily_message_limit}
                onChange={(e) => handleChange('daily_message_limit', parseInt(e.target.value) || 100)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Maximum number of messages that can be sent per day
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Message Window Start Time
                </label>
                <input
                  type="time"
                  value={settings.message_window_start}
                  onChange={(e) => handleChange('message_window_start', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Messages will start sending at this time
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Message Window End Time
                </label>
                <input
                  type="time"
                  value={settings.message_window_end}
                  onChange={(e) => handleChange('message_window_end', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Messages will stop sending at this time
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wheel' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Message Wheel Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Selection Mode
              </label>
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="sequential"
                    checked={settings.message_wheel_mode === 'sequential'}
                    onChange={(e) => handleChange('message_wheel_mode', e.target.value)}
                    className="form-radio text-brand-600"
                  />
                  <span className="ml-2">Sequential</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="random"
                    checked={settings.message_wheel_mode === 'random'}
                    onChange={(e) => handleChange('message_wheel_mode', e.target.value)}
                    className="form-radio text-brand-600"
                  />
                  <span className="ml-2">Random</span>
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Sequential mode will send messages in order, while random mode will select them randomly
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Message Delay (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={settings.message_wheel_delay}
                onChange={(e) => handleChange('message_wheel_delay', parseInt(e.target.value) || 60)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Minimum delay between messages in the wheel
              </p>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">API Settings</h2>

            {/* Smartphone API Settings */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="text-sm font-medium text-gray-900">Smartphone API</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.smrtphone_api_key}
                  onChange={(e) => handleChange('smrtphone_api_key', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="Enter your Smartphone API key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={settings.smrtphone_webhook_url}
                  onChange={(e) => handleChange('smrtphone_webhook_url', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="https://your-webhook-url.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  URL for receiving incoming message webhooks
                </p>
              </div>
            </div>

            {/* AI API Settings */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-medium text-gray-900">AI Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={settings.openai_api_key}
                  onChange={(e) => handleChange('openai_api_key', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Deepseek API Key
                </label>
                <input
                  type="password"
                  value={settings.deepseek_api_key}
                  onChange={(e) => handleChange('deepseek_api_key', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="Enter your Deepseek API key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active AI Provider
                </label>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="openai"
                      checked={settings.active_ai === 'openai'}
                      onChange={(e) => handleChange('active_ai', e.target.value)}
                      className="form-radio text-brand-600"
                    />
                    <span className="ml-2">OpenAI</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="deepseek"
                      checked={settings.active_ai === 'deepseek'}
                      onChange={(e) => handleChange('active_ai', e.target.value)}
                      className="form-radio text-brand-600"
                    />
                    <span className="ml-2">Deepseek</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}