import { useEffect, useId, useState } from "react";
import { fleetCategoryLabel, isFleetMember, type FleetCategory } from "@shared/fleet-category";

type FleetCategoryFieldProps = {
  language: string;
  value: FleetCategory;
  onChange: (value: FleetCategory) => void;
};

const validationCopy: Record<string, string> = {
  fa: "حداقل یک عضویت ناوگان را انتخاب کنید.",
  ar: "يرجى اختيار عضوية واحدة على الأقل في الأسطول.",
  tr: "Lütfen en az bir filo üyeliği seçin.",
  en: "Choose at least one fleet membership.",
};

export default function FleetCategoryField({ language, value, onChange }: FleetCategoryFieldProps) {
  const fieldId = useId();
  const [generalSelected, setGeneralSelected] = useState(() => isFleetMember(value, "standard"));
  const [contractSelected, setContractSelected] = useState(() => isFleetMember(value, "contract"));
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    setGeneralSelected(isFleetMember(value, "standard"));
    setContractSelected(isFleetMember(value, "contract"));
  }, [value]);

  const serializedValue = generalSelected && contractSelected
    ? "both"
    : generalSelected
      ? "standard"
      : contractSelected
        ? "contract"
        : "";

  const handleMembershipChange = (group: "standard" | "contract", checked: boolean) => {
    const nextGeneral = group === "standard" ? checked : generalSelected;
    const nextContract = group === "contract" ? checked : contractSelected;

    setGeneralSelected(nextGeneral);
    setContractSelected(nextContract);
    setShowValidation(!nextGeneral && !nextContract);

    if (nextGeneral || nextContract) {
      onChange(nextGeneral && nextContract ? "both" : nextGeneral ? "standard" : "contract");
    }
  };

  const errorId = `${fieldId}-validation`;

  return (
    <fieldset className="col-span-2 min-w-0 space-y-2">
      <legend className="text-sm font-medium">
        {language === "fa" ? "گروه ناوگان" : language === "ar" ? "مجموعة الأسطول" : language === "tr" ? "Filo grubu" : "Fleet group"}
      </legend>

      <input type="hidden" name="fleetCategory" value={serializedValue} />

      <div className="grid grid-cols-1 gap-2 rounded-md border border-input bg-background p-3 sm:grid-cols-2">
        {(["standard", "contract"] as const).map((group) => {
          const id = `${fieldId}-${group}`;
          const checked = group === "standard" ? generalSelected : contractSelected;
          return (
            <label
              key={group}
              htmlFor={id}
              className="flex min-h-10 cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-muted/60"
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                aria-invalid={showValidation}
                aria-describedby={showValidation ? errorId : undefined}
                onChange={(event) => handleMembershipChange(group, event.target.checked)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span>{fleetCategoryLabel(group, language)}</span>
            </label>
          );
        })}
      </div>
      {showValidation && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {validationCopy[language] || validationCopy.en}
        </p>
      )}
    </fieldset>
  );
}
