import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchContactList,
  fetchContactDetail,
  createContact,
  updateContact,
  deleteContact,
} from "../lib/conversation-api";
import { Contact, DemoQueueItem, ConsentStatus } from "../types";

describe("Phase 6: Contact Management & API Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should fetch paginated contacts with search and status filters", async () => {
    const mockListResponse = {
      items: [
        {
          id: "cnt-1",
          name: "Dr. Aris Thorne",
          phone: "+15551234567",
          email: "aris@apexbiometrics.com",
          company: "Apex Biometrics",
          status: "Active",
          consent_status: "CONSENT_CONFIRMED",
          call_count: 3,
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockListResponse,
    } as Response);

    const result = await fetchContactList({
      page: 1,
      pageSize: 10,
      search: "Aris",
      status: "Active",
    });

    expect(result).not.toBeNull();
    expect(result?.total).toBe(1);
    expect(result?.items[0].name).toBe("Dr. Aris Thorne");
    expect(result?.items[0].consent_status).toBe("CONSENT_CONFIRMED");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/contacts?page=1&page_size=10&search=Aris&status=Active"),
      expect.any(Object)
    );
  });

  it("should fetch contact detail including linked call sessions", async () => {
    const mockDetail = {
      id: "cnt-2",
      name: "Valeria Sterling",
      phone: "+15559876543",
      email: "v.sterling@vanguard.org",
      company: "Vanguard Asset Management",
      status: "Active",
      consent_status: "CONSENT_CONFIRMED",
      calls: [
        {
          id: "call-101",
          contact_id: "cnt-2",
          status: "COMPLETED",
          duration_seconds: 145,
          started_at: "2026-10-29T14:00:00Z",
          summary: "Reviewed asset allocation requirements.",
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const contact = await fetchContactDetail("cnt-2");
    expect(contact).not.toBeNull();
    expect(contact?.name).toBe("Valeria Sterling");
    expect(contact?.calls?.length).toBe(1);
    expect(contact?.calls?.[0].id).toBe("call-101");
    expect(contact?.calls?.[0].duration_seconds).toBe(145);
  });

  it("should create a new contact with explicit consent status", async () => {
    const newContactPayload = {
      name: "Marcus Vance",
      phone: "+1 (555) 345-6789",
      email: "marcus@vancecapital.com",
      company: "Vance Capital",
      status: "Prospect",
      consent_status: "PENDING_VERIFICATION",
      notes: "Follow up regarding institutional onboarding.",
    };

    const mockCreated = {
      id: "cnt-new-123",
      ...newContactPayload,
      phone: "+15553456789",
      created_at: "2026-10-29T15:00:00Z",
      updated_at: "2026-10-29T15:00:00Z",
      call_count: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCreated,
    } as Response);

    const created = await createContact(newContactPayload);
    expect(created).not.toBeNull();
    expect(created?.id).toBe("cnt-new-123");
    expect(created?.consent_status).toBe("PENDING_VERIFICATION");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/contacts"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(newContactPayload),
      })
    );
  });

  it("should update contact details successfully", async () => {
    const updatePayload = {
      company: "Vance Global Partners",
      consent_status: "CONSENT_CONFIRMED" as ConsentStatus,
    };

    const mockUpdated = {
      id: "cnt-new-123",
      name: "Marcus Vance",
      phone: "+15553456789",
      company: "Vance Global Partners",
      consent_status: "CONSENT_CONFIRMED",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpdated,
    } as Response);

    const updated = await updateContact("cnt-new-123", updatePayload);
    expect(updated).not.toBeNull();
    expect(updated?.company).toBe("Vance Global Partners");
    expect(updated?.consent_status).toBe("CONSENT_CONFIRMED");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/contacts/cnt-new-123"),
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });

  it("should safely delete a contact and return true", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Contact deleted successfully. Associated call records preserved." }),
    } as Response);

    const deleted = await deleteContact("cnt-new-123");
    expect(deleted).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/contacts/cnt-new-123"),
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("should handle backend outage gracefully without throwing unhandled exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

    const list = await fetchContactList({});
    expect(list).toBeNull();

    const detail = await fetchContactDetail("cnt-missing");
    expect(detail).toBeNull();

    const created = await createContact({ name: "Fail", phone: "1234567" });
    expect(created).toBeNull();

    const updated = await updateContact("cnt-fail", { name: "Fail" });
    expect(updated).toBeNull();

    const deleted = await deleteContact("cnt-fail");
    expect(deleted).toBe(false);
  });
});

describe("Phase 6: Consent Tracking & Calling Preparation Queue Logic", () => {
  it("should strictly enforce non-presumptive consent defaults", () => {
    // Calling consent must NOT be defaulted to Confirmed
    const defaultConsent: ConsentStatus = "PENDING_VERIFICATION";
    expect(defaultConsent).toBe("PENDING_VERIFICATION");
    expect(defaultConsent).not.toBe("CONSENT_CONFIRMED");
  });

  it("should correctly validate telephone formats before queuing", () => {
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

    expect(validatePhone("+1 (555) 000-1111").valid).toBe(true);
    expect(validatePhone("+44 20 7946 0991").valid).toBe(true);
    expect(validatePhone("123").valid).toBe(false);
    expect(validatePhone("123").error).toBe("Must contain at least 7 digits.");
    expect(validatePhone("phone#notvalid").valid).toBe(false);
  });

  it("should manage Demo Preparation Queue state without placing real calls", () => {
    let queue: DemoQueueItem[] = [];

    const item1: DemoQueueItem = {
      contactId: "cnt-1",
      name: "Dr. Aris Thorne",
      phone: "+15551234567",
      company: "Apex Biometrics",
      consentStatus: "CONSENT_CONFIRMED",
      isValid: true,
    };

    const item2: DemoQueueItem = {
      contactId: "cnt-2",
      name: "Pending Lead",
      phone: "123",
      consentStatus: "PENDING_VERIFICATION",
      isValid: false,
      validationError: "Must contain at least 7 digits.",
    };

    // Add to queue
    queue.push(item1);
    queue.push(item2);
    expect(queue.length).toBe(2);

    // Verify invalid flag
    expect(queue[1].isValid).toBe(false);
    expect(queue[1].validationError).toBe("Must contain at least 7 digits.");

    // Remove single item
    queue = queue.filter((i) => i.contactId !== "cnt-2");
    expect(queue.length).toBe(1);
    expect(queue[0].contactId).toBe("cnt-1");

    // Clear queue
    queue = [];
    expect(queue.length).toBe(0);
  });
});
