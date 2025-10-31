import { getCurrentAdmin } from "@/server/auth";
import { buildVisibilityFieldDictionary } from "@/server/visibilityFields";

import type { AdminConfigEditorProps } from "./configEditorRegistry";
import { VisibilityConfigEditorClient } from "./VisibilityConfigEditorClient";

export async function VisibilityConfigEditor({ configKey, initialConfig }: AdminConfigEditorProps) {
  const session = await getCurrentAdmin();
  const isSuperAdmin = session?.role === "superadmin";

  const fieldsByPage = await buildVisibilityFieldDictionary();

  return (
    <VisibilityConfigEditorClient
      configKey={configKey}
      initialConfig={initialConfig}
      isSuperAdmin={isSuperAdmin}
      fieldsByPage={fieldsByPage}
    />
  );
}

export default VisibilityConfigEditor;
