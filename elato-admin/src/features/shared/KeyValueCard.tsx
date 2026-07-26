import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Input, Switch } from "../../components/ui";
import { humanizeKey } from "../../lib/utils";

type JsonPrimitive = string | number | boolean | null;
type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/**
 * Editor for one `site_content` / `settings` key. The backend stores a
 * freeform jsonb `value`, so structure is inferred rather than guaranteed:
 * if the value is a flat object of primitives we render real fields
 * (text/number/boolean inputs, plus add/remove field for keys we didn't
 * anticipate); nested object/array field values fall back to a small JSON
 * textarea scoped to just that field.
 */
export function KeyValueCard({
  keyName,
  label,
  description,
  value,
  defaultValue,
  onSave,
  isSaving,
}: {
  keyName: string;
  label: string;
  description?: string;
  value: unknown | undefined;
  defaultValue: JsonObject;
  onSave: (key: string, value: unknown) => void;
  isSaving?: boolean;
}) {
  const exists = value !== undefined;
  const [draft, setDraft] = useState<JsonObject>(exists && isPlainObject(value) ? value : defaultValue);
  const [initialized, setInitialized] = useState(exists);

  useEffect(() => {
    if (exists) {
      setInitialized(true);
      if (isPlainObject(value)) {
        setDraft(value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleFieldChange(field: string, fieldValue: JsonPrimitive) {
    setDraft((prev) => ({ ...prev, [field]: fieldValue }));
  }

  function handleAddField() {
    const name = window.prompt("New field name (e.g. cta_label)");
    if (!name) return;
    setDraft((prev) => ({ ...prev, [name]: "" }));
  }

  function handleRemoveField(field: string) {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSave() {
    onSave(keyName, draft);
  }

  if (!initialized) {
    return (
      <Card>
        <CardHeader title={label} description={description} />
        <CardBody className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">Not configured yet.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(defaultValue);
              setInitialized(true);
            }}
          >
            Set up
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={label} description={description} />
      <CardBody>
        <div className="flex flex-col gap-3">
          {Object.entries(draft).map(([field, fieldValue]) => (
            <div key={field} className="flex items-end gap-2">
              {typeof fieldValue === "boolean" ? (
                <div className="flex-1">
                  <Switch checked={fieldValue} onChange={(v) => handleFieldChange(field, v)} label={humanizeKey(field)} />
                </div>
              ) : isPrimitive(fieldValue) ? (
                <Input
                  label={humanizeKey(field)}
                  className="flex-1"
                  value={fieldValue === null ? "" : String(fieldValue)}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                />
              ) : (
                <div className="flex-1">
                  <p className="mb-1 text-xs font-medium text-neutral-700">{humanizeKey(field)}</p>
                  <textarea
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs"
                    rows={3}
                    value={JSON.stringify(fieldValue, null, 2)}
                    onChange={(e) => {
                      try {
                        handleFieldChange(field, JSON.parse(e.target.value));
                      } catch {
                        // ignore until valid JSON is typed
                      }
                    }}
                  />
                </div>
              )}
              <Button variant="ghost" size="icon" aria-label={`Remove ${field}`} onClick={() => handleRemoveField(field)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={handleAddField}>
            <Plus className="h-3.5 w-3.5" /> Add field
          </Button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={handleSave} isLoading={isSaving}>
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
