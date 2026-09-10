import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  Search,
  Filter,
  MapPin,
  Building2,
  Phone,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Award,
  ArrowLeftRight,
  UserMinus,
  Lock,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../services/api.ts';
import { User, Village, GramPanchayat, UserRole, UserStatus } from '../types.ts';
import { Language, t } from '../translations.ts';

interface UserManagementProps {
  currentUser: User;
  villages: Village[];
  lang: Language;
  onRefreshData?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  villages,
  lang,
  onRefreshData
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [villageFilter, setVillageFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'members' | 'village_heads'>('pending');

  // Promotion / Reassignment Modal
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'reassign' | null>(null);
  const [targetVillageId, setTargetVillageId] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit User Modal state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    name_kannada: '',
    mobile: '',
    voter_id: '',
    role: 'MEMBER' as UserRole,
    village_id: '',
    status: 'ACTIVE' as UserStatus,
    email: '',
    address: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Delete User state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [statusFilter, roleFilter, villageFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers({
        status: statusFilter,
        role: roleFilter,
        village_id: villageFilter !== 'all' ? villageFilter : undefined,
        search: searchQuery || undefined
      });
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Actions
  const handleApprove = async (user: User) => {
    try {
      await api.approveUser(user.user_id);
      showNotification(`Approved voter registration for ${user.name}. Status is now ACTIVE.`);
      loadUsers();
      onRefreshData?.();
    } catch (err: any) {
      showNotification(err.message || 'Failed to approve voter', 'error');
    }
  };

  const handleReject = async (user: User) => {
    if (!confirm(`Are you sure you want to reject the voter application for ${user.name}?`)) return;
    try {
      await api.rejectUser(user.user_id);
      showNotification(`Rejected voter registration for ${user.name}.`);
      loadUsers();
      onRefreshData?.();
    } catch (err: any) {
      showNotification(err.message || 'Failed to reject voter', 'error');
    }
  };

  const handleDemote = async (user: User) => {
    if (!confirm(`Demote ${user.name} from Village Head back to MEMBER?`)) return;
    try {
      await api.demoteToMember(user.user_id);
      showNotification(`Demoted ${user.name} to MEMBER.`);
      loadUsers();
      onRefreshData?.();
    } catch (err: any) {
      showNotification(err.message || 'Failed to demote user', 'error');
    }
  };

  const handleOpenPromoteModal = (user: User) => {
    setActionUser(user);
    setActionType('promote');
    setTargetVillageId(user.village_id || (villages.length > 0 ? villages[0].village_id : ''));
  };

  const handleOpenReassignModal = (user: User) => {
    setActionUser(user);
    setActionType('reassign');
    setTargetVillageId(user.village_id || (villages.length > 0 ? villages[0].village_id : ''));
  };

  const handleExecuteVillageAssignment = async () => {
    if (!actionUser || !targetVillageId) return;
    setModalLoading(true);
    try {
      if (actionType === 'promote') {
        await api.promoteToVillageHead(actionUser.user_id, targetVillageId);
        const targetV = villages.find(v => v.village_id === targetVillageId);
        showNotification(`Promoted ${actionUser.name} to Village Head of ${targetV?.village_name || targetVillageId}.`);
      } else if (actionType === 'reassign') {
        await api.reassignVillageHead(actionUser.user_id, targetVillageId);
        const targetV = villages.find(v => v.village_id === targetVillageId);
        showNotification(`Reassigned Village Head ${actionUser.name} to ${targetV?.village_name || targetVillageId}.`);
      }
      setActionUser(null);
      setActionType(null);
      loadUsers();
      onRefreshData?.();
    } catch (err: any) {
      showNotification(err.message || 'Assignment failed', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setEditFormData({
      name: user.name || '',
      name_kannada: user.name_kannada || '',
      mobile: user.mobile || '',
      voter_id: user.voter_id || '',
      role: user.role,
      village_id: user.village_id || (villages.length > 0 ? villages[0].village_id : ''),
      status: user.status,
      email: user.email || '',
      address: user.address || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      await api.updateUserByAdmin(editUser.user_id, editFormData);
      showNotification(`User ${editFormData.name} details successfully updated.`);
      setEditUser(null);
      loadUsers();
      onRefreshData?.();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update user', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await api.deleteUser(userToDelete.user_id);
      showNotification(`Successfully removed ${userToDelete.role === 'VILLAGE_HEAD' ? 'Village Head' : 'member'} ${userToDelete.name}.`);
      setUserToDelete(null);
      loadUsers();
      onRefreshData?.();
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove user', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered lists for tabs
  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const activeMembers = users.filter(u => u.role === 'MEMBER' && u.status === 'ACTIVE');
  const villageHeads = users.filter(u => u.role === 'VILLAGE_HEAD');

  const displayedUsers = activeTab === 'pending'
    ? pendingUsers
    : activeTab === 'village_heads'
      ? villageHeads
      : users.filter(u => u.role === 'MEMBER');

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                User & Voter Administration
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sindhanur AC-58 Public Registration Approval, Role Governance & Village Head Assignments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div
            onClick={() => setActiveTab('pending')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Pending Approvals</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-700">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-900 mt-2">{pendingUsers.length}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Awaiting voter verification</p>
          </div>

          <div
            onClick={() => setActiveTab('members')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'members'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">Active Members</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-900 mt-2">{activeMembers.length}</p>
            <p className="text-[11px] text-blue-700 mt-0.5">Verified constituency voters</p>
          </div>

          <div
            onClick={() => setActiveTab('village_heads')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'village_heads'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Village Heads</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-700">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-2">{villageHeads.length}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Assigned to 1 village each</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Total Registered</span>
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{users.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across 124 villages</p>
          </div>
        </div>
      </div>

      {/* Notifications Toast */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {notificationMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{notificationMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Pending Approvals</span>
              {pendingUsers.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'pending' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900'
                }`}>
                  {pendingUsers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'members'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Constituency Members</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'members' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {activeMembers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('village_heads')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'village_heads'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Village Heads</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'village_heads' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {villageHeads.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, mobile, voter ID..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') loadUsers();
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* User Table / Cards */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            Loading registered voters...
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No members found</p>
            <p className="text-slate-400 mt-1">
              {activeTab === 'pending'
                ? 'There are currently no pending voter registrations awaiting approval.'
                : 'No members registered yet matching this criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Voter Name & Mobile</th>
                  <th className="py-3 px-4">Voter ID / EPIC</th>
                  <th className="py-3 px-4">Assigned Village</th>
                  <th className="py-3 px-4">Role & Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedUsers.map(u => {
                  const userVillage = villages.find(v => v.village_id === u.village_id);
                  const isPending = u.status === 'PENDING';
                  const isActive = u.status === 'ACTIVE';
                  const isVillageHead = u.role === 'VILLAGE_HEAD';

                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {u.mobile}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {u.voter_id || 'Not Provided'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {userVillage ? (
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-amber-600" />
                              {userVillage.village_name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              GP: {u.gp_id || userVillage.gp_id}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No village assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : u.role === 'VILLAGE_HEAD'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {u.role}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : u.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {u.status}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PENDING ACTIONS */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(u)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                                title="Approve voter registration"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(u)}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors border border-red-200 flex items-center gap-1"
                                title="Reject voter registration"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {/* ACTIVE MEMBER ACTIONS */}
                          {isActive && !isVillageHead && u.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleOpenPromoteModal(u)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Promote to Village Head"
                            >
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              Promote to Village Head
                            </button>
                          )}

                          {/* VILLAGE HEAD ACTIONS */}
                          {isVillageHead && (
                            <>
                              <button
                                onClick={() => handleOpenReassignModal(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Reassign to another village"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                Reassign Village
                              </button>
                              <button
                                onClick={() => handleDemote(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Demote back to Member"
                              >
                                <UserMinus className="w-3.5 h-3.5 text-slate-500" />
                                Demote
                              </button>
                            </>
                          )}

                          {/* Admin Edit Any User Details */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Edit User Details"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                            Edit
                          </button>

                          {/* Admin Remove Member or Village Head */}
                          {u.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title={`Remove ${u.role === 'VILLAGE_HEAD' ? 'Village Head' : 'Member'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion / Reassignment Modal */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    {actionType === 'promote' ? 'Promote to Village Head' : 'Reassign Village Jurisdiction'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Sindhanur AC-58 Governance</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActionUser(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-900">{actionUser.name}</p>
                <p className="text-slate-500 font-mono">Mobile: {actionUser.mobile}</p>
                <p className="text-slate-500 font-mono">Voter ID: {actionUser.voter_id || 'N/A'}</p>
                {actionUser.village_id && (
                  <p className="text-slate-600 font-medium">
                    Current Village: {villages.find(v => v.village_id === actionUser.village_id)?.village_name || actionUser.village_id}
                  </p>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-0.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Strict Single-Village Assignment Policy
                </p>
                A Village Head MUST be assigned to <strong>EXACTLY ONE</strong> village. They will have exclusive authorization to schedule video conferences and manage civic matters only within that village.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Village from Sindhanur AC-58 (124 Villages) *
                </label>
                <select
                  value={targetVillageId}
                  onChange={e => setTargetVillageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  {villages.map(v => (
                    <option key={v.village_id} value={v.village_id}>
                      {v.village_name} ({v.kannada_name}) — GP: {v.gp_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setActionUser(null);
                    setActionType(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteVillageAssignment}
                  disabled={modalLoading || !targetVillageId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {modalLoading ? 'Saving...' : actionType === 'promote' ? 'Confirm Promotion' : 'Confirm Reassignment'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold">Edit User Details</h3>
                  <p className="text-[11px] text-slate-400">Super Admin Administrative Control</p>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name in Kannada
                  </label>
                  <input
                    type="text"
                    value={editFormData.name_kannada}
                    onChange={e => setEditFormData({ ...editFormData, name_kannada: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.mobile}
                    onChange={e => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voter ID Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.voter_id}
                    onChange={e => setEditFormData({ ...editFormData, voter_id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={e => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="VILLAGE_HEAD">Village Head</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Village (Sindhanur AC-58)
                </label>
                <select
                  value={editFormData.village_id}
                  onChange={e => setEditFormData({ ...editFormData, village_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">No Village Assigned (Constituency Wide)</option>
                  {villages.map(v => (
                    <option key={v.village_id} value={v.village_id}>
                      {v.village_name} ({v.kannada_name}) — GP: {v.gp_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Delete / Remove Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-100" />
                <h3 className="text-sm font-bold">Confirm User Removal</h3>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-rose-100 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently remove{' '}
                <strong className="text-slate-900">{userToDelete.name}</strong>{' '}
                ({userToDelete.role === 'VILLAGE_HEAD' ? 'Village Head' : 'Member'}) from Sindhanur AC-58 Constituency Connect?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                This will revoke all permissions and delete the user account from the constituency system.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {deleteLoading ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
