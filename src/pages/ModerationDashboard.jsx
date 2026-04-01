import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Flag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Ban,
  Eye,
  Trash2,
  Filter,
} from 'lucide-react';

const ModerationDashboard = () => {
  const [reports] = useState([
    {
      id: 1,
      date: '2026-04-01T14:23:00Z',
      reporter: 'user_john123',
      reportedUser: 'toxic_user_88',
      category: 'csam',
      categoryLabel: 'Child Exploitation (CSAM)',
      details: 'Found disturbing content on user profile',
      status: 'pending',
      severity: 'critical',
    },
    {
      id: 2,
      date: '2026-04-01T12:15:00Z',
      reporter: 'user_sarah_92',
      reportedUser: 'spammer_bot_5',
      category: 'spam',
      categoryLabel: 'Spam',
      details: 'Sending repetitive promotional messages',
      status: 'pending',
      severity: 'low',
    },
    {
      id: 3,
      date: '2026-03-31T18:45:00Z',
      reporter: 'user_mike_lee',
      reportedUser: 'harassment_user_2',
      category: 'harassment',
      categoryLabel: 'Harassment',
      details: 'Threatening messages and targeted abuse',
      status: 'reviewed',
      severity: 'high',
    },
    {
      id: 4,
      date: '2026-03-31T10:20:00Z',
      reporter: 'user_anna_96',
      reportedUser: 'illegal_dealer_42',
      category: 'illegal',
      categoryLabel: 'Illegal Activity',
      details: 'Selling illegal substances',
      status: 'resolved',
      severity: 'high',
    },
    {
      id: 5,
      date: '2026-03-30T16:50:00Z',
      reporter: 'user_chris_45',
      reportedUser: 'scammer_404',
      category: 'other',
      categoryLabel: 'Other',
      details: 'Suspected fraud/scam activity',
      status: 'reviewed',
      severity: 'medium',
    },
    {
      id: 6,
      date: '2026-03-29T09:12:00Z',
      reporter: 'user_elena_73',
      reportedUser: 'csam_suspect_1',
      category: 'csam',
      categoryLabel: 'Child Exploitation (CSAM)',
      details: 'Multiple reports of CSAM material in messages',
      status: 'resolved',
      severity: 'critical',
    },
  ]);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const categoryMatch = categoryFilter === 'all' || report.category === categoryFilter;
      const statusMatch = statusFilter === 'all' || report.status === statusFilter;
      return categoryMatch && statusMatch;
    });
  }, [reports, categoryFilter, statusFilter]);

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    csam: reports.filter((r) => r.category === 'csam').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  const categories = [
    { id: 'csam', label: 'Child Exploitation (CSAM)', isCritical: true },
    { id: 'illegal', label: 'Illegal Activity', isCritical: false },
    { id: 'harassment', label: 'Harassment', isCritical: false },
    { id: 'spam', label: 'Spam', isCritical: false },
    { id: 'other', label: 'Other', isCritical: false },
  ];

  const statuses = [
    { id: 'pending', label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Clock },
    { id: 'reviewed', label: 'Reviewed', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Eye },
    { id: 'resolved', label: 'Resolved', color: 'text-phantom-green', bgColor: 'bg-green-50', icon: CheckCircle },
  ];

  const getCategoryColor = (category) => {
    if (category === 'csam') return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
    if (category === 'illegal') return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
    if (category === 'harassment') return { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' };
    if (category === 'spam') return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
    return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'text-red-600';
    if (severity === 'high') return 'text-orange-600';
    if (severity === 'medium') return 'text-yellow-600';
    return 'text-yellow-500';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status) => {
    const statusInfo = statuses.find((s) => s.id === status);
    if (!statusInfo) return null;
    const IconComponent = statusInfo.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
        <IconComponent className="w-3 h-3" />
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-phantom-gray-50">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-phantom-charcoal border-opacity-10 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-phantom-green rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-phantom-charcoal">Moderation Dashboard</h1>
                <p className="text-sm text-phantom-charcoal text-opacity-60 mt-1">
                  Phantom Messenger Safety & Trust
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-phantom-charcoal text-opacity-70">Last updated</p>
              <p className="font-semibold text-phantom-charcoal">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-phantom-charcoal text-opacity-70">Total Reports</h3>
              <Flag className="w-5 h-5 text-phantom-green" />
            </div>
            <p className="text-3xl font-bold text-phantom-charcoal">{stats.total}</p>
            <p className="text-xs text-phantom-charcoal text-opacity-50 mt-2">All time</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-phantom-charcoal text-opacity-70">Pending Review</h3>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-phantom-charcoal">{stats.pending}</p>
            <p className="text-xs text-yellow-600 font-semibold mt-2">Requires immediate attention</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 bg-red-50 border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-red-900">CSAM Reports</h3>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-700">{stats.csam}</p>
            <p className="text-xs text-red-700 font-semibold mt-2">CRITICAL - Law enforcement notified</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-phantom-charcoal text-opacity-70">Resolved</h3>
              <CheckCircle className="w-5 h-5 text-phantom-green" />
            </div>
            <p className="text-3xl font-bold text-phantom-charcoal">{stats.resolved}</p>
            <p className="text-xs text-phantom-charcoal text-opacity-50 mt-2">Action taken</p>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6 bg-white mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-phantom-green" />
            <h3 className="font-semibold text-phantom-charcoal">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-phantom-charcoal mb-3">Category</label>
              <div className="space-y-2">
                <button onClick={() => setCategoryFilter('all')} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${categoryFilter === 'all' ? 'bg-phantom-green text-white' : 'bg-phantom-gray-100 text-phantom-charcoal hover:bg-phantom-gray-200'}`}>All Categories</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setCategoryFilter(cat.id)} className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${categoryFilter === cat.id ? cat.isCritical ? 'bg-red-100 text-red-700 font-semibold' : 'bg-phantom-green text-white' : 'bg-phantom-gray-100 text-phantom-charcoal hover:bg-phantom-gray-200'}`}>
                    {cat.isCritical && categoryFilter === cat.id && <AlertTriangle className="w-4 h-4" />}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-phantom-charcoal mb-3">Status</label>
              <div className="space-y-2">
                <button onClick={() => setStatusFilter('all')} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-phantom-green text-white' : 'bg-phantom-gray-100 text-phantom-charcoal hover:bg-phantom-gray-200'}`}>All Statuses</button>
                {statuses.map((status) => (
                  <button key={status.id} onClick={() => setStatusFilter(status.id)} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${statusFilter === status.id ? 'bg-phantom-green text-white' : 'bg-phantom-gray-100 text-phantom-charcoal hover:bg-phantom-gray-200'}`}>{status.label}</button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card bg-white overflow-hidden">
          <div className="p-6 border-b border-phantom-charcoal border-opacity-10">
            <h3 className="font-semibold text-phantom-charcoal">Reports ({filteredReports.length})</h3>
          </div>
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <Flag className="w-12 h-12 text-phantom-charcoal text-opacity-20 mx-auto mb-4" />
              <p className="text-phantom-charcoal text-opacity-60">No reports match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-phantom-gray-50 border-b border-phantom-charcoal border-opacity-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-phantom-charcoal text-opacity-70">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-phantom-charcoal text-opacity-70">Reporter</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-phantom-charcoal text-opacity-70">Reported User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-phantom-charcoal text-opacity-70">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-phantom-charcoal text-opacity-70">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-phantom-charcoal text-opacity-70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report, index) => {
                    const colors = getCategoryColor(report.category);
                    return (
                      <motion.tr key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className={`border-b border-phantom-charcoal border-opacity-10 hover:bg-phantom-gray-50 transition-colors ${report.category === 'csam' ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 text-sm text-phantom-charcoal">{formatDate(report.date)}</td>
                        <td className="px-6 py-4 text-sm"><span className="font-medium text-phantom-charcoal">{report.reporter}</span></td>
                        <td className="px-6 py-4 text-sm">
                          <span className="font-medium text-phantom-charcoal">{report.reportedUser}</span>
                          {report.category === 'csam' && <AlertTriangle className={`inline-block w-4 h-4 ml-2 ${getSeverityColor('critical')}`} />}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {report.categoryLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600" title="Review report"><Eye className="w-4 h-4" /></button>
                            <button className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600" title="Ban user"><Ban className="w-4 h-4" /></button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="Dismiss"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <Shield className="inline w-4 h-4 mr-2" />
            CSAM reports are automatically escalated to specialized law enforcement authorities. All moderation actions are logged for legal compliance.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ModerationDashboard;
