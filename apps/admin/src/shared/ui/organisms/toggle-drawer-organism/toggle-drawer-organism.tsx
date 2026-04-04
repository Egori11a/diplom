import { ButtonAtom, CheckboxAtom, DrawerAtom, InputAtom, TextareaAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import { adminUiText } from "../../../config";
import type { ToggleFormVariant } from "../../../../pages/admin-page/types";
import type { ToggleDrawerOrganismProps } from "./types";
import "./toggle-drawer-organism.css";

const normalizeNumberInput = (value: string): number => {
  if (!value.trim()) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ToggleDrawerOrganism = ({
  groups,
  form,
  saveError,
  onClose,
  onFormChange,
  onToggleGroup,
  onSave
}: ToggleDrawerOrganismProps) => {
  const updateVariant = (
    index: number,
    patch: Partial<ToggleFormVariant>
  ): void => {
    const nextVariants = form.variants.map((variant, variantIndex) =>
      variantIndex === index ? { ...variant, ...patch } : variant
    );
    onFormChange({ variants: nextVariants });
  };

  const removeVariant = (index: number): void => {
    if (!form.variants.length) {
      return;
    }
    onFormChange({
      variants: form.variants.filter((_, variantIndex) => variantIndex !== index)
    });
  };

  const addVariant = (): void => {
    const nextIndex = form.variants.length + 1;
    const defaultWeight = form.variants.length === 0 ? 100 : 0;
    onFormChange({
      variants: [
        ...form.variants,
        {
          key: `V${nextIndex}`,
          weightPercent: defaultWeight
        }
      ]
    });
  };

  const clearVariants = (): void => {
    onFormChange({ variants: [] });
  };

  return (
    <DrawerAtom>
      <div className="toggle-drawer-organism__header">
        <h2>{form.id ? adminUiText.toggleDrawer.editHeading : adminUiText.toggleDrawer.createHeading}</h2>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          {adminUiText.toggleDrawer.closeButton}
        </ButtonAtom>
      </div>

      <div className="toggle-drawer-organism__grid">
        <FieldMolecule label="App ID">
          <InputAtom
            value={form.appId}
            onChange={(event) => onFormChange({ appId: event.target.value })}
          />
        </FieldMolecule>
        <FieldMolecule label="Feature key">
          <InputAtom
            value={form.featureKey}
            onChange={(event) => onFormChange({ featureKey: event.target.value })}
          />
        </FieldMolecule>
      </div>

      <div className="toggle-drawer-organism__grid">
        <FieldMolecule label="Experiment key">
          <InputAtom
            value={form.key}
            onChange={(event) => onFormChange({ key: event.target.value })}
          />
        </FieldMolecule>
        <FieldMolecule label="Name">
          <InputAtom
            value={form.name}
            onChange={(event) => onFormChange({ name: event.target.value })}
          />
        </FieldMolecule>
      </div>

      <FieldMolecule label="Segment groups (multi-select)">
        <div className="toggle-drawer-organism__groups">
          {groups.map((group) => {
            const checked = form.groupNames.includes(group.name);
            return (
              <label className="toggle-drawer-organism__checkbox" key={group.id}>
                <CheckboxAtom
                  checked={checked}
                  onChange={(event) =>
                    onToggleGroup(group.name, event.target.checked)
                  }
                />
                {group.name}
              </label>
            );
          })}
        </div>
      </FieldMolecule>

      <div className="toggle-drawer-organism__grid toggle-drawer-organism__grid--triple">
        <FieldMolecule label="Rollout %">
          <InputAtom
            type="number"
            min={0}
            max={100}
            value={form.rolloutPercent}
            onChange={(event) =>
              onFormChange({
                rolloutPercent: normalizeNumberInput(event.target.value)
              })
            }
          />
        </FieldMolecule>
        <FieldMolecule label="Traffic %">
          <InputAtom
            type="number"
            min={0}
            max={100}
            value={form.trafficPercent}
            onChange={(event) =>
              onFormChange({
                trafficPercent: normalizeNumberInput(event.target.value)
              })
            }
          />
        </FieldMolecule>
        <label className="toggle-drawer-organism__checkbox toggle-drawer-organism__feature-switch">
          <CheckboxAtom
            checked={form.featureEnabled}
            onChange={(event) =>
              onFormChange({ featureEnabled: event.target.checked })
            }
          />
          Feature enabled
        </label>
      </div>

      <FieldMolecule label="Additional subject keys (comma-separated)">
        <TextareaAtom
          value={form.includeIdsRaw}
          onChange={(event) => onFormChange({ includeIdsRaw: event.target.value })}
          placeholder="user:egor,user:maria,device:ios"
        />
      </FieldMolecule>

      <FieldMolecule label="Variants (optional, flexible weights)">
        <div className="toggle-drawer-organism__variants">
          {form.variants.length > 0 ? (
            <ButtonAtom variant="secondary" type="button" onClick={clearVariants}>
              Remove all variants
            </ButtonAtom>
          ) : null}
          {form.variants.map((variant, index) => (
            <div className="toggle-drawer-organism__variant-row" key={`${variant.key}-${index}`}>
              <InputAtom
                value={variant.key}
                onChange={(event) =>
                  updateVariant(index, { key: event.target.value })
                }
                placeholder="Variant key"
              />
              <InputAtom
                type="number"
                min={0}
                max={100}
                value={variant.weightPercent}
                onChange={(event) =>
                  updateVariant(index, {
                    weightPercent: normalizeNumberInput(event.target.value)
                  })
                }
                placeholder="Weight %"
              />
              <ButtonAtom
                variant="secondary"
                type="button"
                onClick={() => removeVariant(index)}
              >
                Remove
              </ButtonAtom>
            </div>
          ))}
          <ButtonAtom variant="secondary" type="button" onClick={addVariant}>
            Add variant
          </ButtonAtom>
        </div>
      </FieldMolecule>

      <div className="toggle-drawer-organism__actions">
        <ButtonAtom type="button" onClick={onSave}>
          {form.id ? "Save" : "Create"}
        </ButtonAtom>
      </div>

      {saveError && <p className="toggle-drawer-organism__error">{saveError}</p>}
    </DrawerAtom>
  );
};

