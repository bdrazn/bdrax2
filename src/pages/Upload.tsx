import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface CSVRow {
  ID: string;
  tags: string;
  msg: string;
  'First Name': string;
  'Last Name': string;
  'Property Address': string;
  'Property City': string;
  'Property State': string;
  'Property Zip': string;
  'Business Name': string;
  'Mailing Address'?: string;
  [key: string]: string; // For phone numbers (Phone 1, Phone 2, etc.)
}

interface UploadStats {
  properties: { new: number; updated: number };
  contacts: { new: number; updated: number };
  relationships: number;
  errors: number;
}

export default function Upload() {
  const { session } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    properties: { new: 0, updated: 0 },
    contacts: { new: 0, updated: 0 },
    relationships: 0,
    errors: 0
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setHasUploaded(false);
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as CSVRow[]);
      }
    });
  };

  const processUpload = async () => {
    if (!file || !session) return;

    setUploading(true);
    const stats: UploadStats = {
      properties: { new: 0, updated: 0 },
      contacts: { new: 0, updated: 0 },
      relationships: 0,
      errors: 0
    };

    try {
      // Get workspace ID
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as CSVRow[];

          for (const row of rows) {
            try {
              // Clean and validate required fields
              const firstName = (row['First Name'] || '').trim();
              const lastName = (row['Last Name'] || '').trim();
              const address = (row['Property Address'] || '').trim();

              // Skip row if any required field is missing
              if (!firstName || !lastName || !address) {
                console.warn('Skipping row due to missing required fields:', row);
                stats.errors++;
                continue;
              }

              // Clean optional fields
              const city = (row['Property City'] || 'Unknown').trim();
              const state = (row['Property State'] || 'Unknown').trim();
              const zip = (row['Property Zip'] || 'Unknown').trim();
              const businessName = row['Business Name']?.trim() || null;
              const mailingAddress = row['Mailing Address']?.trim() || null;

              // Get or create contact using RPC function
              const { data: contact, error: contactError } = await supabase.rpc(
                'get_or_create_contact',
                {
                  p_workspace_id: workspace.workspace_id,
                  p_first_name: firstName,
                  p_last_name: lastName,
                  p_business_name: businessName,
                  p_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
                }
              );

              if (contactError) throw contactError;
              stats.contacts.new++;

              // Create or update property
              const propertyData = {
                workspace_id: workspace.workspace_id,
                address,
                city,
                state,
                zip,
                mailing_address: mailingAddress,
                units: 1
              };

              const { data: property, error: propertyError } = await supabase
                .from('properties')
                .upsert(propertyData)
                .select()
                .single();

              if (propertyError) throw propertyError;
              stats.properties.new++;

              // Create contact-property relationship
              if (contact && property) {
                await supabase.rpc('create_contact_property_relationship', {
                  p_contact_id: contact,
                  p_property_id: property.id,
                  p_relationship_type: 'owner',
                  p_workspace_id: workspace.workspace_id
                });
                stats.relationships++;
              }

              // Log successful import
              await supabase.rpc('log_activity', {
                p_workspace_id: workspace.workspace_id,
                p_entity_type: 'import',
                p_entity_id: property.id,
                p_action: 'import_record',
                p_status: 'success',
                p_message: `Imported ${address} and associated with ${firstName} ${lastName}`
              });

            } catch (error) {
              console.error('Error processing row:', error);
              stats.errors++;

              // Log error
              await supabase.rpc('log_activity', {
                p_workspace_id: workspace.workspace_id,
                p_entity_type: 'import',
                p_entity_id: null,
                p_action: 'import_record',
                p_status: 'error',
                p_message: `Error importing record: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          }

          setUploadStats(stats);
          setHasUploaded(true);
          if (stats.errors === 0) {
            toast.success('Upload completed successfully');
          } else {
            toast.success(`Upload completed with ${stats.errors} errors`);
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error('Failed to parse CSV file');
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Upload Data</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="max-w-xl">
          <label className="block text-sm font-medium text-gray-700">
            Upload CSV File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV files only</p>
            </div>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value, j) => (
                        <td
                          key={j}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(uploadStats.properties.new > 0 || uploadStats.properties.updated > 0) && (
          <div className="mt-6 bg-green-50 p-4 rounded-lg">
            <div className="flex">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Upload Complete
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Properties: {uploadStats.properties.new} new, {uploadStats.properties.updated} updated
                    </li>
                    <li>
                      Contacts: {uploadStats.contacts.new} new, {uploadStats.contacts.updated} updated
                    </li>
                    <li>{uploadStats.relationships} relationships established</li>
                    {uploadStats.errors > 0 && (
                      <li className="text-red-600">
                        {uploadStats.errors} errors encountered
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Button
            onClick={processUpload}
            disabled={!file || uploading || hasUploaded}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : hasUploaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Upload Complete
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Data
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}