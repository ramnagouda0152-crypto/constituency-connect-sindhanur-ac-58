import React, { useState, useEffect } from 'react';
import { getVillageName } from "../utils/villageName";import { CheckSquare, Plus, Calendar, Clock, User, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { getVillageName } from "../utils/villageName";import { Task, User as UserType, Village } from '../types.ts';
import { getVillageName } from "../utils/villageName";import { api } from '../services/api.ts';
import { getVillageName } from "../utils/villageName";import { Language, t } from '../translations.ts';
import { getVillageName } from "../utils/villageName";
interface TaskManagementProps {
  currentUser: UserType;
  villages: Village[];
  lang: Language;
}

export const TaskManagement: React.FC<TaskManagementProps> = ({ currentUser, villages, lang }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUser.name);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [villageId, setVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadTasks();
  }, [currentUser]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;
    setIsSubmitting(true);
    try {
      const targetVillage = isVillageHead ? (currentUser.village_id || 'V_GOR01') : villageId;
      await api.createTask({
        title,
        description,
        assigned_to: assignedTo,
        due_date: dueDate,
        priority,
        status: 'TODO',
        village_id: targetVillage
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      loadTasks();
    } catch (err: any) {
      alert(`Failed to create task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      loadTasks();
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`);
    }
  };

  const statuses: Task['status'][] = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('tasks', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Action items and field assignments for ${getVillageName(currentUser.village_id)}`
              : 'Constituency-wide task allocation and deadline tracking'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Assign New Task
        </button>
      </div>

      {/* Task Kanban / Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map(status => {
          const colTasks = tasks.filter(t => t.status === status);
          return (
            <div key={status} className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 flex flex-col space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{status}</span>
                <span className="text-[11px] font-bold bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {colTasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No tasks
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.task_id}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5 hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 leading-snug">{task.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          task.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2">{task.description}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="font-semibold text-slate-700">{task.assigned_to}</span>
                        <span className="font-mono text-slate-400">Due: {task.due_date}</span>
                      </div>

                      {/* Status quick select */}
                      <div className="flex items-center gap-1 pt-1">
                        {status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleStatusChange(task.task_id, 'COMPLETED')}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </button>
                        )}
                        {status === 'TODO' && (
                          <button
                            onClick={() => handleStatusChange(task.task_id, 'IN_PROGRESS')}
                            className="flex-1 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[10px] font-semibold transition-colors"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Assign Civic Task</h3>
            <p className="text-xs text-slate-500 mb-4">Assign field duty or follow-up action</p>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Inspect overhead tank valve replacement"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Instructions</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Details of required actions..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    required
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {!isVillageHead && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Village</label>
                    <select
                      value={villageId}
                      onChange={e => setVillageId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      {villages.map(v => (
                        <option key={v.village_id} value={v.village_id}>
                          {v.village_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

