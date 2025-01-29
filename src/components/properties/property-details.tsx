import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Phone, Mail, Calendar } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { Modal } from '../ui/modal';

interface PropertyDetailsProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PropertyOwner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  business_name?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
  phone6?: string;
  phone7?: string;  
  phone8?: string;
  phone9?: string;
  phone10?: string;
  phone11?: string;
  phone12?: string;
  phone13?: string;
  phone14?: string;
  phone5?: string;
}

interface PropertyStatus {
  status: 'interested' | 'not_interested' | 'dnc';
  created_at: string;
  source: 'user' | 'ai';
  confidence?: number;
  reasoning?: string;
}

interface PropertyDetails {
  id: string;
  address: string;
  mailing_address?: string;
  city: string;
  state: string;
  zip: string;
  units: number;
  status: string;
  tags: string[];
  owner?: PropertyOwner;
  status_history?: PropertyStatus[];
  created_at: string;
  updated_at: string;
}

export function PropertyDetails({ propertyId, isOpen, onClose }: PropertyDetailsProps) {
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && propertyId) {
      loadPropertyDetails();
    }
  }, [propertyId, isOpen]);

  const loadPropertyDetails = async () => {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          contact_properties (
            contact:profiles (
              id,
              first_name,
              last_name,
              email,
              business_name,
              phone1,
              phone2,
              phone3,
              phone4,
              phone5
            )
          ),
          status_history:property_status_history (
            status,
            created_at,
            source,
            confidence,
            reasoning
          )
        `)
        .eq('id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Transform the data
      const owner = propertyData.contact_properties?.[0]?.contact;
      setProperty({
        ...propertyData,
        owner: owner ? {
          id: owner.id,
          first_name: owner.first_name,
          last_name: owner.last_name,
          email: owner.email,
          business_name: owner.business_name,
          phone1: owner.phone1,
          phone2: owner.phone2,
          phone3: owner.phone3,
          phone4: owner.phone4,
          phone5: owner.phone5
        } : undefined,
        status_history: propertyData.status_history?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      });
    } catch (error) {
      console.error('Error loading property details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  // Get owner's phone numbers as an array
  const ownerPhones = property.owner ? [
    property.owner.phone1,
    property.owner.phone2,
    property.owner.phone3,
    property.owner.phone4,
    property.owner.phone5,
property.owner.phone6,
property.owner.phone7,
property.owner.phone8,
property.owner.phone9,
property.owner.phone10,
property.owner.phone11,
property.owner.phone12,
property.owner.phone13,
property.owner.phone14,
property.owner.phone15
  ].filter(Boolean) : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Property Details"
      className="max-w-3xl"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Property Information */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium">{property.address}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.city}, {property.state} {property.zip}
                </p>
                {property.mailing_address && (
                  <p className="text-sm text-gray-500 mt-1">
                    Mailing Address: {property.mailing_address}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Units: {property.units}
                </p>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status History</h4>
            {property.status_history && property.status_history.length > 0 ? (
              <div className="space-y-3">
                {property.status_history.map((status, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status.status === 'interested'
                          ? 'bg-green-100 text-green-800'
                          : status.status === 'not_interested'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {status.status.replace('_', ' ').charAt(0).toUpperCase() + 
                         status.status.replace('_', ' ').slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(status.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">
                        Source: {status.source === 'ai' ? 'AI Analysis' : 'Manual Update'}
                        {status.confidence && ` (${(status.confidence * 100).toFixed(1)}% confidence)`}
                      </p>
                      {status.reasoning && (
                        <p className="text-gray-500 mt-1">{status.reasoning}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No status recorded</p>
            )}
          </div>

          {/* Tags */}
          {property.tags && property.tags.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {property.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Owner Information */}
          {property.owner && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Owner Information</h4>
              <div className="space-y-2">
                <p className="text-sm">
                  {property.owner.first_name} {property.owner.last_name}
                </p>
                {property.owner.business_name && (
                  <p className="text-sm text-gray-500">
                    {property.owner.business_name}
                  </p>
                )}
                <p className="text-sm flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {property.owner.email}
                </p>
                {ownerPhones.map((phone, index) => (
                  <p key={index} className="text-sm flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {formatPhoneNumber(phone)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Record Information */}
          <div className="border-t pt-4 text-sm text-gray-500">
            <p>Created: {new Date(property.created_at).toLocaleString()}</p>
            <p>Last Updated: {new Date(property.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}