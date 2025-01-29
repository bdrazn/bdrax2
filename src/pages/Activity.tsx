import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Play, Pause, CheckCircle2, XCircle, Clock, Calendar, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';

interface Job {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  total_tasks: number;
  completed_tasks: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface Task {
  id: string;
  job_id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ActivityLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  created_at: string;
}

export default function Activity() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsPage, setJobsPage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (session) {
      loadJobs();
      loadLogs();
    }
  }, [session, jobsPage, logsPage]);

  useEffect(() => {
    if (selectedJob) {
      loadTasks(selectedJob);
    }
  }, [selectedJob, tasksPage]);

  const loadJobs = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      const { data, error } = await supabase
        .rpc('get_jobs', {
          p_workspace_id: workspace.workspace_id,
          p_page: jobsPage,
          p_page_size: PAGE_SIZE
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setJobs(data);
        setTotalJobs(Math.ceil(data[0].total_count / PAGE_SIZE));
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_tasks', {
          p_job_id: jobId,
          p_page: tasksPage,
          p_page_size: PAGE_SIZE
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setTasks(data);
        setTotalTasks(Math.ceil(data[0].total_count / PAGE_SIZE));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      const { data, error } = await supabase
        .rpc('get_activity_logs', {
          p_workspace_id: workspace.workspace_id,
          p_page: logsPage,
          p_page_size: PAGE_SIZE
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setLogs(data);
        setTotalLogs(Math.ceil(data[0].total_count / PAGE_SIZE));
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleJobAction = async (jobId: string, action: 'pause' | 'resume') => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: action === 'pause' ? 'paused' : 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      // Update local state
      setJobs(prev => prev.map(job => 
        job.id === jobId
          ? { ...job, status: action === 'pause' ? 'paused' : 'running' }
          : job
      ));
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'running':
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'paused':
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'running':
        return <Play className="w-4 h-4" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'paused':
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4">
      {/* Job List */}
      <div className="w-80 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="font-medium">Jobs</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No jobs found
            </div>
          ) : (
            <>
              <div className="divide-y">
                {jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 ${
                      selectedJob === job.id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-brand-600 h-1.5 rounded-full"
                              style={{
                                width: `${(job.completed_tasks / job.total_tasks) * 100}%`
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {job.completed_tasks} of {job.total_tasks} tasks completed
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {totalJobs > 1 && (
                <div className="p-4 border-t">
                  <Pagination
                    currentPage={jobsPage}
                    totalPages={totalJobs}
                    onPageChange={setJobsPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div className="flex-1 bg-white">
        {selectedJob ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">Tasks</h2>
                {jobs.find(j => j.id === selectedJob)?.status === 'running' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleJobAction(selectedJob, 'pause')}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Job
                  </Button>
                ) : jobs.find(j => j.id === selectedJob)?.status === 'paused' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleJobAction(selectedJob, 'resume')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Job
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg border p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {task.completed_at
                            ? `Completed ${formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}`
                            : `Created ${formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}`
                          }
                        </span>
                      </div>
                      {task.error_message && (
                        <p className="mt-2 text-sm text-red-600">
                          {task.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {totalTasks > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={tasksPage}
                    totalPages={totalTasks}
                    onPageChange={setTasksPage}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-medium">Activity Logs</h2>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="bg-white rounded-lg border p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                        <h3 className="font-medium">{log.action}</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{log.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {log.entity_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {totalLogs > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={logsPage}
                    totalPages={totalLogs}
                    onPageChange={setLogsPage}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}