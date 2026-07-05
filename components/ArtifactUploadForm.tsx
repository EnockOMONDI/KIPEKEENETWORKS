"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/Interactive";
import {
  storageUpgradePriceKes,
  standardUploadLimitLabel,
  uploadAccept,
  uploadPolicyMessage,
  validateArtifactUpload
} from "@/lib/upload-policy";

type EmployeeOption = {
  id: string;
  displayName: string;
};

export function ArtifactUploadForm({
  action,
  employees,
  kind = "artifact",
  returnTo
}: {
  action: (formData: FormData) => void | Promise<void>;
  employees: EmployeeOption[];
  kind?: "artifact" | "document";
  returnTo: "/artifacts" | "/documents";
}) {
  const [message, setMessage] = useState<ReturnType<typeof uploadPolicyMessage>>(null);

  function validateFile(file?: File | null) {
    if (!file) {
      setMessage(uploadPolicyMessage("file"));
      return false;
    }

    const result = validateArtifactUpload({
      fileName: file.name,
      size: file.size,
      type: file.type
    });

    if (result !== "ok") {
      setMessage(uploadPolicyMessage(result));
      return false;
    }

    setMessage(null);
    return true;
  }

  return (
    <form
      action={action}
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        const file = new FormData(event.currentTarget).get("file");
        if (!(file instanceof File) || !validateFile(file)) {
          event.preventDefault();
        }
      }}
    >
      <input name="returnTo" type="hidden" value={returnTo} />
      <input
        accept={uploadAccept}
        className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2 text-sm"
        name="file"
        onChange={(event) => validateFile(event.currentTarget.files?.[0])}
        required
        type="file"
      />
      <p className="text-xs leading-5 text-graphite">
        Standard {kind}s support PDFs and business documents up to {standardUploadLimitLabel}. Media and larger files can use the KES {storageUpgradePriceKes} storage boost.
      </p>
      {message ? (
        <div className="rounded-2xl border border-copper/20 bg-[#fff7ed] px-3 py-3 text-sm leading-6 text-ink">
          <p className="font-semibold text-copper">{message.title}</p>
          <p className="mt-1 text-graphite">{message.description}</p>
        </div>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 rounded-2xl bg-paper px-3 text-sm font-medium">
        <input name="addToMemory" type="checkbox" />
        Add this {kind} to memory
      </label>
      <div>
        <p className="mb-2 text-sm font-semibold">Which AI employees can access it?</p>
        <div className="max-h-72 space-y-2 overflow-auto rounded-2xl border border-violetline bg-paper p-3">
          {employees.map((employee) => (
            <label className="flex min-h-10 items-center gap-2 text-sm" key={employee.id}>
              <input name="employeeIds" type="checkbox" value={employee.id} />
              {employee.displayName}
            </label>
          ))}
        </div>
      </div>
      <SubmitButton className="w-full" pendingText="Uploading and preparing memory">
        Upload {kind}
      </SubmitButton>
    </form>
  );
}
