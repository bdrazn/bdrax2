import { Home, Building2, Users, DollarSign, MessageSquare, Settings, Megaphone, Upload, List, Tags, Brain, BarChart, MessageCircle, Activity } from 'lucide-react';

export const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Deals', href: '/deals', icon: DollarSign },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Message Wheel', href: '/message-wheel', icon: MessageCircle },
  { name: 'AI', href: '/deepseek', icon: Brain },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Lists', href: '/lists', icon: List },
  { name: 'Tags', href: '/tags', icon: Tags },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const;