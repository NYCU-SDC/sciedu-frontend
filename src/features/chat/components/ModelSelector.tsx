import { Select } from "@radix-ui/themes";
import { useModelSelection } from "../services/ModelSelectionContext";

/**
 * Model picker rendered in the composer bar. Self-hides unless the
 * `force-model-selection` flag opens up switching (`"none"` mode), so both
 * composer call sites can render it unconditionally.
 */
export default function ModelSelector() {
    const { showSelector, models, selectedModelId, setSelectedModelId } =
        useModelSelection();

    if (!showSelector) return null;

    return (
        <Select.Root
            size="1"
            value={selectedModelId}
            onValueChange={setSelectedModelId}
        >
            <Select.Trigger variant="ghost" aria-label="選擇模型" />
            <Select.Content position="popper">
                {models.map((model) => (
                    <Select.Item key={model.id} value={model.id}>
                        {model.label}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select.Root>
    );
}
