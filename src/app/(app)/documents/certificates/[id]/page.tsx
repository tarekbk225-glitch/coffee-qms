import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { CertificateDetail } from "./certificate-detail";

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: certificate } = await supabase
    .from("certificates")
    .select(
      "*, site:sites(id, name, name_ar), responsible:profiles!certificates_responsible_user_id_fkey(id, full_name, full_name_ar)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!certificate) notFound();

  return (
    <CertificateDetail
      certificate={certificate as unknown as ComponentProps<typeof CertificateDetail>["certificate"]}
      canManage={can(session!.permissions, PERMISSIONS.DOCUMENT_MANAGE)}
    />
  );
}
