import { Box } from "@mantine/core";
import Header from "./components/Header";
import StatusBar from "./components/main/StatusBar";
import Library from "./components/main/Library";

export default function Homepage() {
    return (
        <Box
            mih="100vh"
            bg="#f0f6f4"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box component="main" pt="16px" pb="16px">
                <StatusBar />
                <Library />
            </Box>
        </Box>
    );
}
