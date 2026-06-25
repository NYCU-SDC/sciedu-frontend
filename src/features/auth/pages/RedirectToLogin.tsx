import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function RedirectToLogin() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/login");
    }, [navigate]);

    return null;
}
