import type { Litige } from '~/types';

export function useLitigeService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function openDispute(
    token: string | null,
    commandeId: string,
    motif: string,
    description: string,
    photos?: string[]
  ): Promise<Litige> {
    return $fetch(`${apiBase}/litiges/commande/${commandeId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { motif, description, photos },
    });
  }

  async function respondToDispute(
    token: string | null,
    id: string,
    reponse: string
  ): Promise<Litige> {
    return $fetch(`${apiBase}/litiges/${id}/response`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { reponse },
    });
  }

  async function findById(token: string | null, id: string): Promise<Litige> {
    return $fetch(`${apiBase}/litiges/${id}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getMy(token: string | null): Promise<Litige[]> {
    return $fetch(`${apiBase}/litiges/my`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function arbitrate(
    token: string | null,
    id: string,
    decision: 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE',
    montantRembourse?: number,
    noteAdmin?: string
  ): Promise<Litige> {
    return $fetch(`${apiBase}/litiges/${id}/arbitrer`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { decision, montantRembourse, noteAdmin },
    });
  }

  return {
    openDispute,
    respondToDispute,
    findById,
    getMy,
    arbitrate,
  };
}

export function useAdminService() {
  async function getDashboard(token: string | null): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/dashboard`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function listUsers(
    token: string | null,
    params: { statut?: string; role?: string; limit?: number; offset?: number }
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/auth/admin/users?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function suspendUser(
    token: string | null,
    userId: string,
    motif?: string
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/users/${userId}/suspend`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { motif },
    });
  }

  async function unsuspendUser(token: string | null, userId: string): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function listOrders(
    token: string | null,
    params: { statut?: string; userId?: string; limit?: number; offset?: number }
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/auth/admin/orders?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function updateOrderStatus(
    token: string | null,
    orderId: string,
    statut: string,
    noteAdmin?: string
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/orders/${orderId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { statut, noteAdmin },
    });
  }

  async function listDisputes(
    token: string | null,
    params: { statut?: string; limit?: number; offset?: number }
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/auth/admin/litiges?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function listReports(
    token: string | null,
    params: { statut?: string; cibleType?: string; limit?: number; offset?: number }
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/auth/admin/signalements?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function actionReport(
    token: string | null,
    reportId: string,
    statut: string,
    decision: string,
    noteAdmin: string,
    adminId: string
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/signalements/${reportId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { statut, decision, noteAdmin, adminId },
    });
  }

  async function suspendListing(
    token: string | null,
    id: string,
    type: 'vente' | 'demande'
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/listings/${id}/suspend?type=${type}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function unsuspendListing(
    token: string | null,
    id: string,
    type: 'vente' | 'demande'
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/listings/${id}/unsuspend?type=${type}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function listImprimeurs(
    token: string | null,
    params: { actif?: boolean; disponible?: boolean; limit?: number; offset?: number }
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/auth/admin/imprimeurs?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function toggleImprimeur(
    token: string | null,
    userId: string,
    disponible: boolean
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/imprimeurs/${userId}/toggle-disponible`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { disponible },
    });
  }

  async function listQuotes(
    token: string | null,
    params: { statut?: string; limit?: number; offset?: number }
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/auth/admin/devis?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getDisputeDetail(
    token: string | null,
    disputeId: string
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/litiges/${disputeId}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function arbitrateDispute(
    token: string | null,
    disputeId: string,
    decision: 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE',
    montantRembourse: number,
    noteAdmin: string,
    adminId: string
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/litiges/${disputeId}/arbitrer`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { decision, montantRembourse, noteAdmin, adminId },
    });
  }

  async function getReportDetail(
    token: string | null,
    reportId: string
  ): Promise<unknown> {
    return $fetch(`${apiBase}/auth/admin/signalements/${reportId}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    getDashboard,
    listUsers,
    suspendUser,
    unsuspendUser,
    listOrders,
    updateOrderStatus,
    listDisputes,
    listReports,
    actionReport,
    suspendListing,
    unsuspendListing,
    listImprimeurs,
    toggleImprimeur,
    listQuotes,
    getDisputeDetail,
    arbitrateDispute,
    getReportDetail,
  };
}
