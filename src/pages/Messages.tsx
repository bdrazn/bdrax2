import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { MessageComposer } from '@/components/messaging/message-composer';
import { MessageThread } from '@/components/messaging/message-thread';
import { ContactList } from '@/components/messaging/contact-list';
import { Plus, Search, X, Building2, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPhoneNumber } from '@/lib/utils';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  email: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
  phone5?: string;
  properties: { id: string; address: string; city: string; state: string }[];
  unread_count?: number;
  last_message?: {
    content: string;
    created_at: string;
  };
  status?: 'interested' | 'not_interested' | 'dnc' | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'failed';
  read_at?: string | null;
}

export default function Messages() {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageSearch, setNewMessageSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [contactPhones, setContactPhones] = useState<string[]>([]);
  const [selectedContactPhone, setSelectedContactPhone] = useState<string>('');

  useEffect(() => {
    if (session) {
      loadContacts();
      loadPhoneNumbers();
    }
  }, [session]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
      // Get contact's phone numbers
      const phones = [
        selectedContact.phone1,
        selectedContact.phone2,
        selectedContact.phone3,
        selectedContact.phone4,
        selectedContact.phone5
      ].filter(Boolean) as string[];
      setContactPhones(phones);
      if (phones.length > 0) {
        setSelectedContactPhone(phones[0]);
      }
    }
  }, [selectedContact]);

  const loadPhoneNumbers = async () => {
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('phone_number_1, phone_number_2, phone_number_3, phone_number_4')
        .eq('user_id', session!.user.id)
        .single();

      if (settings) {
        const numbers = [
          settings.phone_number_1,
          settings.phone_number_2,
          settings.phone_number_3,
          settings.phone_number_4
        ].filter(Boolean);
        setPhoneNumbers(numbers);
        if (numbers.length > 0) {
          setSelectedPhone(numbers[0]);
        }
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      // Get all contacts for new message modal
      const { data: allContactsData } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          email,
          phone1,
          phone2,
          phone3,
          phone4,
          phone5,
          contact_properties (
            property:properties (
              id,
              address,
              city,
              state
            )
          )
        `)
        .eq('workspace_id', workspace.workspace_id);

      if (allContactsData) {
        setAllContacts(allContactsData.map(contact => ({
          ...contact,
          properties: contact.contact_properties?.map((cp: any) => cp.property) || []
        })));
      }

      // Get contacts with message threads
      const { data: threadsData } = await supabase
        .from('message_threads')
        .select(`
          id,
          status,
          contact:profiles (
            id,
            first_name,
            last_name,
            business_name,
            email,
            phone1,
            phone2,
            phone3,
            phone4,
            phone5
          ),
          messages (
            content,
            created_at,
            sender_id,
            read_at
          )
        `)
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });

      if (threadsData) {
        const contactsWithMessages = threadsData
          .filter(thread => thread.messages && thread.messages.length > 0)
          .map(thread => ({
            ...thread.contact,
            status: thread.status,
            last_message: thread.messages[0],
            unread_count: thread.messages.filter(m => 
              m.sender_id !== session!.user.id && 
              !m.read_at
            ).length
          }))
          // Sort by unread first, then by date
          .sort((a, b) => {
            if (a.unread_count && !b.unread_count) return -1;
            if (!a.unread_count && b.unread_count) return 1;
            return new Date(b.last_message?.created_at || 0).getTime() - 
                   new Date(a.last_message?.created_at || 0).getTime();
          });

        setContacts(contactsWithMessages);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', contactId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', contactId)
        .is('read_at', null);

      // Update local state to reflect read messages
      setContacts(prev => {
        const updated = prev.map(contact => 
          contact.id === contactId
            ? { ...contact, unread_count: 0 }
            : contact
        );
        // Re-sort contacts after marking as read
        return updated.sort((a, b) => {
          if (a.unread_count && !b.unread_count) return -1;
          if (!a.unread_count && b.unread_count) return 1;
          return new Date(b.last_message?.created_at || 0).getTime() - 
                 new Date(a.last_message?.created_at || 0).getTime();
        });
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedContact || !session || !selectedPhone || !selectedContactPhone) {
      toast.error('Please select both a sending and receiving phone number');
      return;
    }

    // Add optimistic message
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content,
      sender_id: session.user.id,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedContact.id,
          content,
          sender_id: session.user.id,
          from_number: selectedPhone,
          to_number: selectedContactPhone
        });

      if (error) throw error;

      // Update contact's last message
      setContacts(prev => prev.map(contact => 
        contact.id === selectedContact.id
          ? {
              ...contact,
              last_message: {
                content,
                created_at: new Date().toISOString()
              }
            }
          : contact
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove failed message
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }
  };

  const handleStatusChange = async (status: 'interested' | 'not_interested' | 'dnc') => {
    if (!selectedContact) return;

    try {
      const { error } = await supabase
        .from('message_threads')
        .update({ status })
        .eq('id', selectedContact.id);

      if (error) throw error;

      // Update local state
      setContacts(prev => prev.map(contact => 
        contact.id === selectedContact.id
          ? { ...contact, status }
          : contact
      ));

      setSelectedContact(prev => prev ? { ...prev, status } : null);
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredContacts = allContacts.filter(contact => {
    if (!newMessageSearch) return true;

    const searchLower = newMessageSearch.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const businessName = contact.business_name?.toLowerCase() || '';
    const properties = contact.properties.map(p => 
      `${p.address} ${p.city} ${p.state}`.toLowerCase()
    ).join(' ');

    return (
      fullName.includes(searchLower) ||
      businessName.includes(searchLower) ||
      properties.includes(searchLower)
    );
  });

  const handleSelectNewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowNewMessage(false);
    setNewMessageSearch('');
    
    // Set contact's phone numbers
    const phones = [
      contact.phone1,
      contact.phone2,
      contact.phone3,
      contact.phone4,
      contact.phone5
    ].filter(Boolean) as string[];
    setContactPhones(phones);
    if (phones.length > 0) {
      setSelectedContactPhone(phones[0]);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4">
      {/* Contact List Sidebar */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-medium">Messages</h2>
          <Button size="sm" onClick={() => setShowNewMessage(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <ContactList
          contacts={contacts}
          selectedId={selectedContact?.id}
          onSelect={setSelectedContact}
        />
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedContact ? (
          <>
            <div className="border-b p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h2>
                  {selectedContact.business_name && (
                    <p className="text-sm text-gray-500">
                      {selectedContact.business_name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <MessageThread
              messages={messages}
              currentUserId={session!.user.id}
              onStatusChange={handleStatusChange}
              currentStatus={selectedContact.status}
              phoneNumbers={phoneNumbers}
              selectedPhone={selectedPhone}
              onPhoneSelect={setSelectedPhone}
              contactPhones={contactPhones}
              selectedContactPhone={selectedContactPhone}
              onContactPhoneSelect={setSelectedContactPhone}
              className="flex-1"
            />

            <div className="border-t p-4">
              <MessageComposer
                onSend={handleSendMessage}
                placeholder="Type a message..."
                disabled={!selectedPhone || !selectedContactPhone}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation or start a new one
          </div>
        )}
      </div>

      {/* New Message Modal */}
      <Modal
        isOpen={showNewMessage}
        onClose={() => {
          setShowNewMessage(false);
          setNewMessageSearch('');
        }}
        title="New Message"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={newMessageSearch}
              onChange={(e) => setNewMessageSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {newMessageSearch && (
              <button
                onClick={() => setNewMessageSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredContacts.map((contact, index) => (
                <motion.button
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectNewContact(contact)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <p className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </p>
                      </div>
                      {contact.business_name && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Building2 className="w-4 h-4 mr-1" />
                          {contact.business_name}
                        </p>
                      )}
                      {contact.phone1 && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="w-4 h-4 mr-1" />
                          {formatPhoneNumber(contact.phone1)}
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Mail className="w-4 h-4 mr-1" />
                          {contact.email}
                        </p>
                      )}
                      {contact.properties.map(property => (
                        <p key={property.id} className="text-sm text-gray-500 flex items-center mt-1">
                          <Building2 className="w-4 h-4 mr-1" />
                          {property.address}, {property.city}, {property.state}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Modal>
    </div>
  );
}