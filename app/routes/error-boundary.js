import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Stack, Text, Title } from "@mantine/core";
import { isRouteErrorResponse, useRouteError } from "react-router";
const RouteErrorBoundary = () => {
    const error = useRouteError();
    if (isRouteErrorResponse(error)) {
        return (_jsxs(Stack, { children: [_jsx(Title, { order: 2, children: "Route Error" }), _jsx(Alert, { color: "red", title: `${error.status} ${error.statusText}`, children: typeof error.data === "string" ? error.data : "Request failed." })] }));
    }
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return (_jsxs(Stack, { children: [_jsx(Title, { order: 2, children: "Unexpected Error" }), _jsx(Alert, { color: "red", title: "Something went wrong", children: _jsx(Text, { children: message }) })] }));
};
export default RouteErrorBoundary;
