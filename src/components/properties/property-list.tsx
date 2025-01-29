import { useState } from 'react';
import { Building2, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  units: number;
  lead_status: string | null;
  tags: string[];
}

interface PropertyListProps {
  properties: Property[];
  selectedProperties: Set<string>;
  onPropertySelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onViewDetails: (id: string) => void;
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
}

export function PropertyList({
  properties,
  selectedProperties,
  onPropertySelect,
  onSelectAll,
  onViewDetails,
  onEdit,
  onDelete
}: PropertyListProps) {
  const allSelected = properties.length > 0 && 
    properties.every(p => selectedProperties.has(p.id));

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-brand-600 rounded border-gray-300"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          <span className="ml-2 text-sm text-gray-700">Select All</span>
        </label>
        <span className="ml-4 text-sm text-gray-500">
          {selectedProperties.size} selected
        </span>
      </div>

      <div className="divide-y">
        {properties.map(property => (
          <div
            key={property.id}
            className={cn(
              "p-4 hover:bg-gray-50 transition-colors",
              selectedProperties.has(property.id) && "bg-brand-50"
            )}
            onClick={() => onViewDetails(property.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div onClick={(e) => {
                    e.stopPropagation();
                    onPropertySelect(property.id);
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedProperties.has(property.id)}
                      onChange={() => {}} // Controlled component
                      className="form-checkbox h-4 w-4 text-brand-600 rounded border-gray-300"
                    />
                  </div>
                  <span className="font-medium text-brand-600">
                    {property.address}
                  </span>
                  {property.lead_status && (
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      property.lead_status === 'interested'
                        ? 'bg-green-100 text-green-800'
                        : property.lead_status === 'not_interested'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    )}>
                      {property.lead_status.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mt-1">
                  {property.city}, {property.state} {property.zip}
                </p>

                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1" />
                    {property.units} {property.units === 1 ? 'unit' : 'units'}
                  </span>
                </div>

                {property.tags && property.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {property.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-brand-50 text-brand-700 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(property);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(property.id);
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}