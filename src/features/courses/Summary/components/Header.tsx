import { Divider, Text, Title } from "@mantine/core";

export default function Header() {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "nowrap",
                gap: "24px",
                padding: "16px 26px",
                backgroundColor: "var(--mantine-color-brandTeal-5)",
                borderRadius: "1rem",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "24px",
                    flexWrap: "nowrap",
                    minWidth: 0,
                }}
            >
                <Text
                    fw={700}
                    fz="2rem"
                    lh="43px"
                    c="var(--color-brand-teal-dark)"
                    style={{ whiteSpace: "nowrap" }}
                >
                    SciEdu
                </Text>
                <Divider
                    orientation="vertical"
                    size={1}
                    color="rgba(255, 255, 255, 0.6)"
                    style={{
                        height: "32px",
                    }}
                />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.125rem",
                        minWidth: 0,
                    }}
                >
                    <Title
                        order={1}
                        fz="24px"
                        fw={700}
                        lh="32px"
                        c="var(--color-brand-teal-dark)"
                    >
                        學習成果
                    </Title>
                    <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                        教材完成情況
                    </Text>
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "51px",
                    padding: "12px",
                    borderRadius: "26px",
                    border: "1px solid #ffffff",
                    backgroundColor: "var(--color-brand-teal-light)",
                    color: "var(--color-brand-teal-dark)",
                    fontWeight: 600,
                    fontSize: "20px",
                    fontFamily: "Inter, sans-serif",
                    lineHeight: "24px",
                    letterSpacing: "2px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                }}
            >
                學生模式
            </div>
        </div>
    );
}
