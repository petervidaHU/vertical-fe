import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Group, Stack, Title } from "@mantine/core";
import { Link, Outlet } from "react-router";
const AdminRoute = () => {
    return (_jsxs(Stack, { children: [_jsx(Title, { order: 2, children: "Admin" }), _jsxs(Group, { children: [_jsx(Link, { to: "/admin/list", children: "List" }), _jsx(Link, { to: "/admin/edit", children: "Create" })] }), _jsx(Card, { withBorder: true, children: _jsx(Outlet, {}) })] }));
};
export default AdminRoute;
