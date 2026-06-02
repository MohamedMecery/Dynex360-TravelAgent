import { dataProvider } from "@refinedev/supabase";
import { supabaseClient } from "@/lib/supabase/client";

export const refineDataProvider = dataProvider(supabaseClient);
