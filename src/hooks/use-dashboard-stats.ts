import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subDays } from 'date-fns';
import { handleError } from '@/lib/error-handler';

interface DashboardStats {
  properties: {
    total: number;
    active: number;
    pending: number;
    sold: number;
  };
  contacts: {
    total: number;
    newThisMonth: number;
    interested: number;
    notInterested: number;
  };
  deals: {
    active: number;
    value: number;
    closedThisMonth: number;
    pipeline: number;
  };
  messages: {
    sent: number;
    delivered: number;
    responses: number;
    responseRate: number;
    activity: {
      date: string;
      sent: number;
      responses: number;
    }[];
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const last30Days = Array.from({ length: 30 }, (_, i) => 
          format(subDays(today, i), 'yyyy-MM-dd')
        ).reverse();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw handleError(new Error('Not authenticated'), {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'get user'
          });
        }

        // Get user's workspace - use workspace_users to get the single workspace
        const { data: workspaceUser, error: workspaceError } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        if (workspaceError) {
          throw handleError(workspaceError, {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'get workspace'
          });
        }

        if (!workspaceUser) {
          throw handleError(new Error('No workspace found'), {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'validate workspace'
          });
        }

        // Get property stats
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('lead_status')
          .eq('workspace_id', workspaceUser.workspace_id);

        if (propertyError) {
          throw handleError(propertyError, {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'fetch properties'
          });
        }

        const propertyStats = {
          total: propertyData?.length || 0,
          active: propertyData?.filter(p => p.lead_status === 'interested').length || 0,
          pending: propertyData?.filter(p => !p.lead_status).length || 0,
          sold: propertyData?.filter(p => p.lead_status === 'not_interested').length || 0
        };

        // Get contact stats
        const { data: contactData, error: contactError } = await supabase
          .from('property_contacts')
          .select('created_at, id')
          .eq('workspace_id', workspaceUser.workspace_id);

        if (contactError) {
          throw handleError(contactError, {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'fetch contacts'
          });
        }

        const { data: contactStatusData, error: statusError } = await supabase
          .from('message_threads')
          .select('status')
          .eq('workspace_id', workspaceUser.workspace_id);

        if (statusError) {
          throw handleError(statusError, {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'fetch message threads'
          });
        }

        const contactStats = {
          total: contactData?.length || 0,
          newThisMonth: contactData?.filter(c => 
            new Date(c.created_at) >= firstDayOfMonth
          ).length || 0,
          interested: contactStatusData?.filter(c => c.status === 'interested').length || 0,
          notInterested: contactStatusData?.filter(c => c.status === 'not_interested').length || 0
        };

        // Get message stats
        const { data: messageStats, error: messageError } = await supabase
          .from('message_analytics')
          .select('*')
          .eq('workspace_id', workspaceUser.workspace_id)
          .in('date', last30Days);

        if (messageError) {
          throw handleError(messageError, {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'fetch message analytics'
          });
        }

        const messageActivity = last30Days.map(date => {
          const dayStats = messageStats?.find(s => s.date === date) || {
            messages_sent: 0,
            responses_received: 0
          };
          return {
            date,
            sent: dayStats.messages_sent,
            responses: dayStats.responses_received
          };
        });

        const latestStats = messageStats?.[messageStats.length - 1] || {
          messages_sent: 0,
          messages_delivered: 0,
          responses_received: 0
        };

        return {
          properties: propertyStats,
          contacts: contactStats,
          deals: {
            active: 12,
            value: 2500000,
            closedThisMonth: 3,
            pipeline: 8
          },
          messages: {
            sent: latestStats.messages_sent,
            delivered: latestStats.messages_delivered,
            responses: latestStats.responses_received,
            responseRate: latestStats.messages_sent > 0 
              ? Number((latestStats.responses_received / latestStats.messages_sent * 100).toFixed(1))
              : 0,
            activity: messageActivity
          }
        };
      } catch (error) {
        // If error wasn't handled by handleError, handle it here
        if (!error.location) {
          handleError(error, {
            file: 'use-dashboard-stats.ts',
            function: 'queryFn',
            operation: 'unknown operation'
          });
        }
        throw error;
      }
    },
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}