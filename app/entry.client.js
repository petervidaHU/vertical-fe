import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
hydrateRoot(document, _jsx(StrictMode, { children: _jsx(HydratedRouter, {}) }));
