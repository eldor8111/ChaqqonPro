import { create } from 'zustand';

export interface PotentialClient {
    id: string;
    agentCode: string;
    businessName: string;
    ownerName: string;
    phone: string;
    address: string | null;
    status: string; // new, contacted, interested, converted, rejected
    nextContactDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AgentTenant {
    id: string;
    shopCode: string;
    shopName: string;
    ownerName: string;
    phone: string;
    plan: string;
    status: string;
    createdAt: string;
}

interface AgentStore {
    leads: PotentialClient[];
    tenants: AgentTenant[];
    isLoading: boolean;
    error: string | null;
    fetchLeads: (agentCode: string) => Promise<void>;
    fetchTenants: (agentCode: string) => Promise<void>;
    addLead: (lead: Omit<PotentialClient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateLeadStatus: (id: string, status: string, notes?: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set) => ({
    leads: [],
    tenants: [],
    isLoading: false,
    error: null,

    fetchLeads: async (agentCode) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/agent/leads?agentCode=${agentCode}`);
            if (!res.ok) throw new Error("Leads yuklashda xatolik");
            const data = await res.json();
            set({ leads: data });
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchTenants: async (agentCode) => {
        set({ isLoading: true, error: null });
        try {
            // Note: Tenants api requires implementation
            const res = await fetch(`/api/agent/tenants?agentCode=${agentCode}`);
            if (!res.ok) throw new Error("Do'konlarni yuklashda xatolik");
            const data = await res.json();
            set({ tenants: data });
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    addLead: async (leadData) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/agent/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            });
            if (!res.ok) throw new Error("Lead qo'shishda xatolik");
            const newLead = await res.json();
            set((state) => ({ leads: [newLead, ...state.leads] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    updateLeadStatus: async (id, status, notes) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/agent/leads/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes })
            });
            if (!res.ok) throw new Error("Holatni o'zgartirishda xatolik");
            const updatedLead = await res.json();
            set((state) => ({
                leads: state.leads.map(lead => lead.id === id ? updatedLead : lead)
            }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    }
}));
