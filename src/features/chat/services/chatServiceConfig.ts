export const USE_CHAT_MOCK =
    import.meta.env.VITE_USE_CHAT_MOCK === "true" ||
    !import.meta.env.VITE_BACKEND_BASE_URL;
