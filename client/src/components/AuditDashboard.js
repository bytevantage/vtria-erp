import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const AuditDashboard = () => {
    const [auditData, setAuditData] = useState({
        activity_counts: [],
        scope_summary: [],
        pending_approvals: 0,
        top_users: []
    });
    const [highValueChanges, setHighValueChanges] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [selectedCase, setSelectedCase] = useState('');
    const [caseAuditTrail, setCaseAuditTrail] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [days, setDays] = useState(7);

    useEffect(() => {
        fetchAuditDashboard();
        fetchHighValueChanges();
        fetchPendingApprovals();
    }, [days]);

    const fetchAuditDashboard = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/audit/dashboard?days=${days}`);
            if (response.data.success) {
                setAuditData(response.data.data);
            }
        } catch (error) {
            setError('Error fetching audit dashboard: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchHighValueChanges = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/audit/high-value-changes?days=${days}&threshold=50000`);
            if (response.data.success) {
                setHighValueChanges(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching high value changes:', error);
        }
    };

    const fetchPendingApprovals = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/audit/pending-approvals`);
            if (response.data.success) {
                setPendingApprovals(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
        }
    };

    const fetchCaseAuditTrail = async (caseId) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/audit/case/${caseId}`);
            if (response.data.success) {
                setCaseAuditTrail(response.data.data);
            }
        } catch (error) {
            setError('Error fetching case audit trail: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (auditId, action, notes) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/audit/approve/${auditId}`, {
                action,
                notes
            });
            if (response.data.success) {
                alert(`Successfully ${action}ed the request`);
                fetchPendingApprovals(); // Refresh pending approvals
                fetchAuditDashboard(); // Refresh dashboard
            }
        } catch (error) {
            alert('Error processing approval: ' + (error.response?.data?.message || error.message));
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN');
    };

    const getActionBadgeColor = (action) => {
        const colors = {
            CREATE: 'bg-green-100 text-green-800',
            UPDATE: 'bg-blue-100 text-blue-800',
            DELETE: 'bg-red-100 text-red-800',
            APPROVE: 'bg-purple-100 text-purple-800',
            REJECT: 'bg-orange-100 text-orange-800'
        };
        return colors[action] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Dashboard</h1>
                    <p className="text-gray-600">Comprehensive tracking of system changes and approvals</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="text-red-800">{error}</div>
                    </div>
                )}

                {/* Dashboard Controls */}
                <div className="mb-6 bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-gray-700">Time Period:</label>
                        <select 
                            value={days} 
                            onChange={(e) => setDays(parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        >
                            <option value={1}>Last 24 hours</option>
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        <button 
                            onClick={fetchAuditDashboard}
                            className="bg-blue-600 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-700"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {auditData.activity_counts.reduce((sum, item) => sum + item.count, 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total Activities</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-2xl font-bold text-orange-600">{auditData.pending_approvals}</div>
                        <div className="text-sm text-gray-600">Pending Approvals</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-2xl font-bold text-green-600">{highValueChanges.length}</div>
                        <div className="text-sm text-gray-600">High Value Changes</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-2xl font-bold text-purple-600">{auditData.top_users.length}</div>
                        <div className="text-sm text-gray-600">Active Users</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pending Approvals */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
                        </div>
                        <div className="p-6">
                            {pendingApprovals.length === 0 ? (
                                <p className="text-gray-500">No pending approvals</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingApprovals.map((approval) => (
                                        <div key={approval.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(approval.action)}`}>
                                                        {approval.action}
                                                    </span>
                                                    <span className="ml-2 font-medium">{approval.table_name}</span>
                                                    <span className="ml-2 text-gray-500">#{approval.record_id}</span>
                                                </div>
                                                {approval.value_difference && (
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-orange-600">
                                                            {formatCurrency(Math.abs(approval.value_difference))}
                                                        </div>
                                                        <div className="text-xs text-gray-500">Value Change</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600 mb-2">
                                                <div><strong>Case:</strong> {approval.case_number || 'N/A'}</div>
                                                <div><strong>Requested by:</strong> {approval.requested_by}</div>
                                                <div><strong>Date:</strong> {formatDate(approval.created_at)}</div>
                                                {approval.business_reason && (
                                                    <div><strong>Reason:</strong> {approval.business_reason}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const notes = prompt('Approval notes (optional):');
                                                        if (notes !== null) {
                                                            handleApproval(approval.id, 'approve', notes);
                                                        }
                                                    }}
                                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const notes = prompt('Rejection reason:');
                                                        if (notes !== null && notes.trim() !== '') {
                                                            handleApproval(approval.id, 'reject', notes);
                                                        }
                                                    }}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* High Value Changes */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">High Value Changes</h2>
                        </div>
                        <div className="p-6">
                            {highValueChanges.length === 0 ? (
                                <p className="text-gray-500">No high value changes in the selected period</p>
                            ) : (
                                <div className="space-y-4">
                                    {highValueChanges.slice(0, 5).map((change) => (
                                        <div key={change.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-medium">{change.entity_type}</span>
                                                    <span className="ml-2 text-gray-500">{change.entity_number}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${change.value_difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {change.value_difference > 0 ? '+' : ''}{formatCurrency(change.value_difference)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {change.percentage_change ? `${change.percentage_change.toFixed(1)}%` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <div><strong>Case:</strong> {change.case_number}</div>
                                                <div><strong>Client:</strong> {change.client_name}</div>
                                                <div><strong>Date:</strong> {formatDate(change.created_at)}</div>
                                                <div><strong>Status:</strong> 
                                                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                                        change.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        change.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {change.approval_status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Case Audit Trail Lookup */}
                <div className="mt-8 bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Case Audit Trail Lookup</h2>
                    </div>
                    <div className="p-6">
                        <div className="flex gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Enter Case ID (e.g., 15)"
                                value={selectedCase}
                                onChange={(e) => setSelectedCase(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 flex-1"
                            />
                            <button
                                onClick={() => selectedCase && fetchCaseAuditTrail(selectedCase)}
                                disabled={!selectedCase || loading}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {loading ? 'Loading...' : 'Search'}
                            </button>
                        </div>

                        {caseAuditTrail.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-900">Audit Trail for Case {selectedCase}</h3>
                                {caseAuditTrail.map((entry) => (
                                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(entry.action)}`}>
                                                    {entry.action}
                                                </span>
                                                <span className="font-medium">{entry.table_name}</span>
                                                <span className="text-gray-500">#{entry.record_id}</span>
                                            </div>
                                            <div className="text-sm text-gray-500">{formatDate(entry.created_at)}</div>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <div><strong>User:</strong> {entry.user_name || 'System'}</div>
                                            {entry.business_reason && (
                                                <div><strong>Reason:</strong> {entry.business_reason}</div>
                                            )}
                                            {entry.changed_fields && entry.changed_fields.length > 0 && (
                                                <div><strong>Changed Fields:</strong> {entry.changed_fields.join(', ')}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditDashboard;