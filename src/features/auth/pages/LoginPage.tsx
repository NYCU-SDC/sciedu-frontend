import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button, Flex, Heading } from "@radix-ui/themes";

import { useAuth } from "../../../shared/auth";
import { useDocumentTitle } from "../../../shared/hooks";

export default function LoginPage() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useDocumentTitle("登入");

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return (
        <Flex
            align="center"
            justify="center"
            direction="column"
            gap="4"
            style={{ height: "100vh" }}
        >
            <Heading size="6">SciEdu</Heading>
            <Button size="3" onClick={() => login("google")}>
                Login with Google
            </Button>
        </Flex>
    );
}
