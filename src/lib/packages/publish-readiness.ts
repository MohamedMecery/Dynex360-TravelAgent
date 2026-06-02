import { supabaseClient } from "@/lib/supabase/client";

export interface PackagePublishReadiness {
  canPublish: boolean;
  hasItinerary: boolean;
  hasPricing: boolean;
  itineraryCount: number;
  pricingCount: number;
}

export async function getPackagePublishReadiness(packageId: string): Promise<PackagePublishReadiness> {
  const [daysResult, pricingResult] = await Promise.all([
    supabaseClient
      .from("package_days")
      .select("id", { count: "exact", head: true })
      .eq("package_id", packageId),
    supabaseClient
      .from("package_pricing")
      .select("id", { count: "exact", head: true })
      .eq("package_id", packageId),
  ]);

  const itineraryCount = daysResult.count ?? 0;
  const pricingCount = pricingResult.count ?? 0;

  return {
    itineraryCount,
    pricingCount,
    hasItinerary: itineraryCount > 0,
    hasPricing: pricingCount > 0,
    canPublish: itineraryCount > 0 && pricingCount > 0,
  };
}
