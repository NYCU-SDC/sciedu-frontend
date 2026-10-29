import { Button } from "@mantine/core";
import { useAuth } from "../../../../shared/auth";
import CourseHeader from "../../components/CourseHeader";

export default function Header() {
    const { logout } = useAuth();
    return (
        <CourseHeader
            title="學習成果"
            subtitle="教材完成情況"
            returnTo="/courses"
            actions={
                <Button
                    variant="subtle"
                    color="brandTeal"
                    onClick={() => void logout()}
                >
                    登出
                </Button>
            }
        />
    );
}
