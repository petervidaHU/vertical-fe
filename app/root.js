import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "@mantine/core/styles.css";
import { AppShell, Container, Group, MantineProvider, Text, Title, createTheme } from "@mantine/core";
import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, } from "react-router";
const theme = createTheme({
    primaryColor: "teal",
    defaultRadius: "md",
});
export function Layout({ children }) {
    return (_jsxs("html", { lang: "en", children: [_jsxs("head", { children: [_jsx("meta", { charSet: "utf-8" }), _jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }), _jsx(Meta, {}), _jsx(Links, {})] }), _jsxs("body", { children: [children, _jsx(ScrollRestoration, {}), _jsx(Scripts, {})] })] }));
}
export default function Root() {
    return (_jsx(MantineProvider, { theme: theme, children: _jsxs(AppShell, { padding: "md", children: [_jsx(AppShell.Header, { children: _jsxs(Group, { justify: "space-between", h: "100%", px: "md", children: [_jsx(Title, { order: 4, children: "Vertical FE Rewrite" }), _jsxs(Group, { children: [_jsx(Link, { to: "/", children: "Timeline" }), _jsx(Link, { to: "/admin", children: "Admin" })] })] }) }), _jsx(AppShell.Main, { children: _jsxs(Container, { size: "lg", py: "lg", children: [_jsx(Text, { c: "dimmed", mb: "md", children: "React Router framework mode enabled (SSR-ready)." }), _jsx(Outlet, {})] }) })] }) }));
}
export function ErrorBoundary({ error }) {
    if (isRouteErrorResponse(error)) {
        return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("h1", { children: [error.status, " ", error.statusText] }), _jsx("p", { children: typeof error.data === "string" ? error.data : "Route request failed." })] }));
    }
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h1", { children: "Unexpected Error" }), _jsx("p", { children: message })] }));
}
