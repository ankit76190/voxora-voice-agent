"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { DEMO_CONTACTS } from "@/lib/mock-data";
import {
  Contact,
  ConsentStatus,
  DemoQueueItem,
  PersistedCallSession,
} from "@/types";
import {
  fetchContactList,
  fetchContactDetail,
  createContact,
  updateContact,
  deleteContact,
} from "@/lib/conversation-api";
import {
  Users,
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  Mail,
  Phone,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Layers,
  PhoneCall,
  Clock,
  History,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";

export default function ContactsPage() {
  // Data state
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS);
  const [totalContacts, setTotalContacts] = useState(DEMO_CONTACTS.length);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [consentFilter, setConsentFilter] = useState<string>("ALL");

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [detailCalls, setDetailCalls] = useState<PersistedCallSession[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Demo Calling Queue State
  const [queue, setQueue] = useState<DemoQueueItem[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
    status: "Prospect" as "Active" | "Prospect" | "Inactive",
    consent_status: "PENDING_VERIFICATION" as ConsentStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load contacts from backend or fallback to demo data
  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchContactList({
        page,
        pageSize,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });

      if (res && Array.isArray(res.items)) {
        setContacts(res.items);
        setTotalContacts(res.total);
        setTotalPages(res.total_pages || 1);
        setBackendConnected(true);
      } else {
        // Fallback to local mock data
        setBackendConnected(false);
        let list = [...DEMO_CONTACTS];
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          list = list.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.phone.includes(q) ||
              (c.email && c.email.toLowerCase().includes(q)) ||
              (c.company && c.company.toLowerCase().includes(q))
          );
        }
        if (statusFilter !== "ALL") {
          list = list.filter((c) => c.status === statusFilter);
        }
        setContacts(list);
        setTotalContacts(list.length);
        setTotalPages(Math.max(1, Math.ceil(list.length / pageSize)));
      }
    } catch {
      setBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Client-side consent filter if applicable
  const displayedContacts = useMemo(() => {
    if (consentFilter === "ALL") return contacts;
    return contacts.filter(
      (c) => (c.consent_status || "PENDING_VERIFICATION") === consentFilter
    );
  }, [contacts, consentFilter]);

  // Phone validator helper
  const validatePhone = (num: string): { valid: boolean; error?: string } => {
    const digits = num.replace(/\D/g, "");
    if (digits.length < 7) {
      return { valid: false, error: "Must contain at least 7 digits." };
    }
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(num)) {
      return { valid: false, error: "Invalid telephone formatting." };
    }
    return { valid: true };
  };

  // Email validator helper
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Full name is required.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else {
      const pCheck = validatePhone(formData.phone.trim());
      if (!pCheck.valid) {
        errors.phone = pCheck.error || "Invalid phone number.";
      }
    }

    if (formData.email.trim() && !validateEmail(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      company: "",
      notes: "",
      status: "Prospect",
      consent_status: "PENDING_VERIFICATION",
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (c: Contact) => {
    setEditingContact(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      company: c.company || "",
      notes: c.notes || "",
      status: c.status,
      consent_status: c.consent_status || "PENDING_VERIFICATION",
    });
    setFormErrors({});
  };

  // Handle Create Contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
        consent_status: formData.consent_status,
      };

      const created = await createContact(payload);
      if (created) {
        showNotification("success", `Contact "${created.name}" created successfully.`);
      } else {
        // Fallback for offline mode
        const localNew: Contact = {
          id: `cnt-${Date.now()}`,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          company: payload.company,
          notes: payload.notes,
          status: payload.status,
          consent_status: payload.consent_status,
          created_at: new Date().toISOString(),
          call_count: 0,
        };
        setContacts((prev) => [localNew, ...prev]);
        setTotalContacts((prev) => prev + 1);
        showNotification(
          "info",
          `Contact "${localNew.name}" added to local memory (backend unreachable).`
        );
      }
      setIsAddModalOpen(false);
      loadContacts();
    } catch (err: unknown) {
      showNotification("error", `Failed to create contact: ${String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Contact
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
        consent_status: formData.consent_status,
      };

      const updated = await updateContact(editingContact.id, payload);
      if (updated) {
        showNotification("success", `Contact "${updated.name}" updated successfully.`);
      } else {
        // Fallback
        setContacts((prev) =>
          prev.map((c) =>
            c.id === editingContact.id ? { ...c, ...payload } : c
          )
        );
        showNotification("info", `Contact "${formData.name}" updated in local state.`);
      }

      // Update queue item if queued
      setQueue((prev) =>
        prev.map((item) => {
          if (item.contactId === editingContact.id) {
            const pCheck = validatePhone(formData.phone.trim());
            return {
              ...item,
              name: formData.name.trim(),
              phone: formData.phone.trim(),
              company: formData.company.trim() || undefined,
              consentStatus: formData.consent_status,
              isValid: pCheck.valid,
              validationError: pCheck.error,
            };
          }
          return item;
        })
      );

      setEditingContact(null);
      loadContacts();
    } catch (err: unknown) {
      showNotification("error", `Failed to update contact: ${String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Safe Delete Contact
  const handleDeleteContact = async () => {
    if (!deletingContact) return;

    setIsSubmitting(true);
    try {
      const ok = await deleteContact(deletingContact.id);
      if (ok) {
        showNotification(
          "success",
          `Contact "${deletingContact.name}" deleted. Linked call records are safely preserved.`
        );
      } else {
        // Fallback
        setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
        setTotalContacts((prev) => Math.max(0, prev - 1));
        showNotification(
          "info",
          `Contact removed from local directory. Call records preserved.`
        );
      }

      // Remove from queue if present
      setQueue((prev) =>
        prev.filter((item) => item.contactId !== deletingContact.id)
      );

      setDeletingContact(null);
      if (viewingContact?.id === deletingContact.id) {
        setViewingContact(null);
      }
      loadContacts();
    } catch (err: unknown) {
      showNotification("error", `Failed to delete contact: ${String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle View Contact Detail & Fetch Linked Calls
  const handleViewContact = async (contact: Contact) => {
    setViewingContact(contact);
    setDetailCalls([]);
    setIsDetailLoading(true);
    try {
      const detail = await fetchContactDetail(contact.id);
      if (detail) {
        setViewingContact(detail);
        setDetailCalls(detail.calls || []);
      }
    } catch {
      // Keep basic info
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Demo Queue Management
  const isQueued = (contactId: string) =>
    queue.some((item) => item.contactId === contactId);

  const toggleQueueContact = (contact: Contact) => {
    if (isQueued(contact.id)) {
      setQueue((prev) => prev.filter((item) => item.contactId !== contact.id));
      showNotification("info", `Removed "${contact.name}" from calling queue.`);
    } else {
      const pCheck = validatePhone(contact.phone);
      const newItem: DemoQueueItem = {
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        company: contact.company,
        consentStatus: contact.consent_status || "PENDING_VERIFICATION",
        isValid: pCheck.valid,
        validationError: pCheck.error,
      };
      setQueue((prev) => [...prev, newItem]);
      showNotification(
        "success",
        `Queued "${contact.name}" for preparation inspection.`
      );
    }
  };

  const removeFromQueue = (contactId: string) => {
    setQueue((prev) => prev.filter((item) => item.contactId !== contactId));
  };

  const clearQueue = () => {
    setQueue([]);
    showNotification("info", "Demo preparation calling queue cleared.");
  };

  // Consent Status Badge Component
  const renderConsentBadge = (status?: ConsentStatus | string) => {
    const s = status || "PENDING_VERIFICATION";
    switch (s) {
      case "CONSENT_CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-sage/10 text-sage border border-sage/30">
            <ShieldCheck className="w-3 h-3 text-sage" />
            <span>Confirmed</span>
          </span>
        );
      case "CONSENT_REVOKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-rose-950/40 text-rose-300 border border-rose-900/60">
            <ShieldAlert className="w-3 h-3 text-rose-300" />
            <span>Revoked</span>
          </span>
        );
      case "PENDING_VERIFICATION":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-champagne/10 text-champagne border border-champagne/30">
            <Shield className="w-3 h-3 text-champagne" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <AppShell title="Contact & Dispatch Directory">
      {/* Enterprise Phase 6 Notice */}
      <DemoBanner message="PHASE 6: CONTACT MANAGEMENT & CALLING PREPARATION — Full CRUD persistence, calling consent tracking, and safe call-history retention. Real outbound telephony triggers are intentionally decoupled." />

      {/* Backend Status indicator & Queue Quick Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-ivory-muted">
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnected === true
                ? "bg-sage animate-pulse"
                : backendConnected === false
                ? "bg-champagne"
                : "bg-charcoal-border"
            }`}
          />
          <span>
            {backendConnected === true
              ? "Backend API Connected (/api/v1/contacts)"
              : backendConnected === false
              ? "Offline Mode — Running with cached memory directory"
              : "Connecting to API..."}
          </span>
        </div>

        {queue.length > 0 && (
          <button
            onClick={() => setIsQueueOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded bg-champagne/10 border border-champagne/40 text-champagne hover:bg-champagne/20 transition-colors self-start sm:self-auto"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Demo Calling Queue ({queue.length})</span>
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg text-xs font-medium border animate-fadeIn ${
            notification.type === "success"
              ? "bg-sage/10 border-sage/40 text-sage"
              : notification.type === "error"
              ? "bg-rose-950/40 border-rose-900/60 text-rose-300"
              : "bg-charcoal-200 border-charcoal-border text-ivory"
          }`}
          role="alert"
        >
          <div className="flex items-center space-x-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-semibold text-ivory">
              Managed Enterprise Contacts
            </h2>
            <p className="text-xs text-ivory-muted">
              Directory of authorized individuals with consent auditing and safe call preservation.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <button
              onClick={() => loadContacts()}
              disabled={isLoading}
              className="p-2 rounded border border-charcoal-border text-ivory-muted hover:text-ivory hover:border-champagne/40 transition-colors"
              title="Refresh Directory"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-champagne text-charcoal hover:bg-champagne-light transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-champagne"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* Search Bar */}
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 text-ivory-muted absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, company, email, or telephone number..."
              className="w-full pl-9 pr-8 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-ivory-muted hover:text-ivory"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors font-mono"
            >
              <option value="ALL">Status: All</option>
              <option value="Active">Status: Active</option>
              <option value="Prospect">Status: Prospect</option>
              <option value="Inactive">Status: Inactive</option>
            </select>
          </div>

          {/* Consent Status Filter */}
          <div className="md:col-span-3">
            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors font-mono"
            >
              <option value="ALL">Consent: All</option>
              <option value="CONSENT_CONFIRMED">Consent: Confirmed</option>
              <option value="PENDING_VERIFICATION">Consent: Pending</option>
              <option value="CONSENT_REVOKED">Consent: Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Table View */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg overflow-hidden shadow-sm">
        {displayedContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal-border bg-charcoal-300/40 text-ivory-muted font-mono uppercase text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">Queue</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Telephone</th>
                  <th className="py-3 px-4">Consent Status</th>
                  <th className="py-3 px-4">Lifecycle</th>
                  <th className="py-3 px-4 text-center">Calls</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-border">
                {displayedContacts.map((contact) => {
                  const queued = isQueued(contact.id);
                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-charcoal-300/60 transition-colors ${
                        queued ? "bg-champagne/5" : ""
                      }`}
                    >
                      {/* Queue Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleQueueContact(contact)}
                          className="text-ivory-muted hover:text-champagne transition-colors"
                          title={
                            queued
                              ? "Remove from preparation queue"
                              : "Add to preparation queue"
                          }
                        >
                          {queued ? (
                            <CheckSquare className="w-4 h-4 text-champagne" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-ivory flex items-center space-x-2">
                          <button
                            onClick={() => handleViewContact(contact)}
                            className="hover:underline hover:text-champagne transition-colors text-left"
                          >
                            {contact.name}
                          </button>
                        </div>
                        {contact.email && (
                          <div className="text-[11px] text-ivory-muted flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-ivory-muted" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        {contact.company ? (
                          <div className="text-ivory font-medium flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-champagne" />
                            <span>{contact.company}</span>
                          </div>
                        ) : (
                          <span className="text-ivory-muted">—</span>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4 font-mono text-ivory-muted">
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 text-champagne/70" />
                          <span>{contact.phone}</span>
                        </div>
                      </td>

                      {/* Consent Status */}
                      <td className="py-3.5 px-4">
                        {renderConsentBadge(contact.consent_status)}
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={contact.status} />
                      </td>

                      {/* Call Count */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <button
                          onClick={() => handleViewContact(contact)}
                          className="px-2 py-0.5 rounded bg-charcoal-300 text-ivory-muted hover:text-ivory border border-charcoal-border hover:border-champagne/40 transition-colors text-[11px]"
                          title="View linked call sessions"
                        >
                          {contact.call_count !== undefined
                            ? contact.call_count
                            : (contact.calls?.length || 0)} calls
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewContact(contact)}
                            className="p-1.5 text-ivory-muted hover:text-ivory rounded hover:bg-charcoal-300 transition-colors"
                            title="View Contact & Call History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1.5 text-ivory-muted hover:text-champagne rounded hover:bg-charcoal-300 transition-colors"
                            title="Edit Contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingContact(contact)}
                            className="p-1.5 text-ivory-muted hover:text-rose-400 rounded hover:bg-charcoal-300 transition-colors"
                            title="Delete Contact (Preserves Call History)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-charcoal-300 border border-charcoal-border flex items-center justify-center text-ivory-muted">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-ivory">
              No contacts match your query
            </h3>
            <p className="text-xs text-ivory-muted max-w-sm mx-auto">
              No contacts found for &ldquo;{searchTerm}&rdquo; with the current filter settings.
            </p>
          </div>
        )}

        {/* Pagination & Summary Bar */}
        <div className="p-4 border-t border-charcoal-border bg-charcoal-300/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ivory-muted font-mono">
          <div>
            Showing {displayedContacts.length} of {totalContacts} registered contacts
            {queue.length > 0 && ` (${queue.length} queued)`}
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-charcoal-border hover:bg-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-charcoal-border hover:bg-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-charcoal-200 border border-charcoal-border rounded-lg max-w-lg w-full p-6 space-y-5 shadow-2xl text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div>
                <h3 className="text-base font-serif font-semibold text-ivory">
                  Create Contact Record
                </h3>
                <p className="text-xs text-ivory-muted">
                  Add an authorized contact with explicit consent status tracking.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-ivory-muted hover:text-ivory rounded"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Dr. Aris Thorne"
                  className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-xs text-ivory focus:outline-none transition-colors ${
                    formErrors.name
                      ? "border-rose-800"
                      : "border-charcoal-border focus:border-champagne"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-400 mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 234-5678"
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-xs text-ivory font-mono focus:outline-none transition-colors ${
                      formErrors.phone
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="aris@example.com"
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-xs text-ivory focus:outline-none transition-colors ${
                      formErrors.email
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    placeholder="e.g. Apex Biometrics"
                    className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "Active" | "Prospect" | "Inactive",
                      })
                    }
                    className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors font-mono"
                  >
                    <option value="Prospect">Prospect</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Calling Consent Status */}
              <div>
                <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                  Calling Consent Audit Status *
                </label>
                <select
                  value={formData.consent_status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      consent_status: e.target.value as ConsentStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors font-mono"
                >
                  <option value="PENDING_VERIFICATION">
                    PENDING VERIFICATION (Default — requires authorization)
                  </option>
                  <option value="CONSENT_CONFIRMED">
                    CONSENT CONFIRMED (Explicit opt-in documented)
                  </option>
                  <option value="CONSENT_REVOKED">
                    CONSENT REVOKED (Do not place calls)
                  </option>
                </select>
                <p className="text-[11px] text-ivory-muted mt-1">
                  Enterprise compliance rule: contacts are never assumed consented by default.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                  Notes & Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Special instructions, calling preferences, or timezone notes..."
                  className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
                />
              </div>

              <div className="pt-3 border-t border-charcoal-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded text-xs text-ivory-muted hover:text-ivory border border-charcoal-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-champagne text-charcoal hover:bg-champagne-light disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Creating..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingContact(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-charcoal-200 border border-charcoal-border rounded-lg max-w-lg w-full p-6 space-y-5 shadow-2xl text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div>
                <h3 className="text-base font-serif font-semibold text-ivory">
                  Edit Contact Profile
                </h3>
                <p className="text-xs text-ivory-muted">
                  Update details for {editingContact.name}.
                </p>
              </div>
              <button
                onClick={() => setEditingContact(null)}
                className="p-1 text-ivory-muted hover:text-ivory rounded"
                aria-label="Close edit modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-xs text-ivory focus:outline-none transition-colors ${
                    formErrors.name
                      ? "border-rose-800"
                      : "border-charcoal-border focus:border-champagne"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-400 mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-xs text-ivory font-mono focus:outline-none transition-colors ${
                      formErrors.phone
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-xs text-ivory focus:outline-none transition-colors ${
                      formErrors.email
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "Active" | "Prospect" | "Inactive",
                      })
                    }
                    className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors font-mono"
                  >
                    <option value="Active">Active</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Consent Status */}
              <div>
                <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                  Calling Consent Audit Status
                </label>
                <select
                  value={formData.consent_status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      consent_status: e.target.value as ConsentStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors font-mono"
                >
                  <option value="PENDING_VERIFICATION">
                    PENDING VERIFICATION (Requires authorization)
                  </option>
                  <option value="CONSENT_CONFIRMED">
                    CONSENT CONFIRMED (Explicit opt-in documented)
                  </option>
                  <option value="CONSENT_REVOKED">
                    CONSENT REVOKED (Do not place calls)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
                />
              </div>

              <div className="pt-3 border-t border-charcoal-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="px-4 py-2 rounded text-xs text-ivory-muted hover:text-ivory border border-charcoal-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-champagne text-charcoal hover:bg-champagne-light disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Safe Historical Call Retention) */}
      {deletingContact && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setDeletingContact(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-charcoal-200 border border-rose-900/40 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-9 h-9 rounded-full bg-rose-950/60 border border-rose-900/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-ivory">
                  Delete Contact
                </h3>
                <p className="text-xs text-ivory-muted">Safe call retention policy active.</p>
              </div>
            </div>

            <p className="text-xs text-ivory leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-champagne">{deletingContact.name}</span>?
            </p>

            <div className="p-3 rounded bg-charcoal-300/80 border border-charcoal-border text-[11px] text-ivory-muted space-y-1">
              <div className="flex items-center space-x-1.5 text-sage font-mono uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Call Preservation Guarantee</span>
              </div>
              <p>
                Historical call transcripts, durations, and audio logs will NOT be deleted. They will remain securely archived in the Call Management log with unlinked attribution.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeletingContact(null)}
                className="px-4 py-2 rounded text-xs text-ivory-muted hover:text-ivory border border-charcoal-border"
              >
                Keep Contact
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                disabled={isSubmitting}
                className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-rose-900 text-rose-100 hover:bg-rose-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Deleting..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Drawer */}
      {viewingContact && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex justify-end backdrop-blur-xs"
          onClick={() => setViewingContact(null)}
        >
          <div
            className="w-full max-w-xl bg-charcoal-200 border-l border-charcoal-border h-full flex flex-col shadow-2xl animate-slideLeft text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-charcoal-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ivory-muted">
                  Contact Dossier
                </span>
                <h3 className="text-lg font-serif font-semibold text-ivory">
                  {viewingContact.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingContact(null)}
                className="p-1.5 text-ivory-muted hover:text-ivory rounded"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Profile Card */}
              <div className="bg-charcoal-300/60 border border-charcoal-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-ivory-muted">
                    Profile Information
                  </span>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={viewingContact.status} />
                    {renderConsentBadge(viewingContact.consent_status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[11px] text-ivory-muted block">Telephone</span>
                    <span className="font-mono text-champagne font-medium">
                      {viewingContact.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-ivory-muted block">Email</span>
                    <span className="text-ivory">
                      {viewingContact.email || "No email listed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-ivory-muted block">Company</span>
                    <span className="text-ivory">
                      {viewingContact.company || "Independent"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-ivory-muted block">ID</span>
                    <span className="font-mono text-[11px] text-ivory-muted truncate block">
                      {viewingContact.id}
                    </span>
                  </div>
                </div>

                {viewingContact.notes && (
                  <div className="pt-2 border-t border-charcoal-border text-xs">
                    <span className="text-[11px] text-ivory-muted block mb-0.5">
                      Operator Notes
                    </span>
                    <p className="text-ivory-muted leading-relaxed">
                      {viewingContact.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Historical Calls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-champagne" />
                    <h4 className="text-xs font-mono uppercase tracking-wider text-ivory">
                      Linked Call Sessions ({detailCalls.length})
                    </h4>
                  </div>
                  {isDetailLoading && (
                    <RefreshCw className="w-3.5 h-3.5 text-champagne animate-spin" />
                  )}
                </div>

                {detailCalls.length > 0 ? (
                  <div className="space-y-2">
                    {detailCalls.map((call) => (
                      <div
                        key={call.id}
                        className="p-3 rounded-lg bg-charcoal-300/50 border border-charcoal-border space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-champagne">
                            {call.id.slice(0, 8)}...
                          </span>
                          <StatusBadge status={call.status} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-ivory-muted font-mono">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-ivory-muted" />
                            <span>{call.duration_seconds}s</span>
                          </span>
                          <span>
                            {call.started_at
                              ? new Date(call.started_at).toLocaleString()
                              : "Recent"}
                          </span>
                        </div>

                        {call.summary && (
                          <p className="text-[11px] text-ivory-muted italic border-l-2 border-champagne/40 pl-2">
                            &ldquo;{call.summary}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-charcoal-300/30 border border-charcoal-border text-center text-xs text-ivory-muted">
                    No historical calls recorded for this contact yet.
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-charcoal-border flex items-center justify-between bg-charcoal-300/30">
              <button
                onClick={() => {
                  toggleQueueContact(viewingContact);
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors ${
                  isQueued(viewingContact.id)
                    ? "bg-rose-950/40 text-rose-300 border border-rose-900/50"
                    : "bg-champagne/10 text-champagne border border-champagne/40 hover:bg-champagne/20"
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>
                  {isQueued(viewingContact.id)
                    ? "Remove from Queue"
                    : "Add to Queue"}
                </span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const c = viewingContact;
                    setViewingContact(null);
                    openEditModal(c);
                  }}
                  className="px-3 py-1.5 rounded text-xs border border-charcoal-border hover:bg-charcoal-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    const c = viewingContact;
                    setViewingContact(null);
                    setDeletingContact(c);
                  }}
                  className="px-3 py-1.5 rounded text-xs border border-rose-900/40 text-rose-300 hover:bg-rose-950/40 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Calling Queue Drawer / Panel */}
      {isQueueOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex justify-end backdrop-blur-xs"
          onClick={() => setIsQueueOpen(false)}
        >
          <div
            className="w-full max-w-md bg-charcoal-200 border-l border-charcoal-border h-full flex flex-col shadow-2xl animate-slideLeft text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-charcoal-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-champagne" />
                <div>
                  <h3 className="text-base font-serif font-semibold text-ivory">
                    Demo Calling Queue
                  </h3>
                  <p className="text-[11px] font-mono text-ivory-muted">
                    {queue.length} contacts selected for preparation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-1 text-ivory-muted hover:text-ivory rounded"
                aria-label="Close queue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prominent Decoupled Telephony Notice */}
            <div className="p-4 bg-charcoal-300/70 border-b border-charcoal-border text-xs space-y-1.5">
              <div className="flex items-center space-x-1.5 text-champagne font-mono uppercase text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Preparation Queue Only — No Live Calling</span>
              </div>
              <p className="text-ivory-muted leading-relaxed text-[11px]">
                This queue validates contact numbers and consent status prior to future telephony integration. Voxora is not connected to a phone provider (Twilio/SIP) in Phase 6. No actual calls will be placed.
              </p>
            </div>

            {/* Queue Items List */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {queue.length > 0 ? (
                queue.map((item) => (
                  <div
                    key={item.contactId}
                    className="p-3 rounded-lg bg-charcoal-300/40 border border-charcoal-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-ivory">{item.name}</div>
                      <button
                        onClick={() => removeFromQueue(item.contactId)}
                        className="text-ivory-muted hover:text-rose-400 p-1 rounded"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-champagne">{item.phone}</span>
                      {renderConsentBadge(item.consentStatus)}
                    </div>

                    {/* Pre-call validation check */}
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        {item.isValid ? (
                          <span className="text-sage flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Valid Number Format</span>
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{item.validationError}</span>
                          </span>
                        )}
                      </div>

                      {item.consentStatus !== "CONSENT_CONFIRMED" && (
                        <span className="text-champagne text-[10px] font-mono uppercase">
                          Consent Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-ivory-muted text-xs space-y-2">
                  <PhoneCall className="w-8 h-8 mx-auto text-ivory-muted/40" />
                  <p>Queue is empty. Select contacts from the table to prepare calling batches.</p>
                </div>
              )}
            </div>

            {/* Queue Footer */}
            {queue.length > 0 && (
              <div className="p-4 border-t border-charcoal-border flex items-center justify-between bg-charcoal-300/30">
                <button
                  onClick={clearQueue}
                  className="px-3 py-1.5 rounded text-xs text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
                >
                  Clear Queue
                </button>

                <button
                  onClick={() => {
                    showNotification(
                      "info",
                      `Validated ${queue.length} queue items. Real outbound calling will be integrated in Phase 7.`
                    );
                    setIsQueueOpen(false);
                  }}
                  className="px-4 py-1.5 rounded text-xs font-mono uppercase font-semibold bg-champagne text-charcoal hover:bg-champagne-light transition-colors"
                >
                  Verify Batch ({queue.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
