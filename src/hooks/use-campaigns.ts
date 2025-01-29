import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/error-handler';

interface Campaign {
  id: string;
  name: string;
  workspace_id: string;
  template_id: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  scheduled_for: string | null;
  target_list: {
    zip_codes?: string[];
    property_type?: string;
    min_units?: number;
    max_units?: number;
    min_value?: number;
    max_value?: number;
  };
  created_at: string;
  updated_at: string;
}

interface CampaignStats {
  total_messages: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  response_count: number;
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw handleError(new Error('Not authenticated'), {
            file: 'use-campaigns.ts',
            function: 'queryFn',
            operation: 'get user'
          });
        }

        // Get user's workspace using workspace_users table
        const { data: workspaceUser, error: workspaceError } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        if (workspaceError) {
          throw handleError(workspaceError, {
            file: 'use-campaigns.ts',
            function: 'queryFn',
            operation: 'get workspace'
          });
        }

        if (!workspaceUser) {
          throw handleError(new Error('No workspace found'), {
            file: 'use-campaigns.ts',
            function: 'queryFn',
            operation: 'validate workspace'
          });
        }

        const { data, error } = await supabase
          .from('bulk_message_campaigns')
          .select(`
            *,
            stats:bulk_message_stats(
              total_messages,
              sent_count,
              delivered_count,
              failed_count,
              response_count
            )
          `)
          .eq('workspace_id', workspaceUser.workspace_id)
          .order('created_at', { ascending: false });

        if (error) {
          throw handleError(error, {
            file: 'use-campaigns.ts',
            function: 'queryFn',
            operation: 'fetch campaigns'
          });
        }

        return data;
      } catch (error) {
        // If error wasn't handled by handleError, handle it here
        if (!error.location) {
          handleError(error, {
            file: 'use-campaigns.ts',
            function: 'queryFn',
            operation: 'unknown operation'
          });
        }
        throw error;
      }
    }
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get user's workspace
        const { data: workspaceUser } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        if (!workspaceUser) throw new Error('No workspace found');

        const { data, error } = await supabase
          .from('bulk_message_campaigns')
          .insert({
            ...campaign,
            workspace_id: workspaceUser.workspace_id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        handleError(error, {
          file: 'use-campaigns.ts',
          function: 'createCampaign',
          operation: 'create campaign'
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created successfully');
    }
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      handleError(error, {
        file: 'use-campaigns.ts',
        function: 'updateCampaign',
        operation: 'update campaign'
      });
    }
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bulk_message_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error) => {
      handleError(error, {
        file: 'use-campaigns.ts',
        function: 'deleteCampaign',
        operation: 'delete campaign'
      });
    }
  });

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign
  };
}