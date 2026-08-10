import { apiFetch } from './useAdminAuth.js'
import { clearSiteSettings } from '../settings/useSiteSettings.js'

/** The admin read returns the audit columns the public one deliberately omits. */
export const getSettings = () => apiFetch('/settings/admin')

export async function updateSettings(payload) {
  const saved = await apiFetch('/settings', { method: 'PATCH', body: JSON.stringify(payload) })
  // Drop the public cache so returning to the site shows the new number without
  // a reload - same invalidation contract as clearProductCatalogue() after a save.
  clearSiteSettings()
  return saved
}
