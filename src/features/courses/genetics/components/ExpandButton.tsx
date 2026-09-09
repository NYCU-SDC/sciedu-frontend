import { Maximize2 } from "lucide-react";

import styles from "./ExpandButton.module.css";

type Props = {
    label: string;
    onClick: () => void;
};

export default function ExpandButton({ label, onClick }: Props) {
    return (
        <button
            type="button"
            className={styles.button}
            aria-label={label}
            title={label}
            onClick={onClick}
        >
            <Maximize2 aria-hidden="true" />
        </button>
    );
}
